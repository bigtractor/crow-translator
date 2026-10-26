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

/** Human-readable labels for behaviors */
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
