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

/** Does this 3-second window contain a crow call? */
export interface CrowDetection {
  /** True when the strongest class reached the presence threshold */
  isCrow: boolean;
  /** Probability of the strongest class, 0-1 (shown even when it falls short) */
  score: number;
}

/** What the crow call is doing: the model's 7 behaviour classes */
export type CrowBehavior =
  | "contact_social"
  | "attention"
  | "alarm_agonistic"
  | "begging_food"
  | "juvenile_grunt"
  | "flight_call"
  | "song_subsong"
  | "unknown";

/** Clean consumer titles for behaviors */
export const BEHAVIOR_TITLES: Record<CrowBehavior, string> = {
  contact_social: "Contact / Social Call",
  attention: "Attention Call",
  alarm_agonistic: "Alarm / Scolding",
  begging_food: "Begging / Food Expectation",
  juvenile_grunt: "Juvenile Grunts",
  flight_call: "Flight Call",
  song_subsong: "Quiet Song",
  unknown: "Crow Call",
};

/** Plain-English readings of what each call is doing (function, not emotion) */
export const BEHAVIOR_MEANINGS: Record<CrowBehavior, string> = {
  contact_social: "Staying in touch with a partner or group.",
  attention: "Addressing another crow to get its attention.",
  alarm_agonistic: "Warning of a threat, or scolding an intruder or predator.",
  begging_food: "Asking for food, or anticipating a meal.",
  juvenile_grunt: "A fledgling's grunting and babbling.",
  flight_call: "A call given while flying.",
  song_subsong: "Soft, rambling vocalisation, usually given when relaxed.",
  unknown: "A crow vocalisation the model could not place.",
};

/** Result of analysing one 3-second window */
export interface InferenceResult {
  /** Timestamp of detection */
  timestamp: number;
  /** Is a crow call present, and how strongly */
  detection: CrowDetection;
  /** Behavior classification (null if no crow call) */
  behavior: CrowBehavior | null;
  /** Probability of the winning behaviour class */
  behaviorConfidence: number | null;
  /** Processing time in ms */
  processingTimeMs: number;
  /** Model class name, e.g. "alarm_agonistic" */
  rawLabel?: string;
  /** Human title for the class */
  customTitle?: string;
  /** Human reading of the class */
  customMeaning?: string;
  /**
   * Every behaviour class for this window, highest first, including windows
   * that did not reach the presence threshold. Makes near-ties visible.
   */
  behaviorTop?: Array<{ label: string; p: number }>;
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
  /** Model class name (e.g. alarm_agonistic) */
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
