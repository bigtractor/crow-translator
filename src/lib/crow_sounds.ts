// ============================================================
// Crow sound catalogue + playback engine
// ============================================================
// Real recordings only: nothing is synthesised. /sounds/index.json is written by
// crow_dataset/scripts/build_soundboard.py and lists, per species and call type,
// the best exemplar clips plus a single-call snippet cut from each.
//
// Personal-use build: every licence is included. Each clip keeps its recordist,
// Xeno-canto id and licence in the index so a public release can filter later.

import type { NoteEvent, Scene } from "./crow_composer";

export type CallTypeId =
  | "alarm_agonistic"
  | "contact_social"
  | "attention"
  | "begging_food"
  | "juvenile_grunt"
  | "flight_call"
  | "song_subsong";

export interface CallTypeInfo {
  id: CallTypeId;
  label: string;
  hint: string;
}

/** Display order of the buttons. */
export const CALL_TYPES: CallTypeInfo[] = [
  { id: "alarm_agonistic", label: "Alarm", hint: "Danger, scolding, driving off" },
  { id: "contact_social", label: "Contact", hint: "I am here, calling a mate" },
  { id: "attention", label: "Attention", hint: "Hey, look over here" },
  { id: "begging_food", label: "Begging", hint: "Food, please" },
  { id: "juvenile_grunt", label: "Fledgling", hint: "Young bird grunts" },
  { id: "flight_call", label: "Flight", hint: "Taking off, passing over" },
  { id: "song_subsong", label: "Quiet song", hint: "Relaxed murmuring" },
];

export interface SoundClip {
  id: string;
  /** natural clip, about 3 s */
  file: string;
  dur: number;
  /** single call cut from the clip, or null */
  snip: string | null;
  snipDur: number | null;
  recordist: string;
  /** Xeno-canto recording number */
  xc: string;
  license: string;
  quality: string;
  /** the original fine-grained label */
  fine: string;
}

export interface SoundSpecies {
  id: string;
  name: string;
  classes: Partial<Record<CallTypeId, SoundClip[]>>;
}

export interface SoundIndex {
  species: SoundSpecies[];
}

let indexPromise: Promise<SoundIndex> | null = null;

export function loadSoundIndex(): Promise<SoundIndex> {
  if (!indexPromise) {
    indexPromise = fetch("/sounds/index.json").then((r) => {
      if (!r.ok) throw new Error(`sound index HTTP ${r.status}`);
      return r.json() as Promise<SoundIndex>;
    });
    indexPromise.catch(() => {
      indexPromise = null; // allow a retry
    });
  }
  return indexPromise;
}

export function xcUrl(clip: SoundClip): string {
  return `https://xeno-canto.org/${clip.xc}`;
}

// ------------------------------------------------------------
// Playback
// ------------------------------------------------------------

export interface PlayItem {
  clip: SoundClip;
  /** play the single-call snippet instead of the natural clip */
  snippet?: boolean;
  /** pause after this item, in ms */
  gapAfterMs?: number;
  /** playback-rate multiplier; 1 = unchanged */
  rate?: number;
}

export interface PlayOptions {
  /** called when each item starts, for the "now playing" line */
  onItemStart?: (item: PlayItem, position: number) => void;
}

type Listener = (endsAtMs: number) => void;

