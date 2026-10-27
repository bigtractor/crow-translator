"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, RefreshCw, Square } from "lucide-react";
import { GlassButton } from "./GlassButton";
import {
  CALL_TYPES,
  getCrowPlayer,
  loadSoundIndex,
  type CallTypeId,
  type PlayItem,
  type SoundClip,
  type SoundIndex,
} from "@/lib/crow_sounds";
import {
  composeBout,
  composeCipher,
  composeText,
  eventDuration,
  loadUnitBank,
  seedFromText,
  type BoutLength,
  type Distance,
  type Scene,
  type UnitBank,
} from "@/lib/crow_composer";
import { planCipher, planMeaning, type CipherWord, type Segment } from "@/lib/crow_speak";

interface SpeakPanelProps {
  /** Called with the epoch ms at which playback ends, or 0 when it stops. */
  onPlayback: (endsAtMs: number) => void;
}

type Mode = "meaning" | "cipher";
type Source = "composed" | "original";

const EXAMPLES = ["Danger! A cat is coming!", "Hello, I am here.", "I am hungry, give me food."];

const HUE: Record<CallTypeId, number> = {
  alarm_agonistic: 8,
  contact_social: 205,
  attention: 38,
  begging_food: 330,
  juvenile_grunt: 280,
  flight_call: 170,
  song_subsong: 120,
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const callLabel = (id: CallTypeId) => CALL_TYPES.find((c) => c.id === id)?.label ?? id;
const newSeed = () => (Math.random() * 4294967296) >>> 0;

/** n distinct clips, preferring ones not played recently (original-recordings mode). */
function pickDistinct(list: SoundClip[], n: number, avoid: Set<string>): SoundClip[] {
  const fresh = list.filter((c) => !avoid.has(c.id));
  const pool = [...(fresh.length >= n ? fresh : list)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

interface NowPlaying {
  label: string;
  recordist: string;
  xc: string;
  license: string;
  segment: number;
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className="block text-[12px] text-[var(--text-2)] mb-1">{label}</span>
      <div className="inline-flex gap-1" role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`pressable focus-ring h-9 px-3 text-[13px] rounded-full ${value === v ? "btn-primary" : "btn-glass"}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** What was composed: one lane per bird, one block per call, coloured by call type. */
function SceneView({ scene, active }: { scene: Scene | null; active: number }) {
  if (!scene || scene.events.length === 0) return null;
  const W = 640;
  const lane = 14;
  const lanes = Math.max(...scene.events.map((e) => e.voice)) + 1;
  const H = lanes * (lane + 4) + 4;
  const total = Math.max(scene.durationS, 0.5);
  const birds = lanes === 1 ? "1 bird" : `${lanes} birds`;
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between text-[12px] text-[var(--text-2)]">
        <span>Composition</span>
        <span className="mono">
          {scene.events.length} calls · {birds} · {scene.durationS.toFixed(1)} s
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1.5 w-full rounded-[10px] bg-[var(--muted-soft)]"
        role="img"
        aria-label={`Timeline of ${scene.events.length} composed calls`}
      >
        {scene.events.map((e, i) => (
          <rect
            key={i}
            x={(e.t / total) * (W - 8) + 4}
            y={e.voice * (lane + 4) + 4}
            width={Math.max(3, (eventDuration(e) / total) * (W - 8))}
            height={lane}
            rx={4}
            fill={`hsl(${HUE[e.cls] ?? 0} 60% 55%)`}
            fillOpacity={e.voice === 0 ? 0.95 : 0.55}
            stroke={i === active ? "var(--text)" : "none"}
            strokeWidth={1.5}
          >
            <title>{`${callLabel(e.cls)} · ${e.label}`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

export function SpeakPanel({ onPlayback }: SpeakPanelProps) {
  const player = useMemo(() => getCrowPlayer(), []);
  const [bank, setBank] = useState<UnitBank | null>(null);
  const [index, setIndex] = useState<SoundIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speciesId, setSpeciesId] = useState("carrion_hooded");
  const [source, setSource] = useState<Source>("composed");
  const [bout, setBout] = useState<BoutLength>("medium");
  const [voices, setVoices] = useState(1);
  const [distance, setDistance] = useState<Distance>("near");
  const [volume, setVolume] = useState(0.8);
  const [playing, setPlaying] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [activeEvent, setActiveEvent] = useState(-1);

  const [mode, setMode] = useState<Mode>("meaning");
  const [text, setText] = useState("");
  const [salt, setSalt] = useState(0);
  const [meaningPlan, setMeaningPlan] = useState<Segment[] | null>(null);
  const [cipherPlan, setCipherPlan] = useState<CipherWord[] | null>(null);

  const runRef = useRef(0);
  const recent = useRef(new Set<string>());

  useEffect(() => player.onBusy(onPlayback), [player, onPlayback]);

  useEffect(() => {
    let alive = true;
    Promise.all([loadUnitBank(), loadSoundIndex()])
      .then(([b, idx]) => {
        if (!alive) return;
        setBank(b);
        setIndex(idx);
        if (!b.species.some((s) => s.id === "carrion_hooded") && b.species[0]) setSpeciesId(b.species[0].id);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
      player.stop();
    };
  }, [player]);

  useEffect(() => {
    player.setVolume(volume);
  }, [player, volume]);

  const ready = !!bank && !!index;
  const bankSpecies = bank?.species.find((s) => s.id === speciesId) ?? bank?.species[0];
  const indexSpecies = index?.species.find((s) => s.id === speciesId) ?? index?.species[0];
  const available = useMemo(
    () =>
      CALL_TYPES.filter((c) =>
        source === "composed" ? (bankSpecies?.classes[c.id]?.units.length ?? 0) > 0 : (indexSpecies?.classes[c.id]?.length ?? 0) > 0
      ),
    [source, bankSpecies, indexSpecies]
  );
  const allowed = useMemo(() => new Set<CallTypeId>(available.map((c) => c.id)), [available]);

  const stopRun = useCallback(() => {
    runRef.current++;
    player.stop();
    setPlaying(false);
    setActiveKey(null);
    setActiveEvent(-1);
  }, [player]);

  /** Play a composed scene. */
  const runScene = useCallback(
    async (key: string, sc: Scene) => {
      const my = ++runRef.current;
      setScene(sc);
      setActiveKey(key);
      setActiveEvent(-1);
      setPlaying(true);
      try {
        await player.playScene(sc, {
          onEventStart: (e, i) => {
            setActiveEvent(i);
            setNow({
              label: e.label.startsWith("call ") ? callLabel(e.cls) : `${e.label} → ${callLabel(e.cls)}`,
              recordist: bank?.recordists[e.unit.r] ?? "",
              xc: e.unit.x,
              license: e.unit.l,
              segment: e.segment,
            });
          },
        });
      } catch (e) {
        if (runRef.current === my) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (runRef.current === my) {
          setPlaying(false);
          setActiveKey(null);
          setActiveEvent(-1);
        }
      }
    },
    [player, bank]
  );

  /** Play whole recordings in order (original-recordings mode). */
  const runClips = useCallback(
    async (key: string, items: PlayItem[], info: (position: number) => { label: string; segment: number }) => {
      const my = ++runRef.current;
      setScene(null);
      setActiveKey(key);
      setPlaying(true);
      try {
        await player.play(items, {
          onItemStart: (it, position) =>
            setNow({
              recordist: it.clip.recordist,
              xc: it.clip.xc,
              license: it.clip.license,
              ...info(position),
            }),
        });
      } catch (e) {
        if (runRef.current === my) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (runRef.current === my) {
          setPlaying(false);
          setActiveKey(null);
        }
      }
    },
    [player]
  );

  const remember = (clips: SoundClip[], poolSize: number) => {
    clips.forEach((c) => recent.current.add(c.id));
    if (recent.current.size > Math.max(6, poolSize)) recent.current.clear();
  };

  const boutClips = bout === "short" ? 1 : bout === "medium" ? 2 : 3;

  const playCall = (cls: CallTypeId) => {
    if (source === "composed") {
      if (!bank) return;
      void runScene(cls, composeBout({ bank, speciesId: bankSpecies!.id, cls, length: bout, voices, distance, seed: newSeed() }));
      return;
    }
    const list = indexSpecies?.classes[cls];
    if (!list?.length) return;
    const chosen = pickDistinct(list, boutClips, recent.current);
    remember(chosen, list.length);
    const items: PlayItem[] = chosen.map((clip, i) => ({
      clip,
      rate: rand(0.985, 1.02),
      gapAfterMs: i < chosen.length - 1 ? rand(120, 380) : 0,
    }));
    void runClips(cls, items, () => ({ label: callLabel(cls), segment: -1 }));
  };

  const speak = (reroll = false) => {
    if (!text.trim() || !ready) return;
    const nextSalt = reroll ? salt + 1 : salt;
    if (reroll) setSalt(nextSalt);

    if (mode === "meaning") {
      const plan = planMeaning(text, allowed);
      setMeaningPlan(plan);
      setCipherPlan(null);
      if (source === "composed") {
        void runScene(
          "speak",
          composeText({ bank: bank!, speciesId: bankSpecies!.id, segments: plan, voices, distance, seed: seedFromText(text, nextSalt) })
        );
        return;
      }
      const items: PlayItem[] = [];
      const meta: { label: string; segment: number }[] = [];
      plan.forEach((seg, s) => {
        const list = indexSpecies?.classes[seg.guess.cls] ?? [];
        if (!list.length) return;
        const chosen = pickDistinct(list, seg.clips, recent.current);
        remember(chosen, list.length);
        chosen.forEach((clip, i) => {
          items.push({ clip, rate: rand(0.985, 1.02), gapAfterMs: i === chosen.length - 1 ? 700 : rand(120, 380) });
          meta.push({ label: callLabel(seg.guess.cls), segment: s });
        });
      });
      if (items.length) items[items.length - 1].gapAfterMs = 0;
      void runClips("speak", items, (p) => meta[p] ?? { label: "", segment: -1 });
    } else {
      const plan = planCipher(
        text,
        available.map((c) => c.id)
      );
      setCipherPlan(plan);
      setMeaningPlan(null);
      if (source === "composed") {
        void runScene("speak", composeCipher({ bank: bank!, speciesId: bankSpecies!.id, words: plan, voices, distance, seed: 1 }));
        return;
      }
      const items: PlayItem[] = [];
      const meta: { label: string; segment: number }[] = [];
      plan.forEach((w, wi) => {
        const list = indexSpecies?.classes[w.cls] ?? [];
        if (!list.length) return;
        w.picks.forEach((pick, k) => {
          const last = k === w.picks.length - 1;
          items.push({ clip: list[pick % list.length], snippet: true, gapAfterMs: last ? w.gapMs : 60 });
          meta.push({ label: `${w.word} → ${callLabel(w.cls)}`, segment: wi });
        });
      });
      if (items.length) items[items.length - 1].gapAfterMs = 0;
      void runClips("speak", items, (p) => meta[p] ?? { label: "", segment: -1 });
    }
  };

  const stop = () => {
    stopRun();
    setNow(null);
  };

  const activeSegment = playing && activeKey === "speak" ? (now?.segment ?? -1) : -1;
  const composed = source === "composed";

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      {/* ---------------- Soundboard ---------------- */}
      <section className="glass p-5 sm:p-6" aria-labelledby="board-heading">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="board-heading" className="text-[15px] font-semibold tracking-[-0.01em]">
              Soundboard
            </h2>
            <p className="text-[13px] text-[var(--text-2)] mt-0.5">
              {composed
                ? "Every press composes a new bout from real calls, timed like real crow bouts."
                : "Whole original recordings, a different pick each press."}
            </p>
          </div>
          <GlassButton size="sm" pill icon={<Square size={14} />} onClick={stop} disabled={!playing}>
            Stop
          </GlassButton>
        </div>

        {error ? (
          <p className="mt-4 text-[13px] text-[var(--warn)]" role="alert">
            Could not load sounds: {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3">
          <label className="block">
            <span className="block text-[12px] text-[var(--text-2)] mb-1">Species</span>
            <select
              value={bankSpecies?.id ?? ""}
              onChange={(e) => setSpeciesId(e.target.value)}
              disabled={!ready}
              className="focus-ring h-9 rounded-[12px] px-3 text-[13px] bg-[var(--surface-strong)] border border-[var(--hairline)] text-[var(--text)]"
            >
              {(bank?.species ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <Segmented
            label="Sound"
            value={source}
            options={[
              ["composed", "Composed"],
              ["original", "Original"],
            ]}
            onChange={setSource}
          />
          <Segmented
            label="Bout length"
            value={bout}
            options={[
              ["short", "Short"],
              ["medium", "Medium"],
              ["long", "Long"],
            ]}
            onChange={setBout}
          />
          {composed ? (
            <>
              <Segmented
                label="Birds"
                value={voices}
                options={[
                  [1, "1"],
                  [2, "2"],
                  [3, "3"],
                ]}
                onChange={setVoices}
              />
              <Segmented
                label="Distance"
                value={distance}
                options={[
                  ["near", "Near"],
                  ["mid", "Mid"],
                  ["far", "Far"],
                ]}
                onChange={setDistance}
              />
            </>
          ) : null}

          <label className="block grow min-w-[120px]">
            <span className="block text-[12px] text-[var(--text-2)] mb-1">Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
              aria-label="Volume"
            />
          </label>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {CALL_TYPES.map((c) => {
            const ok = allowed.has(c.id);
            const active = activeKey === c.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={!ok || !ready}
                onClick={() => playCall(c.id)}
                aria-pressed={active}
                aria-label={`${c.label}. ${ok ? c.hint : "Not available for this species"}`}
                className={`pressable focus-ring btn-glass text-left px-3.5 py-3 ${active ? "ring-2 ring-[var(--accent)]" : ""}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-medium tracking-[-0.01em]">{c.label}</span>
                  {active ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--ok)] dot-live" /> : null}
                </span>
                <span className="block text-[12px] text-[var(--text-2)] mt-0.5 leading-snug">
                  {ok ? c.hint : "Not available for this species"}
                </span>
              </button>
            );
          })}
        </div>

        <SceneView scene={scene} active={activeEvent} />
        <NowLine now={now} playing={playing} />
      </section>

      {/* ---------------- Text to crow ---------------- */}
      <section className="glass p-5 sm:p-6" aria-labelledby="text-heading">
        <h2 id="text-heading" className="text-[15px] font-semibold tracking-[-0.01em]">
          Text to crow
        </h2>
        <p className="text-[13px] text-[var(--text-2)] mt-0.5">
          {mode === "meaning"
            ? composed
              ? "Each sentence picks a blend of call types. Words set the rhythm, the mood (statement, question, shout) bends the pitch. A toy, not a translation: crows have no known grammar."
              : "Each sentence is matched to the closest call type and played with original recordings. A toy, not a translation."
            : "A game: every word maps to one fixed call, so a word always sounds the same. An invented code, not crow language."}
        </p>

        <div className="mt-4">
          <Segmented
            label="Mode"
            value={mode}
            options={[
              ["meaning", "Meaning"],
              ["cipher", "Cipher game"],
            ]}
            onChange={setMode}
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSalt(0);
          }}
          rows={4}
          placeholder="Type something to say to a crow…"
          aria-label="Text to turn into crow calls"
          className="focus-ring mt-3 w-full resize-y rounded-[14px] px-3.5 py-3 text-[15px] bg-[var(--surface-strong)] border border-[var(--hairline)] text-[var(--text)] placeholder:text-[var(--text-3)]"
        />

        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setText(ex);
                setSalt(0);
              }}
              className="pressable focus-ring btn-glass btn-pill h-7 px-3 text-[12px] text-[var(--text-2)]"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <GlassButton
            variant="primary"
            block
            icon={<Play size={16} />}
            onClick={() => speak(false)}
            disabled={!ready || !text.trim() || available.length === 0}
          >
            Speak
          </GlassButton>
          {composed && mode === "meaning" ? (
            <GlassButton
              icon={<RefreshCw size={16} />}
              onClick={() => speak(true)}
              disabled={!ready || !text.trim()}
              aria-label="Compose a different version of the same text"
            >
              Re-roll
            </GlassButton>
          ) : null}
        </div>

        {meaningPlan ? (
          <ol className="mt-4 space-y-2" aria-label="How each sentence was matched">
            {meaningPlan.map((seg, i) => (
              <li
                key={i}
                className={`rounded-[12px] px-3 py-2 border text-[13px] ${
                  activeSegment === i ? "border-[var(--accent)] bg-[var(--muted-soft)]" : "border-[var(--hairline)]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate">{seg.text}</span>
                  <span className="flex-none font-medium">{callLabel(seg.guess.cls)}</span>
                </div>
                <div className="text-[12px] text-[var(--text-3)] mt-0.5">
                  {seg.guess.fallback
                    ? "No clear cue, so mostly plain contact calls."
                    : `Matched: ${seg.guess.matched.join(", ")}`}
                  {composed ? ` · ${seg.mood}` : ""}
                </div>
              </li>
            ))}
          </ol>
        ) : null}

        {cipherPlan ? (
          <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Word to call mapping">
            {cipherPlan.map((w, i) => (
              <span
                key={i}
                className={`rounded-full px-2.5 py-1 text-[12px] border ${
                  activeSegment === i ? "border-[var(--accent)] bg-[var(--muted-soft)]" : "border-[var(--hairline)]"
                }`}
              >
                {w.word} <span className="text-[var(--text-3)]">{callLabel(w.cls)}</span>
              </span>
            ))}
          </div>
        ) : null}

        <p className="mt-5 text-[12px] text-[var(--text-3)] leading-snug">
          Keep it indoors and quiet. Playing alarm or begging calls to wild birds can stress them or draw mobbing, and some
          places restrict playback.
        </p>
      </section>
    </div>
  );
}

function NowLine({ now, playing }: { now: NowPlaying | null; playing: boolean }) {
  if (!now) {
    return <p className="mt-4 text-[12px] text-[var(--text-3)]">Press a button to play a call.</p>;
  }
  return (
    <p className="mt-3 text-[12px] text-[var(--text-2)] leading-snug" aria-live="polite">
      <span className="font-medium text-[var(--text)]">{playing ? "Playing" : "Last played"}</span> {now.label} · {now.recordist} ·{" "}
      <a
        href={`https://xeno-canto.org/${now.xc}`}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 hover:text-[var(--text)]"
      >
        XC{now.xc}
      </a>{" "}
      · {now.license}
    </p>
  );
}

