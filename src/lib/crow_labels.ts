// ============================================================
// Shared Corvus corone label logic
// ============================================================
// Pure functions with no DOM or TensorFlow dependency, so the UI thread and
// the inference worker both use exactly one copy of the gate rules.
//
// crow_behavior_labels.txt has 6,539 lines matching the model output:
//   0..6521    BirdNET V2.4 base species (Corvus corone_Carrion Crow = 1579)
//   6522..6538 the 17 custom "Corvus corone_<behavior>" classes

import type { CrowBehavior } from "@/types";

/** Confidence threshold for crow detection (Stage 1 gatekeeper) */
export const CROW_CONFIDENCE_THRESHOLD = 0.70;

/**
 * Base-model species that count as "a crow" for the Stage 1 gate.
 * Carrion Crow and Hooded Crow are one superspecies with near-identical calls,
 * and BirdNET frequently splits its confidence between the two, so both are
 * accepted. Matched as case-insensitive prefixes against the label list.
 */
export const GATE_SPECIES_PREFIXES = [
  "corvus corone_carrion crow",
  "corvus cornix_hooded crow",
];

/** Known BirdNET V2.4 index of Corvus corone_Carrion Crow, used only as a fallback */
export const FALLBACK_CROW_INDEX = 1579;

/**
 * BirdNET's output layer has no activation: values are logits. BirdNET-Analyzer
 * applies flat_sigmoid(x, sensitivity=1) = 1 / (1 + exp(-clip(x, -15, 15))).
 */
export function flatSigmoid(logit: number, sensitivity = 1.0): number {
  const x = Math.max(-15, Math.min(15, logit));
  return 1 / (1 + Math.exp(-sensitivity * x));
}

/** Base-model indices accepted by the Stage 1 gate. */
export function findGateIndices(labels: string[]): number[] {
  const found: number[] = [];
  for (const prefix of GATE_SPECIES_PREFIXES) {
    const idx = labels.findIndex((l) => l.toLowerCase().startsWith(prefix));
    if (idx !== -1) found.push(idx);
  }
  return found;
}

/**
 * The 17 appended custom classes: every "Corvus corone_<behavior>" label that
 * is NOT the base species entry.
 */
export function findBehaviorIndices(labels: string[]): number[] {
  const found: number[] = [];
  labels.forEach((label, idx) => {
    const lower = label.toLowerCase();
    if (
      lower.startsWith("corvus corone_") &&
      !lower.startsWith("corvus corone_carrion crow")
    ) {
      found.push(idx);
    }
  });
  return found;
}

export function mapCrowLabelToBehavior(label: string): {
  behavior: CrowBehavior;
  title: string;
  meaning: string;
} {
  const clean = label.replace(/^Corvus corone_\s*/, "").trim().toLowerCase();

  if (clean.includes("danger nearby")) {
    return {
      behavior: "alarm_distress",
      title: "Danger Nearby Alert",
      meaning: "Warning flock members and fledglings of an imminent predator threat.",
    };
  }
  if (clean.includes("in trouble")) {
    return {
      behavior: "alarm_distress",
      title: "Distress / Threat Cry",
      meaning: "High-urgency distress vocalization indicating direct peril or entrapment.",
    };
  }
  if (clean.includes("harass this predator")) {
    return {
      behavior: "mobbing_call",
      title: "Mobbing Call",
      meaning: "Rallying communal flock to swarm, dive-bomb, and drive off a predator.",
    };
  }
  if (clean.includes("back off")) {
    return {
      behavior: "territorial_call",
      title: "Territorial Warning (Back Off)",
      meaning: "Vigorously defending canopy territory against intruding strange crows.",
    };
  }
  if (clean.includes("feed me")) {
    return {
      behavior: "juvenile_begging",
      title: "Juvenile Begging Call",
      meaning: "Fledgling crow vigorously soliciting food delivery from adult parents.",
    };
  }
  if (clean.includes("settling for the night")) {
    return {
      behavior: "roosting_call",
      title: "Dusk Roosting Call",
      meaning: "Evening aggregation call coordinating twilight flight to the communal roost.",
    };
  }
  if (clean.includes("calling together with partner")) {
    return {
      behavior: "contact_call",
      title: "Pair-Bond Duet",
      meaning: "Affirming acoustic pair-bond coordination with mated partner.",
    };
  }
  if (clean.includes("i am here")) {
    return {
      behavior: "contact_call",
      title: "Location Call (I Am Here)",
      meaning: "Acoustic positioning beacon maintaining contact across dense foliage.",
    };
  }
  if (clean.includes("flying overhead")) {
    return {
      behavior: "contact_call",
      title: "Flight Contact Call",
      meaning: "High-altitude movement call announcing active flight transit.",
    };
  }
  if (clean.includes("complex rattling phrase")) {
    return {
      behavior: "contact_call",
      title: "Complex Rattle Display",
      meaning: "Intricate guttural throat rattle delivered during close social interaction.",
    };
  }
  if (clean.includes("general short vocalization")) {
    return {
      behavior: "contact_call",
      title: "Short Caw / Vocalization",
      meaning: "Everyday conversational caw indicating ambient environmental awareness.",
    };
  }
  if (clean.includes("singing")) {
    return {
      behavior: "contact_call",
      title: "Crow Sub-Song",
      meaning: "Quiet, melodious solo vocalization delivered during relaxed solitary perching.",
    };
  }
  if (clean.includes("imitating other sounds")) {
    return {
      behavior: "unknown",
      title: "Vocal Mimicry",
      meaning: "Sophisticated imitation of external acoustic sounds or human speech.",
    };
  }
  if (clean.includes("sound of wings in flight")) {
    return {
      behavior: "contact_call",
      title: "Wingbeat Acoustic Sound",
      meaning: "Audible wing rustle and mechanical aerodynamic whistle during takeoff.",
    };
  }
  if (clean.includes("non vocal mechanical")) {
    return {
      behavior: "unknown",
      title: "Mechanical / Bill Snapping",
      meaning: "Non-vocal acoustic sound generated by bill clicking or branch drumming.",
    };
  }
  if (clean.includes("strange or aberrant")) {
    return {
      behavior: "unknown",
      title: "Anomalous Vocalization",
      meaning: "Atypical acoustic sequence recorded in Carrion Crow field repertoires.",
    };
  }
  if (clean.includes("food")) {
    return {
      behavior: "food_announcement",
      title: "Food Announcement",
      meaning: "Signaling discovered food bonanza to bonded family units.",
    };
  }

  // Fallback
  return {
    behavior: "contact_call",
    title: "Carrion Crow Call",
    meaning: "Recognized Corvus corone communication vocalization.",
  };
}