export class CrowPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wet: GainNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private sources = new Set<AudioBufferSourceNode>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private token = 0;
  private volume = 0.8;
  /** Calls are loudness-matched fairly low; the limiter downstream makes room for this. */
  private static readonly MAKEUP = 1.7;
  private busyListeners = new Set<Listener>();
  private finish: (() => void) | null = null;

  /** Subscribe to "something is playing until <epoch ms>" notices; 0 means stopped. */
  onBusy(fn: Listener): () => void {
    this.busyListeners.add(fn);
    return () => this.busyListeners.delete(fn);
  }

  private notify(endsAtMs: number) {
    for (const fn of this.busyListeners) fn(endsAtMs);
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume * CrowPlayer.MAKEUP, this.ctx.currentTime, 0.02);
  }

  private async context(): Promise<AudioContext> {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume * CrowPlayer.MAKEUP;
      // A limiter so several layered birds cannot clip.
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 12;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      this.master.connect(limiter);
      limiter.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  private buffer(ctx: AudioContext, path: string): Promise<AudioBuffer> {
    let p = this.buffers.get(path);
    if (!p) {
      p = fetch(`/sounds/${path}`)
        .then((r) => {
          if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
          return r.arrayBuffer();
        })
        .then((ab) => ctx.decodeAudioData(ab));
      p.catch(() => this.buffers.delete(path));
      this.buffers.set(path, p);
    }
    return p;
  }

  /** Stop everything that is playing. */
  stop() {
    this.token++;
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.sources.clear();
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.notify(0);
    this.finish?.();
    this.finish = null;
  }

  /**
   * Play items one after another. Resolves when the last one ends, or when
   * stop() or a newer play() cancels it.
   */
  async play(items: PlayItem[], opts: PlayOptions = {}): Promise<void> {
    this.stop();
    if (items.length === 0) return;
    const my = this.token;
    const ctx = await this.context();

    const paths = items.map((it) => (it.snippet && it.clip.snip ? it.clip.snip : it.clip.file));
    const bufs = await Promise.all(paths.map((p) => this.buffer(ctx, p)));
    if (my !== this.token) return; // cancelled while loading

    let t = ctx.currentTime + 0.06;
    const startedAt = Date.now();
    const starts: number[] = [];
    items.forEach((it, i) => {
      const rate = it.rate ?? 1;
      const src = ctx.createBufferSource();
      src.buffer = bufs[i];
      src.playbackRate.value = rate;
      src.connect(this.master!);
      src.start(t);
      this.sources.add(src);
      src.onended = () => this.sources.delete(src);
      starts.push(t);
      t += bufs[i].duration / rate + (it.gapAfterMs ?? 0) / 1000;
    });

    const totalMs = (t - ctx.currentTime) * 1000;
    this.notify(startedAt + totalMs);

    items.forEach((it, i) => {
      if (!opts.onItemStart) return;
      const delay = Math.max(0, (starts[i] - ctx.currentTime) * 1000);
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        if (my === this.token) opts.onItemStart?.(it, i);
      }, delay);
      this.timers.add(timer);
    });

    await new Promise<void>((resolve) => {
      const done = setTimeout(() => {
        this.timers.delete(done);
        if (my === this.token) this.notify(0);
        resolve();
      }, totalMs + 50);
      this.timers.add(done);
      this.finish = resolve;
    });
  }

  /** The shared room reverb, created on first use. */
  private room(ctx: AudioContext): GainNode {
    if (!this.wet) {
      const conv = makeRoom(ctx);
      this.wet = ctx.createGain();
      this.wet.connect(conv);
      conv.connect(this.master!);
    }
    return this.wet;
  }

  /**
   * Render a composed scene: every call is cut out of its sprite, glided in pitch,
   * panned, filtered for distance and sent to the room. Resolves when it ends,
   * or when stop() or a newer play cancels it.
   */
  async playScene(scene: Scene, opts: { onEventStart?: (e: NoteEvent, index: number) => void } = {}): Promise<void> {
    this.stop();
    if (scene.events.length === 0) return;
    const my = this.token;
    const ctx = await this.context();

    const sprites = [...new Set(scene.events.map((e) => e.sprite))];
    const loaded = new Map<string, AudioBuffer>();
    await Promise.all(sprites.map(async (sp) => loaded.set(sp, await this.buffer(ctx, sp))));
    if (my !== this.token) return;

    const wet = this.room(ctx);
    const t0 = ctx.currentTime + 0.12;
    const startedAt = Date.now() + 120;

    scene.events.forEach((ev, i) => {
      const when = t0 + ev.t;
      const dur = ev.unit.d / ((ev.rate0 + ev.rate1) / 2);

      const src = ctx.createBufferSource();
      src.buffer = loaded.get(ev.sprite)!;
      src.playbackRate.setValueAtTime(ev.rate0, when);
      src.playbackRate.linearRampToValueAtTime(ev.rate1, when + dur);

      // short fades so a cut never clicks
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(ev.gain, when + 0.006);
      env.gain.setValueAtTime(ev.gain, when + Math.max(0.006, dur - 0.014));
      env.gain.linearRampToValueAtTime(0, when + dur);

      const pan = ctx.createStereoPanner();
      pan.pan.value = ev.pan;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = ev.cutoff;
      const send = ctx.createGain();
      send.gain.value = ev.wet;

      src.connect(env);
      env.connect(pan);
      pan.connect(lp);
      lp.connect(this.master!);
      lp.connect(send);
      send.connect(wet);

      src.start(when, ev.unit.o, ev.unit.d);
      src.stop(when + dur * 1.15 + 0.05);
      this.sources.add(src);
      src.onended = () => {
        this.sources.delete(src);
        for (const n of [env, pan, lp, send]) n.disconnect();
      };

      if (opts.onEventStart) {
        const timer = setTimeout(() => {
          this.timers.delete(timer);
          if (my === this.token) opts.onEventStart?.(ev, i);
        }, Math.max(0, (when - ctx.currentTime) * 1000));
        this.timers.add(timer);
      }
    });

    const totalMs = (0.12 + scene.durationS) * 1000;
    this.notify(startedAt + totalMs + TAIL_S * 1000);

    await new Promise<void>((resolve) => {
      const done = setTimeout(() => {
        this.timers.delete(done);
        if (my === this.token) this.notify(0);
        resolve();
      }, totalMs + 100);
      this.timers.add(done);
      this.finish = resolve;
    });
  }
}


// ------------------------------------------------------------
// Rendering a composed scene
// ------------------------------------------------------------

/** Reverb tail added after the last call, seconds (also covers the room decay). */
const TAIL_S = 1.8;

/** Short decaying noise as a small outdoor room. */
function makeRoom(ctx: AudioContext): ConvolverNode {
  const len = Math.floor(ctx.sampleRate * TAIL_S);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  return conv;
}

let playerInstance: CrowPlayer | null = null;

export function getCrowPlayer(): CrowPlayer {
  if (!playerInstance) playerInstance = new CrowPlayer();
  return playerInstance;
}
