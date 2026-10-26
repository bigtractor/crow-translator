/// <reference lib="webworker" />
// ============================================================
// CrowTrans inference worker
// ============================================================
// Runs crow_behavior.tflite off the main thread.
//
// Why a worker: TFLiteModel.predict() is fully synchronous and takes ~300 ms
// per 3-second window on a desktop (seconds on a phone). On the main thread
// that blocked the ScriptProcessorNode audio callback, which has a real-time
// deadline, so buffers backed up and each catch-up pass triggered another
// inference. The page froze. In a worker, blocking is harmless.
//
// The CPU backend is used deliberately: TFLite runs on WASM regardless, so a
// WebGL input tensor only added a GPU upload and readback on every window.

import type { InferenceResult, BirdNETResult } from "@/types";
import {
  CROW_CONFIDENCE_THRESHOLD,
  FALLBACK_CROW_INDEX,
  findBehaviorIndices,
  findGateIndices,
  flatSigmoid,
  mapCrowLabelToBehavior,
} from "../lib/crow_labels";

/** 3 seconds at 48 kHz */
const EXPECTED_SAMPLES = 48000 * 3;

/** More saturated classes than this means the model returned garbage. */
const SATURATION_LIMIT = 25;

interface TFLiteModel {
  predict(inputs: import("@tensorflow/tfjs-core").Tensor): import("@tensorflow/tfjs-core").Tensor;
}

export type WorkerRequest =
  | { type: "init" }
  | { type: "infer"; id: number; samples: Float32Array };

export type WorkerResponse =
  | { type: "debug"; message: string }
  | { type: "progress"; progress: number; status: string }
  | { type: "ready"; backend: string; labelCount: number; gateLabels: string[] }
  | { type: "init-error"; message: string }
  | { type: "result"; id: number; result: InferenceResult }
  | { type: "infer-error"; id: number; message: string };

let tf: typeof import("@tensorflow/tfjs-core") | null = null;
let model: TFLiteModel | null = null;
let labels: string[] = [];
let gateIndices: number[] = [];
let behaviorIndices: number[] = [];
let crowIndex = FALLBACK_CROW_INDEX;
let initPromise: Promise<void> | null = null;

function post(msg: WorkerResponse) {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg);
}

/** One-time init diagnostics, surfaced on InferenceEngine.debugLog. */
function debug(message: string) {
  post({ type: "debug", message });
}

async function loadLabels() {
  const res = await fetch("/models/crow_behavior_labels.txt");
  if (!res.ok) throw new Error(`labels HTTP ${res.status}`);
  labels = (await res.text())
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  gateIndices = findGateIndices(labels);
  behaviorIndices = findBehaviorIndices(labels);

  if (gateIndices.length === 0) {
    gateIndices = [FALLBACK_CROW_INDEX];
  }
  crowIndex = gateIndices[0];
}

async function init() {
  post({ type: "progress", progress: 0.1, status: "Starting inference runtime…" });

  const core = await import("@tensorflow/tfjs-core");
  await import("@tensorflow/tfjs-backend-cpu");
  tf = core;
  await core.setBackend("cpu");
  await core.ready();

  post({ type: "progress", progress: 0.3, status: "Loading crow taxonomy…" });
  await loadLabels();

  post({ type: "progress", progress: 0.6, status: "Loading crow_behavior.tflite…" });

  // The package's ESM entry imports a file it does not ship in dist/, so the
  // self-contained UMD build is used instead.
  const tflite = await import("@tensorflow/tfjs-tflite/dist/tf-tflite.min.js");
  // Serve the TFLite WASM runtime from our own origin: COEP require-corp blocks
  // cross-origin assets that carry no CORP header.
  tflite.setWasmPath("/tflite/");

  // Force the SINGLE-THREADED runtime.
  //
  // The loader picks its .wasm by feature detection: simd + multiThreading ->
  // tflite_web_api_cc_simd_threaded.wasm. That multi-threaded build proxies
  // work to the browser's main thread, so the synchronous predict() call below
  // never returns when the module lives inside a Web Worker: predict() is
  // entered and the worker deadlocks. (Verified: the worker logged "input
  // tensor created" and then nothing.) Detection is based on WASM engine
  // support, not on cross-origin isolation, so dropping COOP/COEP does not
  // change it.
  //
  // getWasmFeatures() caches and returns one object that the loader reads
  // again when building the filename, so clearing multiThreading here selects
  // tflite_web_api_cc_simd.wasm instead.
  try {
    const features = await tflite.getWasmFeatures();
    features.multiThreading = false;
    debug(`wasm features after override: ${JSON.stringify(features)}`);
  } catch (err) {
    console.warn("[worker] could not override WASM features:", err);
  }

  model = (await tflite.loadTFLiteModel("/models/crow_behavior.tflite", {
    numThreads: 1,
  })) as unknown as TFLiteModel;

  debug(
    "runtime fetched: " +
      performance
        .getEntriesByType("resource")
        .map((e) => e.name)
        .filter((n) => n.includes("tflite_web_api"))
        .map((n) => n.split("/").pop())
        .join(", ")
  );

  post({
    type: "ready",
    backend: core.getBackend(),
    labelCount: labels.length,
    gateLabels: gateIndices.map((i) => labels[i] ?? `#${i}`),
  });
}

