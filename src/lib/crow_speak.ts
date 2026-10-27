// ============================================================
// English text -> crow calls
// ============================================================
// Pure functions, no DOM. Two modes:
//
//  1. "meaning": each sentence is matched to the closest of the 7 call types by
//     cue words ("danger", "hungry", "hello" ...). This is a which-call-fits toy,
//     NOT a translation: crows have no known grammar, and the model only knows
//     seven kinds of call.
//  2. "cipher": a game. Every word is mapped to a fixed call by hashing it, so the
//     same word always sounds the same. An invented code, not crow language.

import type { CallTypeId } from "./crow_sounds";

type Cue = [pattern: string, weight: number];

/** Cue words per call type. Patterns are regex fragments matched on word boundaries. */
const CUES: Record<CallTypeId, Cue[]> = {
  alarm_agonistic: [
    ["danger(?:ous)?", 3], ["alarm(?:ed)?", 3], ["warn(?:ing|ed)?", 3], ["watch out", 3], ["careful", 2],
    ["beware", 3], ["predator", 3], ["hawk", 2], ["owl", 2], ["eagle", 2], ["cat", 2], ["dog", 2], ["fox", 2],
    ["snake", 2], ["intruder", 3], ["stranger", 2], ["threat(?:en\\w*)?", 3], ["attack(?:ing|ed)?", 3],
    ["go away", 3], ["get out", 3], ["back off", 3], ["leave (?:me|us|now)", 2], ["scram", 3], ["shoo", 3],
    ["help", 2], ["run", 1], ["angry", 2], ["mad", 1], ["furious", 3], ["stop it", 2], ["scary", 2],
    ["afraid", 2], ["fear\\w*", 2], ["enemy", 3], ["mob(?:bing)?", 3], ["scold\\w*", 3], ["get (?:him|her|them)", 2],
  ],
  begging_food: [
    ["hungr\\w*", 3], ["food", 3], ["feed(?:ing)? me", 3], ["feed", 2], ["eat(?:ing)?", 2], ["snack", 2],
    ["bread", 2], ["peanuts?", 3], ["seeds?", 1], ["give me", 2], ["please", 1], ["more", 1], ["dinner", 2],
    ["breakfast", 2], ["lunch", 2], ["treats?", 2], ["starv\\w*", 3], ["worms?", 2], ["meat", 2], ["nuts?", 2],
    ["i want", 1], ["yummy", 2], ["delicious", 2], ["thirsty", 1],
  ],
  contact_social: [
    ["hello", 3], ["hi", 2], ["hey there", 3], ["good (?:morning|day|evening)", 2], ["i(?:'| a)?m here", 3],
    ["i am here", 3], ["here i am", 3], ["where are you", 3], ["come back", 3], ["come here", 2], ["friends?", 2],
    ["love", 2], ["miss you", 3], ["together", 2], ["answer", 1], ["talk(?:ing)?", 1], ["chat", 2],
    ["how are you", 3], ["stay", 2], ["home", 1], ["partner", 2], ["mate", 2], ["family", 2], ["welcome", 2],
    ["thank(?:s| you)", 2], ["see you", 2], ["with me", 1],
  ],
  attention: [
    ["look", 3], ["listen", 3], ["attention", 3], ["hey you", 3], ["over there", 3], ["see that", 3],
    ["notice", 2], ["excuse me", 3], ["psst", 3], ["pay attention", 3], ["check (?:this|that|it) out", 3],
    ["wait", 2], ["hey", 2], ["oi", 2], ["you there", 3], ["did you see", 3], ["what is that", 2],
    ["what's that", 2], ["guess what", 3],
  ],
  juvenile_grunt: [
    ["baby", 3], ["little one", 3], ["chick", 3], ["fledgling", 3], ["mama", 3], ["mommy", 3], ["mom", 3],
    ["mum", 3], ["tiny", 2], ["small", 1], ["young", 1], ["whin\\w*", 2], ["cuddle", 2], ["nest", 2],
    ["i am little", 3], ["i'm little", 3], ["childhood", 1], ["kid", 2], ["puppy", 1],
  ],
  flight_call: [
    ["fl(?:y|ying|ies|ew|ight)", 3], ["leav(?:e|ing)", 1], ["let's go", 3], ["lets go", 3], ["take ?off", 3],
    ["migrat\\w*", 3], ["overhead", 3], ["away", 1], ["soar(?:ing)?", 3], ["wings?", 2], ["bye", 2], ["goodbye", 2],
    ["heading", 2], ["glide", 3], ["sky", 2], ["above", 1], ["passing", 2], ["on my way", 2], ["travel\\w*", 1],
    ["up high", 2], ["let's fly", 3],
  ],
  song_subsong: [
    ["sing(?:ing)?", 3], ["song", 3], ["relax(?:ed|ing)?", 3], ["quiet", 2], ["calm", 3], ["peace\\w*", 3],
    ["dream\\w*", 2], ["sunshine", 2], ["sunny", 1], ["nice day", 3], ["lovely", 1], ["murmur", 3], ["hum(?:ming)?", 2],
    ["chill", 3], ["sleep\\w*", 2], ["evening", 1], ["night", 1], ["think(?:ing)?", 1], ["gentle", 2], ["soft(?:ly)?", 2],
    ["cozy", 2], ["happy", 1], ["content", 1], ["sunset", 2],
  ],
};

const compiled = (Object.keys(CUES) as CallTypeId[]).map((id) => ({
  id,
  cues: CUES[id].map(([p, w]) => ({ rx: new RegExp(`(?<![a-z])${p}(?![a-z])`, "g"), weight: w })),
}));

