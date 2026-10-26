// ============================================================
// Type definitions for the Crow Translator application
// ============================================================

/** Raw audio segment ready for processing */
export interface AudioSegment {
  /** Float32 PCM samples at 48kHz */
  samples: Float32Array;
  /** Timestamp when capture started */
  timestamp: number;
  /** Duration in milliseconds */
  durationMs: number;
}

/** Result from BirdNET Stage 1 inference */
export interface BirdNETResult {
  /** Species label from BirdNET */
  species: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Index in the output array */
  speciesIndex: number;
  /** Whether this was identified as Corvus corone */
  isCrow: boolean;
  /** Highest-scoring base BirdNET species in this frame (diagnostic) */
  topSpecies?: string;
  /** Sigmoid confidence of topSpecies (diagnostic) */
  topSpeciesConfidence?: number;
}

/** Behavioral classification from Stage 2 */
export type CrowBehavior =
  | "alarm_distress"
  | "territorial_call"
  | "contact_call"
  | "food_announcement"
  | "mobbing_call"
  | "juvenile_begging"
  | "roosting_call"
  | "unknown";

/** Clean consumer titles for behaviors */
export const BEHAVIOR_TITLES: Record<CrowBehavior, string> = {
  alarm_distress: "Alarm / Distress Cry",
  territorial_call: "Territorial Declaration",
  contact_call: "Social Contact Call",
  food_announcement: "Food Announcement",
  mobbing_call: "Mobbing Call",
  juvenile_begging: "Juvenile Begging",
  roosting_call: "Dusk Roosting Call",
  unknown: "Crow Vocalization",
};

/** Plain-English biological interpretations of what the crow is expressing */
export const BEHAVIOR_MEANINGS: Record<CrowBehavior, string> = {
  alarm_distress: "Warning flock members of an immediate ground or airborne threat.",
  territorial_call: "Declaring boundary sovereignty from a prominent canopy perch.",
  contact_call: "Maintaining acoustic location and coordination with flock or mate.",
  food_announcement: "Signaling discovered food bonanza to bonded family units.",
  mobbing_call: "Rallying nearby crows to harass and drive away a raptor or predator.",
  juvenile_begging: "Fledgling soliciting feeding attention from adult parents.",
  roosting_call: "Evening aggregation call coordinating twilight roosting flights.",
  unknown: "Recognized Corvus corone acoustic sequence with complex acoustic patterning.",
};

/** Theme styling for badges and cards */
export const BEHAVIOR_THEMES: Record<
  CrowBehavior,
  {
    badgeBg: string;
    badgeText: string;
    border: string;
    glow: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  alarm_distress: {
    badgeBg: "bg-red-500/10",
    badgeText: "text-red-400",
    border: "border-red-500/30",
    glow: "shadow-red-500/10",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
  },
  mobbing_call: {
    badgeBg: "bg-orange-500/10",
    badgeText: "text-orange-400",
    border: "border-orange-500/30",
    glow: "shadow-orange-500/10",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-400",
  },
  territorial_call: {
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/10",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
  },
  food_announcement: {
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/10",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
  },
  contact_call: {
    badgeBg: "bg-cyan-500/10",
    badgeText: "text-cyan-400",
    border: "border-cyan-500/30",
    glow: "shadow-cyan-500/10",
    iconBg: "bg-cyan-500/15",
    iconColor: "text-cyan-400",
  },
  juvenile_begging: {
    badgeBg: "bg-pink-500/10",
    badgeText: "text-pink-400",
    border: "border-pink-500/30",
    glow: "shadow-pink-500/10",
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-400",
  },
  roosting_call: {
    badgeBg: "bg-indigo-500/10",
    badgeText: "text-indigo-400",
    border: "border-indigo-500/30",
    glow: "shadow-indigo-500/10",
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-400",
  },
  unknown: {
    badgeBg: "bg-zinc-500/10",
    badgeText: "text-zinc-400",
    border: "border-zinc-500/30",
    glow: "shadow-zinc-500/10",
    iconBg: "bg-zinc-500/15",
    iconColor: "text-zinc-400",
  },
};

/** Human-readable labels for behaviors (backward compatibility) */
export const BEHAVIOR_LABELS: Record<CrowBehavior, string> = {
  alarm_distress: "⚠️ Alarm / Distress Cry",
  territorial_call: "🏴 Territorial Declaration",
  contact_call: "📡 Contact Call",
  food_announcement: "🍖 Food Announcement",
  mobbing_call: "🦅 Mobbing Call",
  juvenile_begging: "🐣 Juvenile Begging",
  roosting_call: "🌙 Roosting Call",
  unknown: "❓ Unknown Vocalization",
};

/** Emoji icons mapped to behaviors */
export const BEHAVIOR_ICONS: Record<CrowBehavior, string> = {
  alarm_distress: "⚠️",
  territorial_call: "🏴",
  contact_call: "📡",
  food_announcement: "🍖",
  mobbing_call: "🦅",
  juvenile_begging: "🐣",
  roosting_call: "🌙",
  unknown: "❓",
};

/** Color classes for behaviors */
export const BEHAVIOR_COLORS: Record<CrowBehavior, string> = {
  alarm_distress: "text-red-400",
  territorial_call: "text-amber-400",
  contact_call: "text-cyan-400",
  food_announcement: "text-green-400",
  mobbing_call: "text-orange-400",
  juvenile_begging: "text-pink-400",
  roosting_call: "text-indigo-400",
  unknown: "text-gray-400",
};

/** Result from the complete two-stage inference pipeline */
export interface InferenceResult {
  /** Timestamp of detection */
  timestamp: number;
  /** Stage 1: BirdNET result */
  birdnet: BirdNETResult;
  /** Stage 2: Behavior classification (null if not a crow) */
  behavior: CrowBehavior | null;
  /** Behavior confidence score */
  behaviorConfidence: number | null;
  /** Processing time in ms */
  processingTimeMs: number;
  /** Real model raw label name (e.g. Corvus corone_there is danger nearby) */
  rawLabel?: string;
  /** Custom human title from real model */
  customTitle?: string;
  /** Custom human biological meaning */
  customMeaning?: string;
  /** True when produced by the DSP heuristic fallback, not the TFLite model */
  simulated?: boolean;
}

/** A debounced event in the live feed */
export interface TranslationEvent {
  /** Unique event ID */
  id: string;
  /** Behavior classification */
  behavior: CrowBehavior;
  /** Confidence score */
  confidence: number;
  /** When the event started */
  startTime: number;
  /** When the event last updated */
  lastUpdateTime: number;
  /** Number of consecutive detections */
  consecutiveCount: number;
  /** Duration in seconds */
  durationSec: number;
  /** Whether the event is still active */
  active: boolean;
  /** Real model raw label name (e.g. Corvus corone_there is danger nearby) */
  rawLabel?: string;
  /** Custom human title from real model */
  customTitle?: string;
  /** Custom human biological meaning */
  customMeaning?: string;
}

/** Application state */
export type AppState =
  | "idle"
  | "requesting_permission"
  | "loading_models"
  | "listening"
  | "processing"
  | "error";

/** Audio capture state */
export interface AudioCaptureState {
  isCapturing: boolean;
  sampleRate: number;
  error: string | null;
}

/** Model loading state */
export interface ModelState {
  birdnetLoaded: boolean;
  behaviorLoaded: boolean;
  loading: boolean;
  error: string | null;
  progress: number;
}
