// ============================================================
// CrowTrans composer
// ============================================================
// Builds NEW sequences of crow calls from a bank of individual real calls
// (public/sounds/units.json). Nothing here plays audio: it only decides which
// call goes where, how fast, how high, how loud and from which direction.
// crow_sounds.ts renders the resulting Scene with Web Audio.
//
// What is real: every sound is a cut from a real recording, and the gaps
// between calls are drawn from the gaps measured in real bouts (build_units.py).
// What is invented: the arrangement, the pitch and speed shaping per mood,
// and the layering of extra birds.

import type { CallTypeId } from "./crow_sounds";
import type { CipherWord, Segment } from "./crow_speak";

export interface UnitMeta {
  /** offset into the sprite, seconds */
  o: number;
  /** duration, seconds */
  d: number;
  /** median fundamental, Hz (0 = unreliable) */
  f: number;
  /** pitch slope, Hz per second */
  s: number;
  /** Xeno-canto recording number */
  x: string;
  /** index into UnitBank.recordists */
  r: number;
  /** licence */
  l: string;
}

export interface ClassBank {
  sprite: string;
  units: UnitMeta[];
}

export interface SpeciesBank {
  id: string;
  name: string;
  classes: Partial<Record<CallTypeId, ClassBank>>;
}

export interface Rhythm {
  /** onset-to-onset gap quantiles in ms at the 5th, 25th, 50th, 75th and 95th percentile */
  ioi: number[];
  /** probability of 1..8 calls in a 3 s window */
  counts: number[];
  n: number;
}

export interface UnitBank {
  gap: number;
  recordists: string[];
  species: SpeciesBank[];
  rhythm: Partial<Record<CallTypeId, Rhythm>>;
}

let bankPromise: Promise<UnitBank> | null = null;

export function loadUnitBank(): Promise<UnitBank> {
  if (!bankPromise) {
    bankPromise = fetch("/sounds/units.json").then((r) => {
      if (!r.ok) throw new Error(`unit bank HTTP ${r.status}`);
      return r.json() as Promise<UnitBank>;
    });
    bankPromise.catch(() => {
      bankPromise = null;
    });
  }
  return bankPromise;
}

export type Distance = "near" | "mid" | "far";
export type BoutLength = "short" | "medium" | "long";

/** One scheduled call. */
export interface NoteEvent {
  /** seconds from the start of the scene */
  t: number;
  speciesId: string;
  cls: CallTypeId;
  sprite: string;
  unit: UnitMeta;
  /** playback rate at the start and end of the call (a glide when they differ) */
  rate0: number;
  rate1: number;
  gain: number;
  /** -1 left .. 1 right */
  pan: number;
  /** low-pass cutoff, Hz */
  cutoff: number;
  /** reverb send, 0..1 */
  wet: number;
  /** 0 is the main bird, 1 and 2 are the flock */
  voice: number;
  /** which sentence it belongs to, -1 for the soundboard */
  segment: number;
  label: string;
}

export interface Scene {
  events: NoteEvent[];
  durationS: number;
}

export function eventDuration(e: NoteEvent): number {
  return e.unit.d / ((e.rate0 + e.rate1) / 2);
}

