/// <reference lib="webworker" />
// ============================================================
// CrowTrans inference worker
// ============================================================
// Runs crowtrans_v2.tflite off the main thread.
//
// Why a worker: TFLiteModel.predict() is fully synchronous and takes ~300 ms
// per 3-second window on a desktop (seconds on a phone). On the main thread
// that blocked the ScriptProcessorNode audio callback, which has a real-time
// deadline, so buffers backed up and each catch-up pass triggered another
// inference. The page froze. In a worker, blocking is harmless.
//
// The CPU backend is used deliberately: TFLite runs on WASM regardless, so a
// WebGL input tensor only added a GPU upload and readback on every window.

import type { InferenceResult } from "@/types";
import {
  LABELS_URL,
  MODEL_URL,
  CROW_PRESENCE_THRESHOLD,
  decide,
  flatSigmoid,
  mapClassToBehavior,
} from "../lib/crow_labels";

/** 3 seconds at 48 kHz */
const EXPECTED_SAMPLES = 48000 * 3;

/**
 * The very first run after load can return garbage in which most classes sit
 * near 1.0. Seven real classes are never that unanimous, so discard it.
 */
const SATURATED_P = 0.99;
const SATURATED_COUNT = 4;

interface TFLiteModel {
  predict(inputs: import("@tensorflow/tfjs-core").Tensor): import("@tensorflow/tfjs-core").Tensor;
}

export type WorkerRequest =
  | { type: "init" }
  | { type: "infer"; id: number; samples: Float32Array };

export type WorkerResponse =
  | { type: "debug"; message: string }
  | { type: "progress"; progress: number; status: string }
  | { type: "ready"; backend: string; classes: string[] }
  | { type: "init-error"; message: string }
  | { type: "result"; id: number; result: InferenceResult }
  | { type: "infer-error"; id: number; message: string };

let tf: typeof import("@tensorflow/tfjs-core") | null = null;
let model: TFLiteModel | null = null;
let labels: string[] = [];
let initPromise: Promise<void> | null = null;

function post(msg: WorkerResponse) {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg);
}

/** One-time init diagnostics, surfaced on InferenceEngine.debugLog. */
function debug(message: string) {
  post({ type: "debug", message });
}

async function loadLabels() {
  const res = await fetch(LABELS_URL);
  if (!res.ok) throw new Error(`labels HTTP ${res.status}`);
  labels = (await res.text())
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (labels.length === 0) throw new Error("labels file is empty");
}

async function init() {
  post({ type: "progress", progress: 0.1, status: "Starting inference runtime…" });

  const core = await import("@tensorflow/tfjs-core");
  await import("@tensorflow/tfjs-backend-cpu");
  tf = core;
  await core.setBackend("cpu");
  await core.ready();

  post({ type: "progress", progress: 0.3, status: "Loading call classes…" });
  await loadLabels();

  post({ type: "progress", progress: 0.6, status: "Loading CrowTrans model…" });

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
  // entered and the worker deadlocks. Detection is based on WASM engine
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

  model = (await tflite.loadTFLiteModel(MODEL_URL, {
    numThreads: 1,
  })) as unknown as TFLiteModel;

  // Warm-up. The first predict() after load returns a zero-filled tensor (every
  // logit exactly 0, i.e. 50% for all classes). Burn it on silence now so the
  // first real window is valid.
  const warmIn = core.zeros([1, EXPECTED_SAMPLES], "float32");
  const warmOut = model.predict(warmIn);
  warmOut.dataSync();
  core.dispose(warmIn);
  core.dispose(warmOut);

  post({ type: "ready", backend: core.getBackend(), classes: labels });
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

    if (logits.length !== labels.length) {
      throw new Error(
        `model returned ${logits.length} outputs but ${labels.length} class names are loaded`
      );
    }

    // The graph ends in raw logits; convert exactly as BirdNET-Analyzer does.
    const probs = new Float32Array(logits.length);
    let saturated = 0;
    let valid = true;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < logits.length; i++) {
      if (!Number.isFinite(logits[i])) valid = false;
      probs[i] = flatSigmoid(logits[i]);
      if (probs[i] > SATURATED_P) saturated++;
      lo = Math.min(lo, logits[i]);
      hi = Math.max(hi, logits[i]);
    }
    // Seven different classes never produce one identical value; that is the
    // zero-filled output of an uninitialised run.
    const degenerate = hi - lo < 1e-6;
    if (!valid || degenerate || saturated >= SATURATED_COUNT) {
      console.warn(
        "[worker] discarding invalid frame; raw logits:",
        Array.from(logits).map((v) => +v.toFixed(3))
      );
      return {
        timestamp: Date.now(),
        detection: { isCrow: false, score: 0 },
        behavior: null,
        behaviorConfidence: null,
        processingTimeMs: Math.round(performance.now() - startTime),
      };
    }

    const d = decide(probs, labels);
    const behaviorTop = d.ranking;

    console.log(
      `CrowTrans: ${d.top?.label ?? "-"} ${(d.top?.p ?? 0).toFixed(3)} ` +
        `(bar ${CROW_PRESENCE_THRESHOLD}) -> ${d.isCrow ? "CROW" : "none"} | ` +
        d.ranking
          .slice(0, 4)
          .map((r) => `${r.label} ${r.p.toFixed(3)}`)
          .join(", ")
    );

    const detection = { isCrow: d.isCrow, score: d.top?.p ?? 0 };

    // Below the bar: no crow call, so no translation.
    if (!d.isCrow || !d.top) {
      return {
        timestamp: Date.now(),
        detection,
        behavior: null,
        behaviorConfidence: null,
        processingTimeMs: Math.round(performance.now() - startTime),
        behaviorTop,
      };
    }

    const { behavior, title, meaning } = mapClassToBehavior(d.top.label);
    return {
      timestamp: Date.now(),
      detection,
      behavior,
      behaviorConfidence: d.top.p,
      processingTimeMs: Math.round(performance.now() - startTime),
      rawLabel: d.top.label,
      customTitle: title,
      customMeaning: meaning,
      behaviorTop,
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