export interface IntentGuess {
  cls: CallTypeId;
  score: number;
  /** cue words that fired, for the "why" line */
  matched: string[];
  /** true when nothing matched and the contact call was used as the default */
  fallback: boolean;
  /** share of each allowed call type, summing to 1; the composer samples calls from this blend */
  mix: Partial<Record<CallTypeId, number>>;
}

/** Normalise: lowercase, curly apostrophes to straight. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[‘’]/g, "'");
}

/**
 * Which call type fits this sentence best?
 * @param allowed call types the chosen species can actually produce
 */
export function guessIntent(sentence: string, allowed: ReadonlySet<CallTypeId>): IntentGuess {
  const text = norm(sentence);
  const bangs = (text.match(/!/g) ?? []).length;
  const scores: Partial<Record<CallTypeId, number>> = {};
  const matchedBy: Partial<Record<CallTypeId, string[]>> = {};
  let best: { cls: CallTypeId; score: number } | null = null;

  for (const { id, cues } of compiled) {
    if (!allowed.has(id)) continue;
    let score = 0;
    const matched: string[] = [];
    for (const { rx, weight } of cues) {
      rx.lastIndex = 0;
      for (const m of text.matchAll(rx)) {
        score += weight;
        if (!matched.includes(m[0])) matched.push(m[0]);
      }
    }
    // Shouting makes an alarm more alarming; it never creates one from nothing.
    if (id === "alarm_agonistic" && score > 0 && bangs > 0) score *= 1 + Math.min(bangs, 3) * 0.15;
    scores[id] = score;
    matchedBy[id] = matched;
    if (score > 0 && (!best || score > best.score)) best = { cls: id, score };
  }

  // The blend: every allowed call type keeps a small share so a bout is never one note,
  // and the cue-matched types dominate.
  // With a cue the matched types dominate and unrelated types stay rare (a "danger" call
  // should not come out as a relaxed song). Without one, only neutral calls are used: a
  // sentence with no cue must never sound like an alarm or a begging cry.
  const NEUTRAL: Partial<Record<CallTypeId, number>> = {
    contact_social: 0.6,
    attention: 0.15,
    song_subsong: 0.15,
    flight_call: 0.1,
  };
  const mix: Partial<Record<CallTypeId, number>> = {};
  let total = 0;
  for (const id of allowed) {
    const v = best ? ((scores[id] ?? 0) + 0.02) ** 2 : (NEUTRAL[id] ?? 0); // squared: cue-matched types dominate
    mix[id] = v;
    total += v;
  }
  if (total === 0) for (const id of allowed) { mix[id] = 1; total += 1; }
  for (const id of allowed) mix[id] = (mix[id] ?? 0) / total;

  if (best) return { cls: best.cls, score: best.score, matched: matchedBy[best.cls] ?? [], fallback: false, mix };

  // No cue: a plain contact call is the most common call in the data.
  const fallbackCls: CallTypeId = allowed.has("contact_social") ? "contact_social" : [...allowed][0];
  return { cls: fallbackCls, score: 0, matched: [], fallback: true, mix };
}

export type Mood = "statement" | "question" | "exclaim";

export interface Segment {
  text: string;
  guess: IntentGuess;
  /** how many natural clips to chain for this sentence (original-clips mode) */
  clips: number;
  mood: Mood;
  /** the words, lower-case, for rhythm and call length */
  words: string[];
  /** pause after this sentence, in ms */
  pauseMs: number;
}

/** Split into sentences, drop empties. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[a-z0-9]/i.test(s));
}

/** Longer or louder sentences get a longer bout. */
function boutLength(sentence: string): number {
  const bangs = (sentence.match(/!/g) ?? []).length;
  const n = sentence.length;
  let clips = n > 90 ? 3 : n > 40 ? 2 : 1;
  if (bangs >= 2) clips = Math.min(3, clips + 1);
  return clips;
}

function moodOf(sentence: string): Mood {
  const t = sentence.trim();
  if (/!\s*$/.test(t)) return "exclaim";
  if (/\?\s*$/.test(t)) return "question";
  return "statement";
}

export function planMeaning(text: string, allowed: ReadonlySet<CallTypeId>): Segment[] {
  return splitSentences(text).map((s) => {
    const mood = moodOf(s);
    return {
      text: s,
      guess: guessIntent(s, allowed),
      clips: boutLength(s),
      mood,
      words: norm(s).match(/[a-z0-9']+/g) ?? [],
      pauseMs: mood === "statement" ? 700 : 850,
    };
  });
}

// ------------------------------------------------------------
// Cipher game
// ------------------------------------------------------------

export interface CipherWord {
  word: string;
  cls: CallTypeId;
  /** deterministic picks, reduced modulo the clip count at play time */
  picks: number[];
  /** pause after this word, in ms */
  gapMs: number;
}

/** FNV-1a, 32 bit. Stable across sessions, so a word always maps to the same call. */
export function hashWord(word: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function syllables(word: string): number {
  const groups = word.toLowerCase().replace(/e$/, "").match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function planCipher(text: string, available: readonly CallTypeId[]): CipherWord[] {
  const out: CipherWord[] = [];
  if (available.length === 0) return out;
  const tokens = norm(text).match(/[a-z0-9']+|[,;:.!?…]/g) ?? [];
  for (const tok of tokens) {
    if (/^[,;:.!?…]$/.test(tok)) {
      if (out.length) out[out.length - 1].gapMs = tok === "," || tok === ";" || tok === ":" ? 450 : 850;
      continue;
    }
    const h = hashWord(tok);
    const calls = syllables(tok) >= 3 ? 2 : 1;
    out.push({
      word: tok,
      cls: available[h % available.length],
      picks: Array.from({ length: calls }, (_, i) => (h >>> 8) + i * 7919),
      gapMs: 140,
    });
  }
  return out;
}