// ------------------------------------------------------------
// Randomness
// ------------------------------------------------------------

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromText(text: string, salt = 0): number {
  let h = 0x811c9dc5 ^ salt;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const QS = [0.05, 0.25, 0.5, 0.75, 0.95];

/** A gap in ms drawn from the measured distribution. */
function sampleIoi(ioi: number[], rng: Rng): number {
  const u = 0.05 + 0.9 * rng();
  for (let i = 1; i < QS.length; i++) {
    if (u <= QS[i]) {
      const f = (u - QS[i - 1]) / (QS[i] - QS[i - 1]);
      return ioi[i - 1] + f * (ioi[i] - ioi[i - 1]);
    }
  }
  return ioi[ioi.length - 1];
}

/** A call count drawn from the measured histogram (1..8). */
function sampleCount(counts: number[], rng: Rng): number {
  let u = rng();
  for (let i = 0; i < counts.length; i++) {
    u -= counts[i];
    if (u <= 0) return i + 1;
  }
  return counts.length;
}

function sampleMix(mix: Partial<Record<CallTypeId, number>>, rng: Rng): CallTypeId {
  const entries = Object.entries(mix) as [CallTypeId, number][];
  let u = rng() * entries.reduce((s, [, v]) => s + v, 0);
  for (const [id, v] of entries) {
    u -= v;
    if (u <= 0) return id;
  }
  return entries[entries.length - 1][0];
}

// ------------------------------------------------------------
// Style
// ------------------------------------------------------------

/**
 * How each call type is delivered. These numbers are judgement, not measurements:
 * tempo scales the real gaps, accel < 1 speeds a bout up, slope glides the pitch.
 */
const STYLE: Record<CallTypeId, { tempo: number; accel: number; slope: number; rate: number; gain: number }> = {
  alarm_agonistic: { tempo: 0.85, accel: 0.75, slope: 0.0, rate: 1.0, gain: 1.0 },
  contact_social: { tempo: 1.0, accel: 1.0, slope: 0.0, rate: 1.0, gain: 0.95 },
  attention: { tempo: 0.9, accel: 0.95, slope: 0.02, rate: 1.0, gain: 1.0 },
  begging_food: { tempo: 0.9, accel: 0.9, slope: 0.06, rate: 1.02, gain: 0.95 },
  juvenile_grunt: { tempo: 1.0, accel: 1.0, slope: 0.0, rate: 1.05, gain: 0.85 },
  flight_call: { tempo: 1.1, accel: 1.0, slope: -0.02, rate: 1.0, gain: 0.95 },
  song_subsong: { tempo: 1.3, accel: 1.0, slope: 0.0, rate: 0.97, gain: 0.7 },
};

const DISTANCE: Record<Distance, { cutoff: number; wet: number; gain: number }> = {
  near: { cutoff: 16000, wet: 0.05, gain: 1.0 },
  mid: { cutoff: 7000, wet: 0.2, gain: 0.85 },
  far: { cutoff: 3400, wet: 0.42, gain: 0.62 },
};

const LENGTH_FACTOR: Record<BoutLength, number> = { short: 1, medium: 2, long: 3.5 };

// ------------------------------------------------------------
// Builder
// ------------------------------------------------------------

interface CallOpts {
  t: number;
  rate: number;
  slope: number;
  gain: number;
  targetDur?: number;
  segment: number;
  label: string;
}

class Builder {
  events: NoteEvent[] = [];
  private used = new Set<string>();
  private species: SpeciesBank;

  constructor(
    private bank: UnitBank,
    speciesId: string,
    private rng: Rng,
    private voices: number,
    private distance: Distance
  ) {
    const s = bank.species.find((x) => x.id === speciesId) ?? bank.species[0];
    if (!s) throw new Error("the unit bank is empty");
    this.species = s;
  }

  /** Call types this species can produce. */
  available(): CallTypeId[] {
    return Object.keys(this.species.classes) as CallTypeId[];
  }

  private pick(cls: CallTypeId, targetDur?: number): { cb: ClassBank; index: number } {
    const cb = this.species.classes[cls] ?? Object.values(this.species.classes)[0]!;
    const all = cb.units.map((_, i) => i);
    let cand = all;
    if (targetDur) {
      const near = all.filter((i) => Math.abs(cb.units[i].d - targetDur) / targetDur < 0.45);
      if (near.length >= 3) cand = near;
    }
    let fresh = cand.filter((i) => !this.used.has(`${cb.sprite}#${i}`));
    if (fresh.length === 0) {
      cand.forEach((i) => this.used.delete(`${cb.sprite}#${i}`));
      fresh = cand;
    }
    const index = fresh[Math.floor(this.rng() * fresh.length)];
    this.used.add(`${cb.sprite}#${index}`);
    return { cb, index };
  }

  /** Adds one call (plus its flock) and returns how long the main call lasts. */
  call(cls: CallTypeId, o: CallOpts): number {
    const dist = DISTANCE[this.distance];
    let mainDur = 0;
    for (let v = 0; v <= Math.min(2, this.voices - 1); v++) {
      const { cb, index } = this.pick(cls, o.targetDur);
      const unit = cb.units[index];
      const flock = v > 0;
      const rateMul = !flock ? 1 : v === 1 ? 0.82 + this.rng() * 0.1 : 1.14 + this.rng() * 0.14;
      const rate0 = o.rate * rateMul;
      const rate1 = rate0 * (1 + o.slope);
      const ev: NoteEvent = {
        t: o.t + (flock ? (0.05 + this.rng() * 0.2) * v : 0),
        speciesId: this.species.id,
        cls: this.species.classes[cls] ? cls : (Object.keys(this.species.classes)[0] as CallTypeId),
        sprite: cb.sprite,
        unit,
        rate0,
        rate1,
        gain: o.gain * dist.gain * (flock ? 0.5 : 1),
        pan: !flock ? 0 : v === 1 ? -0.55 : 0.55,
        cutoff: dist.cutoff * (flock ? 0.85 : 1),
        wet: Math.min(0.7, dist.wet * (flock ? 1.4 : 1)),
        voice: v,
        segment: o.segment,
        label: o.label,
      };
      this.events.push(ev);
      if (!flock) mainDur = eventDuration(ev);
    }
    return mainDur;
  }

  scene(): Scene {
    const end = this.events.reduce((m, e) => Math.max(m, e.t + eventDuration(e)), 0);
    this.events.sort((a, b) => a.t - b.t);
    return { events: this.events, durationS: end };
  }

  rhythm(cls: CallTypeId): Rhythm {
    return (
      this.bank.rhythm[cls] ?? { ioi: [250, 450, 700, 1000, 1800], counts: [0.3, 0.3, 0.2, 0.1, 0.05, 0.03, 0.01, 0.01], n: 0 }
    );
  }
}

export interface ComposeOpts {
  bank: UnitBank;
  speciesId: string;
  seed: number;
  voices: number;
  distance: Distance;
}

/** One call type, delivered as a bout, the way the soundboard buttons do it. */
export function composeBout(opts: ComposeOpts & { cls: CallTypeId; length: BoutLength }): Scene {
  const b = new Builder(opts.bank, opts.speciesId, mulberry32(opts.seed), opts.voices, opts.distance);
  const rng = mulberry32(opts.seed ^ 0x9e3779b9);
  const style = STYLE[opts.cls];
  const r = b.rhythm(opts.cls);
  const n = Math.max(2, Math.round(sampleCount(r.counts, rng) * LENGTH_FACTOR[opts.length]));
  let t = 0;
  for (let i = 0; i < n; i++) {
    const progress = n > 1 ? i / (n - 1) : 0;
    const tempo = style.tempo * (1 + (style.accel - 1) * progress);
    const dur = b.call(opts.cls, {
      t,
      rate: style.rate * (0.97 + 0.06 * rng()),
      slope: style.slope,
      gain: style.gain,
      segment: -1,
      label: `call ${i + 1}`,
    });
    t += Math.max((sampleIoi(r.ioi, rng) / 1000) * tempo, dur * 0.85);
  }
  return b.scene();
}

const MOOD = {
  statement: { start: 1.03, end: 0.94, slope: -0.03, gain: 0.95, tempo: 1.0 },
  question: { start: 0.93, end: 1.12, slope: 0.05, gain: 0.95, tempo: 1.0 },
  exclaim: { start: 1.06, end: 1.04, slope: 0.02, gain: 1.0, tempo: 0.8 },
} as const;

/** Text, sentence by sentence: calls from the sentence's blend, shaped by its mood. */
export function composeText(opts: ComposeOpts & { segments: Segment[] }): Scene {
  const b = new Builder(opts.bank, opts.speciesId, mulberry32(opts.seed), opts.voices, opts.distance);
  const rng = mulberry32(opts.seed ^ 0x85ebca6b);
  const allowed = new Set(b.available());
  let t = 0;
  opts.segments.forEach((seg, si) => {
    const mood = MOOD[seg.mood];
    // words and commas; very long sentences merge neighbouring words so a bout stays listenable
    let tokens: string[] = seg.text.toLowerCase().match(/[a-z0-9']+|[,;:]/g) ?? [];
    const wordCount = tokens.filter((x) => /[a-z0-9]/.test(x)).length;
    if (wordCount > 16) {
      const merged: string[] = [];
      let pending = "";
      for (const tok of tokens) {
        if (!/[a-z0-9]/.test(tok)) {
          if (pending) merged.push(pending);
          pending = "";
          merged.push(tok);
        } else if (pending) {
          merged.push(`${pending} ${tok}`);
          pending = "";
        } else {
          pending = tok;
        }
      }
      if (pending) merged.push(pending);
      tokens = merged;
    }
    const words = tokens.filter((x) => /[a-z0-9]/.test(x));
    const mix: Partial<Record<CallTypeId, number>> = {};
    for (const [k, v] of Object.entries(seg.guess.mix) as [CallTypeId, number][]) if (allowed.has(k)) mix[k] = v;
    let wi = 0;
    for (const tok of tokens) {
      if (!/[a-z0-9]/.test(tok)) {
        t += 0.35;
        continue;
      }
      const frac = words.length > 1 ? wi / (words.length - 1) : 0;
      // a sentence always opens with its dominant call type; later calls sample the blend
      const dominant = (Object.entries(mix) as [CallTypeId, number][]).sort((x, y) => y[1] - x[1])[0][0];
      const cls = wi === 0 ? dominant : sampleMix(mix, rng);
      const r = b.rhythm(cls);
      const style = STYLE[cls];
      const targetDur = 0.22 + Math.min(tok.length, 10) * 0.055;
      const dur = b.call(cls, {
        t,
        rate: (mood.start + (mood.end - mood.start) * frac) * style.rate * (0.985 + 0.03 * rng()),
        slope: mood.slope + style.slope,
        gain: mood.gain * style.gain,
        targetDur,
        segment: si,
        label: tok,
      });
      t += Math.max((sampleIoi(r.ioi, rng) / 1000) * style.tempo * mood.tempo * 0.8, dur * 0.9);
      wi++;
    }
    t += seg.pauseMs / 1000;
  });
  return b.scene();
}

/** The cipher game: each word is one fixed call, so a word always sounds the same. */
export function composeCipher(opts: ComposeOpts & { words: CipherWord[] }): Scene {
  const b = new Builder(opts.bank, opts.speciesId, mulberry32(opts.seed), opts.voices, opts.distance);
  const species = opts.bank.species.find((s) => s.id === opts.speciesId) ?? opts.bank.species[0];
  let t = 0;
  opts.words.forEach((w, wi) => {
    const cb = species.classes[w.cls];
    if (!cb) return;
    w.picks.forEach((pick, k) => {
      const unit = cb.units[pick % cb.units.length];
      // the cipher is deterministic: place the chosen unit directly (voices stay off for clarity)
      const ev: NoteEvent = {
        t,
        speciesId: species.id,
        cls: w.cls,
        sprite: cb.sprite,
        unit,
        rate0: 1,
        rate1: 1,
        gain: DISTANCE[opts.distance].gain,
        pan: 0,
        cutoff: DISTANCE[opts.distance].cutoff,
        wet: DISTANCE[opts.distance].wet,
        voice: 0,
        segment: wi,
        label: w.word,
      };
      b.events.push(ev);
      t += eventDuration(ev) + (k === w.picks.length - 1 ? w.gapMs : 60) / 1000;
    });
  });
  return b.scene();
}
