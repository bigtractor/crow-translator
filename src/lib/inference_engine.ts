// ============================================================
// Real-Time Bioacoustic Inference Engine for Calcaine
// Model: /models/crow_behavior.tflite
// Labels: /models/crow_behavior_labels.txt (6,539 classes)
// ============================================================
// Input tensor: [1, 144000] float32 (3 seconds @ 48,000 Hz)
// Output tensor: [1, 6539] float32 RAW LOGITS (no sigmoid in the graph):
//   indices 0..6521    = BirdNET V2.4 base species (Corvus corone_Carrion Crow = 1579)
//   indices 6522..6538 = 17 custom "Corvus corone_<behavior>" classes (appended head)
// Stage 1 gate = sigmoid(base Carrion/Hooded Crow logit) >= CROW_CONFIDENCE_THRESHOLD.
// Stage 2 = argmax over the 17 custom classes, only when Stage 1 passes.
// Memory Leak Prevention: All tensors are strictly tracked and disposed
// via tf.dispose() after every single inference cycle.

import type {
  InferenceResult,
  BirdNETResult,
  CrowBehavior,
} from "@/types";

/** TFLite model interface */
interface TFLiteModel {
  predict(inputs: import("@tensorflow/tfjs").Tensor): import("@tensorflow/tfjs").Tensor;
}

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

/**
 * BirdNET's output layer has no activation: values are logits. BirdNET-Analyzer
 * applies flat_sigmoid(x, sensitivity=1) = 1 / (1 + exp(-clip(x, -15, 15))).
 */
export function flatSigmoid(logit: number, sensitivity = 1.0): number {
  const x = Math.max(-15, Math.min(15, logit));
  return 1 / (1 + Math.exp(-sensitivity * x));
}

/** Expected input shape: 3 seconds at 48kHz = 144,000 samples */
const EXPECTED_SAMPLES = 48000 * 3; // 144,000

/**
 * Maps the real model's specific Corvus corone behavior label
 * to canonical CrowBehavior, human title, and biological meaning.
 */
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

export class InferenceEngine {
  private behaviorModel: TFLiteModel | null = null;
  private tf: typeof import("@tensorflow/tfjs") | null = null;
  private speciesLabels: string[] = [];
  private crowSpeciesIndex: number = -1;
  /** All base-model indices accepted by the Stage 1 gate (see GATE_SPECIES_PREFIXES) */
  private gateIndices: number[] = [];
  private behaviorIndices: number[] = [];
  private isWasmLoaded: boolean = false;
  private activeBackend: string = "uninitialized";

  /** Whether models or engine is ready */
  get isReady(): boolean {
    return this.tf !== null;
  }

  get usingTflite(): boolean {
    return this.behaviorModel !== null;
  }

  get backend(): string {
    return this.activeBackend;
  }

  /**
   * Initialize TensorFlow.js and load crow_behavior.tflite with crow_behavior_labels.txt
   * @param onProgress - Progress callback (0.0 to 1.0)
   */
  async initialize(onProgress?: (progress: number, status: string) => void): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      onProgress?.(0.1, "Initializing TensorFlow.js WebGL/WASM runtime...");

      // 1. Dynamically import TensorFlow.js (browser client-side only)
      const tf = await import("@tensorflow/tfjs");
      this.tf = tf;

      try {
        await tf.setBackend("webgl");
        await tf.ready();
        this.activeBackend = tf.getBackend();
      } catch {
        await tf.setBackend("cpu");
        await tf.ready();
        this.activeBackend = "cpu";
      }

      onProgress?.(0.3, `Backend ready: ${this.activeBackend}. Loading crow taxonomy...`);

      // 2. Fetch real crow behavior labels
      try {
        const labelsResponse = await fetch("/models/crow_behavior_labels.txt");
        if (labelsResponse.ok) {
          const labelsText = await labelsResponse.text();
          this.speciesLabels = labelsText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

          // Stage 1 gate species: base-model Carrion Crow (line 1580, index 1579)
          // plus Hooded Crow. Prefix match so "Corvus corone_Carrion Crow" is found
          // regardless of case.
          this.gateIndices = [];
          for (const prefix of GATE_SPECIES_PREFIXES) {
            const idx = this.speciesLabels.findIndex((l) =>
              l.toLowerCase().startsWith(prefix)
            );
            if (idx !== -1) this.gateIndices.push(idx);
          }
          this.crowSpeciesIndex = this.gateIndices[0] ?? -1;

          // Stage 2 classes: every "Corvus corone_<behavior>" label that is NOT the
          // base species entry (these are the 17 appended custom classes, 6522..6538).
          this.behaviorIndices = [];
          this.speciesLabels.forEach((label, idx) => {
            const lower = label.toLowerCase();
            if (
              lower.startsWith("corvus corone_") &&
              !lower.startsWith("corvus corone_carrion crow")
            ) {
              this.behaviorIndices.push(idx);
            }
          });

          console.log(
            `[InferenceEngine] labels=${this.speciesLabels.length} ` +
              `gateIndices=${JSON.stringify(this.gateIndices)} ` +
              `(${this.gateIndices.map((i) => this.speciesLabels[i]).join(" | ")}) ` +
              `behaviorClasses=${this.behaviorIndices.length}`
          );
        }
      } catch (err) {
        console.warn("Could not load /models/crow_behavior_labels.txt:", err);
      }

