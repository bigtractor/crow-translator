// ============================================================
// Inference engine: main-thread proxy to the CrowTrans worker
// ============================================================
// Model: /models/crowtrans_v2.tflite (contract in src/lib/crow_labels.ts)
//
// Input tensor:  [1, 144000] float32 (3 seconds @ 48,000 Hz)
// Output tensor: [1, 7] float32 RAW LOGITS (the worker applies flatSigmoid)
// Rule: a crow call is present when the strongest class reaches
// CROW_PRESENCE_THRESHOLD, and that class is the meaning. There is no species
// gate and no second stage.
//
// All of that runs in src/workers/inference.worker.ts. This file only owns the
// worker lifecycle and the request/response plumbing, so the UI thread never
// blocks on a 300 ms synchronous predict() call.

import type { InferenceResult } from "@/types";
import type { WorkerRequest, WorkerResponse } from "@/workers/inference.worker";

export { CROW_PRESENCE_THRESHOLD, decide, mapClassToBehavior } from "./crow_labels";

type ProgressFn = (progress: number, status: string) => void;

export class InferenceEngine {
  private worker: Worker | null = null;
  private ready = false;
  private activeBackend = "uninitialized";
  private initPromise: Promise<void> | null = null;

  /** Resolvers for in-flight inference requests, keyed by request id */
  private pending = new Map<
    number,
    {
      resolve: (r: InferenceResult) => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private nextId = 1;

  /** Rolling diagnostic trace posted by the worker. */
  readonly debugLog: string[] = [];

  /**
   * One window at a time. The microphone produces a window every 3 s; if a
   * window is still being analysed when the next arrives we drop the new one
   * rather than queueing, so a slow device degrades to fewer readings instead
   * of an ever-growing backlog.
   */
  private busy = false;

  /**
   * Give up on a window after this long. Without it, a single lost reply (a
   * crashed or replaced worker, a dropped message) would leave `busy` true
   * forever and the app would silently stop detecting anything.
   */
  private static readonly REQUEST_TIMEOUT_MS = 15000;

  get isReady(): boolean {
    return this.ready;
  }

  get usingTflite(): boolean {
    return this.ready;
  }

  get backend(): string {
    return this.activeBackend;
  }

  /** True while a window is being analysed. */
  get isBusy(): boolean {
    return this.busy;
  }

  /**
   * Spin up the worker and load the model. Safe to call repeatedly: the same
   * promise is returned, so the 29 MB model is fetched once per page load.
   */
  async initialize(onProgress?: ProgressFn): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      let worker: Worker;
      try {
        worker = new Worker(new URL("../workers/inference.worker.ts", import.meta.url));
      } catch (err) {
        this.activeBackend = "unavailable";
        onProgress?.(1, "Web Workers are unavailable in this browser");
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      this.worker = worker;

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        switch (msg.type) {
          case "debug":
            this.debugLog.push(`${Date.now()} ${msg.message}`);
            if (this.debugLog.length > 100) this.debugLog.shift();
            break;

          case "progress":
            onProgress?.(msg.progress, msg.status);
            break;

          case "ready":
            this.ready = true;
            this.activeBackend = msg.backend;
            console.log(
              `[InferenceEngine] worker ready: classes=(${msg.classes.join(", ")}) ` +
                `backend=${msg.backend}`
            );
            onProgress?.(1, `Model ready · ${msg.backend}`);
            resolve();
            break;

          case "init-error":
            this.ready = false;
            this.activeBackend = "failed";
            onProgress?.(1, "CrowTrans model failed to load");
            reject(new Error(msg.message));
            break;

          case "result": {
            const p = this.settle(msg.id);
            p?.resolve(msg.result);
            break;
          }

          case "infer-error": {
            const p = this.settle(msg.id);
            p?.reject(new Error(msg.message));
            break;
          }
        }
      };

      worker.onerror = (e) => {
        const message = e.message || "Inference worker crashed";
        this.ready = false;
        this.activeBackend = "failed";
        // Fail every in-flight request so no caller hangs forever.
        for (const [, p] of this.pending) {
          clearTimeout(p.timer);
          p.reject(new Error(message));
        }
        this.pending.clear();
        this.busy = false;
        reject(new Error(message));
      };

      this.post({ type: "init" });
    });

    return this.initPromise;
  }

  private post(msg: WorkerRequest, transfer?: Transferable[]) {
    this.worker?.postMessage(msg, transfer ?? []);
  }

  /** Remove a request from the in-flight map and free the engine. */
  private settle(id: number) {
    const p = this.pending.get(id);
    if (p) clearTimeout(p.timer);
    this.pending.delete(id);
    this.busy = false;
    return p;
  }

  /**
   * Analyse one 3-second window.
   * @returns the result, or null if the window was dropped because the
   *          previous one is still being analysed, or the model is not loaded.
   */
  async runInference(audioSamples: Float32Array): Promise<InferenceResult | null> {
    if (!this.worker || !this.ready) return null;
    if (this.busy) return null;

    this.busy = true;
    const id = this.nextId++;

    return new Promise<InferenceResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.settle(id);
        reject(
          new Error(
            `Inference timed out after ${InferenceEngine.REQUEST_TIMEOUT_MS} ms; dropping this window`
          )
        );
      }, InferenceEngine.REQUEST_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });
      // Transfer the buffer instead of copying 576 KB on every window. The
      // capture hook already hands us a fresh copy per segment.
      this.post({ type: "infer", id, samples: audioSamples }, [audioSamples.buffer]);
    });
  }

  /**
   * Terminate the worker. The page keeps a process-lifetime singleton, so this
   * is only for an explicit teardown.
   */
  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.initPromise = null;
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("Inference engine disposed"));
    }
    this.pending.clear();
    this.busy = false;
    this.activeBackend = "uninitialized";
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
