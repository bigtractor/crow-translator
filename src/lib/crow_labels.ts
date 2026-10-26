// ============================================================
// CrowTrans label logic (shared by the UI thread and the worker)
// ============================================================
// Pure functions, no DOM or TensorFlow dependency.
//
// Model: /models/crowtrans_v1b.tflite (BirdNET V2.4 features + a custom head)
//   input   float32 [1, 144000]  3 s of mono audio at 48 kHz
//   output  float32 [1, 7]       RAW LOGITS (range roughly -30..+6). The graph has
//                                no final sigmoid; flatSigmoid() below turns them
//                                into probabilities, as BirdNET-Analyzer does.
// Output order follows /models/crowtrans_v1b_labels.txt. "Background" is not an
// output: it is trained as "none of the classes", so a non-crow sound shows up
// as every class being low.

import type { CrowBehavior } from "@/types";

export const MODEL_URL = "/models/crowtrans_v1b.tflite";
export const LABELS_URL = "/models/crowtrans_v1b_labels.txt";

/**
 * A window counts as a crow call when its strongest class reaches this
 * probability (after flatSigmoid). Measured on held-out recordings the model
 * never trained on: 89% of crow windows pass, 1.9% of background windows pass,
 * and 0 of 25 claps/knocks/footsteps/clicks pass; the winning class is the
 * right one 81% of the time. Raise it for fewer false alarms (0.50: 79% / 0.8%),
 * lower it for more detections (0.30: 96% / 2.7%).
 */
export const CROW_PRESENCE_THRESHOLD = 0.4;

/**
 * The model's output layer has no activation: values are logits.
 * BirdNET-Analyzer applies flat_sigmoid(x) = 1 / (1 + exp(-clip(x, -15, 15))).
 */
export function flatSigmoid(logit: number): number {
  const x = Math.max(-15, Math.min(15, logit));
  return 1 / (1 + Math.exp(-x));
}

export interface RankedClass {
  label: string;
  p: number;
}

/** All classes, highest probability first. */
export function rankClasses(probs: ArrayLike<number>, labels: string[]): RankedClass[] {
  const out: RankedClass[] = [];
  for (let i = 0; i < probs.length && i < labels.length; i++) {
    out.push({ label: labels[i], p: probs[i] });
  }
  return out.sort((a, b) => b.p - a.p);
}

export interface CrowDecision {
  isCrow: boolean;
  /** Strongest class, whether or not it cleared the bar. */
  top: RankedClass | null;
  ranking: RankedClass[];
}

/**
 * One rule: a crow call is present if the strongest class reaches the
 * threshold, and that class is the meaning. Stage-less on purpose: the old
 * species gate under-scored begging and juvenile calls and dropped them.
 */
export function decide(
  probs: ArrayLike<number>,
  labels: string[],
  threshold = CROW_PRESENCE_THRESHOLD
): CrowDecision {
  const ranking = rankClasses(probs, labels);
  const top = ranking[0] ?? null;
  return { isCrow: !!top && top.p >= threshold, top, ranking };
}

/** Function-by-context readings, not claims about emotion. */
export function mapClassToBehavior(label: string): {
  behavior: CrowBehavior;
  title: string;
  meaning: string;
} {
  switch (label.trim().toLowerCase()) {
    case "contact_social":
      return {
        behavior: "contact_social",
        title: "Contact / Social Call",
        meaning:
          "Staying in touch with a partner or group: announcing presence, calling a mate back, answering each other.",
      };
    case "attention":
      return {
        behavior: "attention",
        title: "Attention Call",
        meaning: "Addressing another crow to get its attention.",
      };
    case "alarm_agonistic":
      return {
        behavior: "alarm_agonistic",
        title: "Alarm / Scolding",
        meaning: "Warning of a threat, or scolding and driving off an intruder or predator.",
      };
    case "begging_food":
      return {
        behavior: "begging_food",
        title: "Begging / Food Expectation",
        meaning: "Asking for food, or excited anticipation of a meal.",
      };
    case "juvenile_grunt":
      return {
        behavior: "juvenile_grunt",
        title: "Juvenile Grunts",
        meaning: "A fledgling's grunting and babbling.",
      };
    case "flight_call":
      return {
        behavior: "flight_call",
        title: "Flight Call",
        meaning: "A call given while flying.",
      };
    case "song_subsong":
      return {
        behavior: "song_subsong",
        title: "Quiet Song",
        meaning: "Soft, rambling vocalisation, usually given when relaxed.",
      };
    default:
      return {
        behavior: "unknown",
        title: "Crow Call",
        meaning: "A crow vocalisation the model could not place.",
      };
  }
}