      if (this.gateIndices.length === 0) {
        // Hard fallback to the known BirdNET V2.4 index of Corvus corone_Carrion Crow
        this.crowSpeciesIndex = 1579;
        this.gateIndices = [1579];
      }

      onProgress?.(0.6, "Loading real TFLite model: crow_behavior.tflite...");

      // 3. Load crow_behavior.tflite via WebAssembly
      try {
        // A real dynamic import so webpack bundles the package. (The previous
        // `new Function('return import(...)')` ran a native browser import of a
        // bare specifier, which always failed, so the model never loaded and the
        // app silently ran the DSP heuristic instead.) The UMD build is used
        // because the package's ESM entry references a file it does not ship.
        const tflite = await import("@tensorflow/tfjs-tflite/dist/tf-tflite.min.js");
        // Serve the TFLite WASM runtime from our own origin (COEP: require-corp
        // blocks cross-origin assets without CORP headers).
        tflite.setWasmPath("/tflite/");
        this.isWasmLoaded = true;

        this.behaviorModel = (await tflite.loadTFLiteModel(
          "/models/crow_behavior.tflite"
        )) as unknown as TFLiteModel;

        // NOTE: do not run a warm-up inference here. The threaded WASM runtime
        // deadlocks the main thread if invoked before its worker pool is up
        // ("Blocking on the main thread is very dangerous"). The first real
        // window arrives >= 3 s after the user starts the microphone, and
        // runTflitePipeline discards any saturated (garbage) frame anyway.

        onProgress?.(1.0, "Real Model Loaded (crow_behavior.tflite)");
      } catch (tfliteErr) {
        console.warn("TFLite load notice, active via client DSP:", tfliteErr);
        onProgress?.(1.0, "Online (Client Bioacoustic DSP)");
      }
    } catch (error) {
      console.error("Inference Engine initialization encountered error:", error);
      this.activeBackend = "dsp-client";
      onProgress?.(1.0, "Online (Client Bioacoustic DSP Mode)");
    }
  }

  /**
   * Run inference pipeline on a 3-second audio segment.
   * @param audioSamples - Float32Array PCM samples at 48kHz (length: 144,000)
   */
  async runInference(audioSamples: Float32Array): Promise<InferenceResult> {
    const startTime = performance.now();
    const tf = this.tf;

    // Ensure exact 144,000 samples (3s @ 48kHz)
    let samples = audioSamples;
    if (samples.length !== EXPECTED_SAMPLES) {
      const padded = new Float32Array(EXPECTED_SAMPLES);
      padded.set(samples.subarray(0, Math.min(samples.length, EXPECTED_SAMPLES)));
      samples = padded;
    }

    // If real compiled TFLite model is available, execute WebAssembly inference
    if (tf && this.behaviorModel) {
      return this.runTflitePipeline(samples, startTime);
    }

    // Otherwise execute client-side Mel-DSP Bioacoustic classifier
    return this.runBioacousticDspInference(samples, startTime);
  }

  /**
   * Execute real crow_behavior.tflite pipeline
   * Model takes raw audio [1, 144000] and outputs [1, 6539] probabilities.
   */
  private async runTflitePipeline(
    samples: Float32Array,
    startTime: number
  ): Promise<InferenceResult> {
    const tf = this.tf!;
    let inputTensor: import("@tensorflow/tfjs").Tensor | null = null;
    let outputTensor: import("@tensorflow/tfjs").Tensor | null = null;

    try {
      // 1. Create input tensor shape [1, 144000] float32 directly from samples
      inputTensor = tf.tensor2d(samples, [1, EXPECTED_SAMPLES], "float32");

      // 2. Predict using crow_behavior.tflite
      outputTensor = this.behaviorModel!.predict(inputTensor);
      const probs = (await outputTensor.data()) as Float32Array;

      // probs holds RAW LOGITS from the concat of [base 6522 | custom 17].
      const logits = probs;
      if (this.speciesLabels.length > 0 && logits.length !== this.speciesLabels.length) {
        console.warn(
          `[InferenceEngine] output length ${logits.length} != labels ${this.speciesLabels.length}; label indices may be misaligned`
        );
      }

      // Sanity guard against a saturated / invalid output (seen on the very first
      // run after load): a real window never has dozens of species above 0.99.
      let saturated = 0;
      for (let i = 0; i < logits.length; i++) {
        if (logits[i] > 5) saturated++;
        if (saturated > 25) break;
      }
      if (saturated > 25) {
        console.warn(`[InferenceEngine] discarding invalid frame: ${saturated}+ classes saturated`);
        return {
          timestamp: Date.now(),
          birdnet: {
            species: "Invalid frame (model output saturated)",
            confidence: 0,
            speciesIndex: this.crowSpeciesIndex,
            isCrow: false,
          },
          behavior: null,
          behaviorConfidence: null,
          processingTimeMs: Math.round(performance.now() - startTime),
        };
      }

      // ---------------- STAGE 1: species gate (base BirdNET classes only) --------------
      let stage1Score = 0;
      let stage1Index = this.crowSpeciesIndex;
      for (const idx of this.gateIndices) {
        if (idx < 0 || idx >= logits.length) continue;
        const p = flatSigmoid(logits[idx]);
        if (p > stage1Score) {
          stage1Score = p;
          stage1Index = idx;
        }
      }
      const isCrow = stage1Score >= CROW_CONFIDENCE_THRESHOLD;

      // Top base-model species overall, for diagnostics (what did BirdNET think it was?)
      let topBaseIdx = -1;
      let topBaseLogit = -Infinity;
      const baseCount = logits.length - this.behaviorIndices.length;
      for (let i = 0; i < baseCount; i++) {
        if (logits[i] > topBaseLogit) {
          topBaseLogit = logits[i];
          topBaseIdx = i;
        }
      }

      console.log(
        `Stage 1 (Corvus corone) confidence: ${stage1Score.toFixed(3)} ` +
          `[${this.speciesLabels[stage1Index] ?? stage1Index}] -> ${isCrow ? "PASS" : "DROP"}` +
          (topBaseIdx >= 0
            ? ` | top base species: ${this.speciesLabels[topBaseIdx] ?? topBaseIdx} (${flatSigmoid(topBaseLogit).toFixed(3)})`
            : "")
      );

      const birdnetResult: BirdNETResult = {
        species: isCrow
          ? this.speciesLabels[stage1Index] ?? "Corvus corone_Carrion Crow"
          : "Background / Non-Target",
        confidence: stage1Score,
        speciesIndex: stage1Index,
        isCrow,
        topSpecies: topBaseIdx >= 0 ? this.speciesLabels[topBaseIdx] : undefined,
        topSpeciesConfidence: topBaseIdx >= 0 ? flatSigmoid(topBaseLogit) : undefined,
      };

      // Gatekeeper: below threshold -> drop the frame, never run Stage 2.
      if (!isCrow) {
        return {
          timestamp: Date.now(),
          birdnet: birdnetResult,
          behavior: null,
          behaviorConfidence: null,
          processingTimeMs: Math.round(performance.now() - startTime),
        };
      }

      // ---------------- STAGE 2: behavior (custom appended classes only) --------------
      let maxBehaviorProb = 0;
      let topBehaviorLabel = "";
      for (const idx of this.behaviorIndices) {
        if (idx < 0 || idx >= logits.length) continue;
        const p = flatSigmoid(logits[idx]);
        if (p > maxBehaviorProb) {
          maxBehaviorProb = p;
          topBehaviorLabel = this.speciesLabels[idx] || "";
        }
      }

      const labelToUse =
        topBehaviorLabel || "Corvus corone_general short vocalization";
      const { behavior, title, meaning } = mapCrowLabelToBehavior(labelToUse);

      console.log(
        `Stage 2 behavior: ${labelToUse} (${maxBehaviorProb.toFixed(3)}) -> ${title}`
      );

      return {
        timestamp: Date.now(),
        birdnet: birdnetResult,
        behavior,
        behaviorConfidence: maxBehaviorProb,
        processingTimeMs: Math.round(performance.now() - startTime),
        rawLabel: labelToUse,
        customTitle: title,
        customMeaning: meaning,
      };
    } catch (err) {
      console.warn("TFLite predict error, falling back to bioacoustic DSP:", err);
      return this.runBioacousticDspInference(samples, startTime);
    } finally {
      // CRITICAL: Explicitly dispose all tensors to avoid iOS Safari memory leaks
      if (inputTensor) tf.dispose(inputTensor);
      if (outputTensor) tf.dispose(outputTensor);
    }
  }

  /**
   * Real-time Bioacoustic DSP Feature Extraction & Heuristic Classifier:
   * Graceful fallback when WebAssembly is unsupported, analyzing waveform
   * dynamics and mapping to the real model's behavioral taxonomy.
   */
  private runBioacousticDspInference(
    samples: Float32Array,
    startTime: number
  ): InferenceResult {
    const N = samples.length;

    // 1. Calculate RMS energy
    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < N; i++) {
      const absVal = Math.abs(samples[i]);
      if (absVal > peak) peak = absVal;
      sumSq += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSq / N);

    // 2. Zero-crossing rate
    let zeroCrossings = 0;
    for (let i = 1; i < N; i++) {
      if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const approxFreqHz = (zeroCrossings / 2) / 3;

    // 3. Energy bursts
    const windowSize = 4800; // 100ms
    const numWindows = Math.floor(N / windowSize);
    let burstCount = 0;
    let inBurst = false;
    const threshold = rms * 1.6;

    for (let w = 0; w < numWindows; w++) {
      let winSum = 0;
      const offset = w * windowSize;
      for (let i = 0; i < windowSize; i++) {
        winSum += Math.abs(samples[offset + i]);
      }
      const winRms = winSum / windowSize;

      if (winRms > threshold && !inBurst) {
        burstCount++;
        inBurst = true;
      } else if (winRms <= threshold * 0.7) {
        inBurst = false;
      }
    }

    // === GATEKEEPER EVALUATION ===
    // If background silence or noise (RMS < 0.012 or peak < 0.03)
    if (rms < 0.012 || peak < 0.03) {
      return {
        timestamp: Date.now(),
        birdnet: {
          species: "Background / Ambient Noise",
          confidence: 0.12 + Math.random() * 0.18,
          speciesIndex: 0,
          isCrow: false,
        },
        behavior: null,
        behaviorConfidence: null,
        processingTimeMs: Math.round(performance.now() - startTime),
      };
    }

    // Check corvid acoustic profile
    const isCorvidAcousticProfile =
      (approxFreqHz >= 950 && approxFreqHz <= 4200) || burstCount >= 1;

    if (!isCorvidAcousticProfile) {
      return {
        timestamp: Date.now(),
        birdnet: {
          species: "Ambient / Non-Target",
          confidence: 0.42,
          speciesIndex: 12,
          isCrow: false,
        },
        behavior: null,
        behaviorConfidence: null,
        processingTimeMs: Math.round(performance.now() - startTime),
      };
    }

    // Heuristic only: the real model is NOT loaded. Never report this as a crow.
    const crowConfidence = Math.min(
      0.98,
      0.74 + (peak > 0.15 ? 0.16 : 0.06) + Math.random() * 0.08
    );
    console.warn(
      "[InferenceEngine] crow_behavior.tflite not loaded; DSP heuristic matched a burst but is NOT a crow detection."
    );

    let rawLabel = "Corvus corone_general short vocalization";
    let behaviorConfidence = 0.82;

    if (burstCount >= 4) {
      rawLabel = "Corvus corone_there is danger nearby";
      behaviorConfidence = 0.92;
    } else if (burstCount === 3) {
      rawLabel = "Corvus corone_harass this predator";
      behaviorConfidence = 0.88;
    } else if (burstCount === 2) {
      rawLabel = "Corvus corone_back off";
      behaviorConfidence = 0.86;
    } else if (burstCount === 1) {
      rawLabel = "Corvus corone_I am here";
      behaviorConfidence = 0.85;
    } else {
      rawLabel = "Corvus corone_calling together with partner";
      behaviorConfidence = 0.80;
    }

    const { title, meaning } = mapCrowLabelToBehavior(rawLabel);
    void behaviorConfidence;

    return {
      timestamp: Date.now(),
      birdnet: {
        species: "SIMULATED (model not loaded) / burst heuristic",
        confidence: Math.round(crowConfidence * 100) / 100,
        speciesIndex: this.crowSpeciesIndex,
        isCrow: false,
      },
      behavior: null,
      behaviorConfidence: null,
      processingTimeMs: Math.round(performance.now() - startTime),
      rawLabel,
      customTitle: title + " (simulated)",
      customMeaning: meaning,
      simulated: true,
    };
  }

  dispose(): void {
    this.behaviorModel = null;
    this.tf = null;
  }
}

// Singleton inference engine
let engineInstance: InferenceEngine | null = null;

export function getInferenceEngine(): InferenceEngine {
  if (!engineInstance) {
    engineInstance = new InferenceEngine();
  }
  return engineInstance;
}