function runInference(samples: Float32Array): InferenceResult {
  const startTime = performance.now();
  const core = tf!;

  let padded = samples;
  if (padded.length !== EXPECTED_SAMPLES) {
    const buf = new Float32Array(EXPECTED_SAMPLES);
    buf.set(padded.subarray(0, Math.min(padded.length, EXPECTED_SAMPLES)));
    padded = buf;
  }

  const inputTensor = core.tensor2d(padded, [1, EXPECTED_SAMPLES], "float32");
  let outputTensor: import("@tensorflow/tfjs-core").Tensor | null = null;

  try {
    outputTensor = model!.predict(inputTensor);
    // Synchronous read is fine here: this is a worker, and the CPU backend
    // holds the data in memory already.
    const logits = outputTensor.dataSync() as Float32Array;

    if (labels.length > 0 && logits.length !== labels.length) {
      console.warn(
        `[worker] output length ${logits.length} != labels ${labels.length}; indices may be misaligned`
      );
    }

    // Guard against a saturated / invalid output (seen on the very first run
    // after load): a real window never has dozens of species above 0.99.
    let saturated = 0;
    for (let i = 0; i < logits.length && saturated <= SATURATION_LIMIT; i++) {
      if (logits[i] > 5) saturated++;
    }
    if (saturated > SATURATION_LIMIT) {
      console.warn(`[worker] discarding invalid frame: ${saturated}+ classes saturated`);
      return {
        timestamp: Date.now(),
        birdnet: {
          species: "Invalid frame (model output saturated)",
          confidence: 0,
          speciesIndex: crowIndex,
          isCrow: false,
        },
        behavior: null,
        behaviorConfidence: null,
        processingTimeMs: Math.round(performance.now() - startTime),
      };
    }

    // ---------------- STAGE 1: species gate (base BirdNET classes only) -----------
    let stage1Score = 0;
    let stage1Index = crowIndex;
    for (const idx of gateIndices) {
      if (idx < 0 || idx >= logits.length) continue;
      const p = flatSigmoid(logits[idx]);
      if (p > stage1Score) {
        stage1Score = p;
        stage1Index = idx;
      }
    }
    const isCrow = stage1Score >= CROW_CONFIDENCE_THRESHOLD;

    // Top base-model species overall, for diagnostics.
    let topBaseIdx = -1;
    let topBaseLogit = -Infinity;
    const baseCount = logits.length - behaviorIndices.length;
    for (let i = 0; i < baseCount; i++) {
      if (logits[i] > topBaseLogit) {
        topBaseLogit = logits[i];
        topBaseIdx = i;
      }
    }

    console.log(
      `Stage 1 (Corvus corone) confidence: ${stage1Score.toFixed(3)} ` +
        `[${labels[stage1Index] ?? stage1Index}] -> ${isCrow ? "PASS" : "DROP"}` +
        (topBaseIdx >= 0
          ? ` | top base species: ${labels[topBaseIdx] ?? topBaseIdx} (${flatSigmoid(topBaseLogit).toFixed(3)})`
          : "")
    );

    const birdnet: BirdNETResult = {
      species: isCrow ? labels[stage1Index] ?? "Corvus corone_Carrion Crow" : "Background / Non-Target",
      confidence: stage1Score,
      speciesIndex: stage1Index,
      isCrow,
      topSpecies: topBaseIdx >= 0 ? labels[topBaseIdx] : undefined,
      topSpeciesConfidence: topBaseIdx >= 0 ? flatSigmoid(topBaseLogit) : undefined,
    };

    // Gatekeeper: below threshold -> drop the frame, never run Stage 2.
    if (!isCrow) {
      return {
        timestamp: Date.now(),
        birdnet,
        behavior: null,
        behaviorConfidence: null,
        processingTimeMs: Math.round(performance.now() - startTime),
      };
    }

    // ---------------- STAGE 2: behavior (custom appended classes only) ------------
    let maxBehaviorProb = 0;
    let topBehaviorLabel = "";
    for (const idx of behaviorIndices) {
      if (idx < 0 || idx >= logits.length) continue;
      const p = flatSigmoid(logits[idx]);
      if (p > maxBehaviorProb) {
        maxBehaviorProb = p;
        topBehaviorLabel = labels[idx] || "";
      }
    }

    const labelToUse = topBehaviorLabel || "Corvus corone_general short vocalization";
    const { behavior, title, meaning } = mapCrowLabelToBehavior(labelToUse);

    console.log(`Stage 2 behavior: ${labelToUse} (${maxBehaviorProb.toFixed(3)}) -> ${title}`);

    return {
      timestamp: Date.now(),
      birdnet,
      behavior,
      behaviorConfidence: maxBehaviorProb,
      processingTimeMs: Math.round(performance.now() - startTime),
      rawLabel: labelToUse,
      customTitle: title,
      customMeaning: meaning,
    };
  } finally {
    core.dispose(inputTensor);
    if (outputTensor) core.dispose(outputTensor);
  }
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (msg.type === "init") {
    if (!initPromise) {
      initPromise = init().catch((err) => {
        post({ type: "init-error", message: err instanceof Error ? err.message : String(err) });
        throw err;
      });
    }
    try {
      await initPromise;
    } catch {
      /* already reported */
    }
    return;
  }

  if (msg.type === "infer") {
    if (!model || !tf) {
      post({ type: "infer-error", id: msg.id, message: "Model is not loaded" });
      return;
    }
    try {
      post({ type: "result", id: msg.id, result: runInference(msg.samples) });
    } catch (err) {
      post({
        type: "infer-error",
        id: msg.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
