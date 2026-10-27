// ============================================================
// CrowTrans: on-device corvid call recognition
// ============================================================

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandHeader, type EngineStatus } from "@/components/BrandHeader";
import { ListenPanel } from "@/components/ListenPanel";
import { CurrentFrame } from "@/components/CurrentFrame";
import { OutputLog } from "@/components/OutputLog";
import { InfoFooter } from "@/components/InfoFooter";
import { SpeakPanel } from "@/components/SpeakPanel";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useDebouncer } from "@/hooks/useDebouncer";
import { useSessionLog, type LogEntry } from "@/hooks/useSessionLog";
import { getInferenceEngine, type InferenceEngine } from "@/lib/inference_engine";
import { decide, mapClassToBehavior } from "@/lib/crow_labels";
import { BEHAVIOR_TITLES, type InferenceResult, type TranslationEvent } from "@/types";

declare global {
  interface Window {
    /** Development-only handle for driving the engine from the console. */
    __crowtrans?: {
      engine: InferenceEngine;
      run: (samples: Float32Array) => Promise<InferenceResult | null>;
      rules: {
        decide: typeof decide;
        mapClassToBehavior: typeof mapClassToBehavior;
      };
      /** Feed a result straight into the log, bypassing audio and the model. */
      feed: (result: InferenceResult) => void;
    };
  }
}

function shortLabel(raw?: string): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/^Corvus corone_\s*/i, "").trim();
}

export default function Home() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("loading");
  const [engineStatusText, setEngineStatusText] = useState("Preparing model…");
  const [backend, setBackend] = useState("—");
  const [processing, setProcessing] = useState(false);
  const [latestFrame, setLatestFrame] = useState<InferenceResult | null>(null);
  const [view, setView] = useState<"listen" | "speak">("listen");

  /**
   * Epoch ms until which the app itself is playing a crow call. The microphone
   * would hear that playback, so windows inside this period are ignored instead
   * of being logged as detections.
   */
  const playbackEndsRef = useRef(0);
  const onPlayback = useCallback((endsAtMs: number) => {
    playbackEndsRef.current = endsAtMs;
  }, []);

  const { entries: logEntries, system: logSystem, rejected: logRejected, clear: logClear } =
    useSessionLog();

  /** Windows dropped because inference had not finished. */
  const skippedRef = useRef(0);

  /** Stable handle to the ingest function, for the dev hook below. */
  const processInferenceRef = useRef<(r: InferenceResult) => void>(() => {});

  const { events, processInference, clearHistory } = useDebouncer({
    silenceWindowMs: 10000,
    onEventUpdate: (event: TranslationEvent) => {
      if (
        event.behavior === "alarm_agonistic" &&
        event.consecutiveCount === 1 &&
        typeof navigator !== "undefined" &&
        "vibrate" in navigator
      ) {
        try {
          navigator.vibrate([80, 40, 80]);
        } catch {}
      }
    },
  });

  // Each 3-second window from the microphone
  const handleSegmentReady = useCallback(
    async (samples: Float32Array) => {
      // Our own playback is in this window; do not analyse it.
      if (Date.now() < playbackEndsRef.current + 3500) return;
      setProcessing(true);
      try {
        const engine = getInferenceEngine();
        const result = await engine.runInference(samples);

        // null means the previous window was still being analysed, so this one
        // was dropped rather than queued. Say so once, then stay quiet.
        if (!result) {
          skippedRef.current += 1;
          if (skippedRef.current === 1) {
            logSystem(
              "Window skipped",
              "Analysis did not finish before the next 3 s window. Readings may be intermittent on this device."
            );
          }
          return;
        }

        setLatestFrame(result);
        processInference(result);

        if (!result.detection.isCrow) {
          const best = result.behaviorTop?.[0];
          const detail = best
            ? `best match: ${mapClassToBehavior(best.label).title} ${Math.round(best.p * 100)}%`
            : undefined;
          logRejected("No crow call", detail, result.detection.score);
        }
      } catch (err) {
        console.error("Inference failed:", err);
        logSystem("Inference error", err instanceof Error ? err.message : String(err));
      } finally {
        setProcessing(false);
      }
    },
    [processInference, logRejected, logSystem]
  );

  const {
    state: audioState,
    inputLevelDb,
    isAudioContextSuspended,
    startCapture,
    stopCapture,
    resumeAudioContext,
  } = useAudioCapture({
    sampleRate: 48000,
    segmentDurationSec: 3,
    onSegmentReady: handleSegmentReady,
  });

  const toggleListening = useCallback(() => {
    if (audioState.isCapturing) {
      stopCapture();
      logSystem("Stopped listening");
    } else {
      logSystem("Started listening", "48 kHz · 3 s windows");
      startCapture();
    }
  }, [audioState.isCapturing, startCapture, stopCapture, logSystem]);

  useEffect(() => {
    processInferenceRef.current = processInference;
  }, [processInference]);

  useEffect(() => {
    if (audioState.error) {
      logSystem("Microphone error", audioState.error);
    }
  }, [audioState.error, logSystem]);

  // Load the model once
  useEffect(() => {
    const engine = getInferenceEngine();
    let cancelled = false;

    engine
      .initialize((progress, status) => {
        if (cancelled) return;
        setEngineStatusText(status);
        if (progress >= 1) {
          const loaded = engine.usingTflite;
          setEngineStatus(loaded ? "ready" : "fallback");
          setBackend(engine.backend);
          setEngineStatusText(
            loaded ? `Model ready · ${engine.backend}` : "CrowTrans model failed to load"
          );
          logSystem(
            loaded ? "Model loaded" : "Model unavailable",
            loaded
              ? "crowtrans_v2.tflite · BirdNET V2.4 features + 7 call classes"
              : "Detections are disabled until the model loads. Check the browser console."
          );
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setEngineStatus("fallback");
        setEngineStatusText("Model failed to initialise");
        logSystem("Model failed to initialise", err instanceof Error ? err.message : String(err));
      });

    if (process.env.NODE_ENV === "development") {
      window.__crowtrans = {
        engine,
        run: (s) => engine.runInference(s),
        rules: { decide, mapClassToBehavior },
        feed: (r) => processInferenceRef.current(r),
      };
    }

    return () => {
      cancelled = true;
      // Deliberately not disposing: the engine is a process-lifetime singleton
      // and tearing down the worker would re-download the 60 MB model on the
      // next mount.
      if (process.env.NODE_ENV === "development") delete window.__crowtrans;
    };
  }, [logSystem]);

  // Merge continuous detections (from the debouncer) with system / rejected entries
  const entries = useMemo<LogEntry[]>(() => {
    const detections: LogEntry[] = events.map((e) => ({
      id: e.id,
      time: e.startTime,
      kind: "detection",
      title: e.customTitle ?? BEHAVIOR_TITLES[e.behavior],
      detail: shortLabel(e.rawLabel),
      confidence: e.confidence,
      durationSec: e.durationSec,
      count: e.consecutiveCount,
      active: e.active,
    }));
    return [...detections, ...logEntries].sort((a, b) => b.time - a.time);
  }, [events, logEntries]);

  const clearAll = useCallback(() => {
    clearHistory();
    logClear();
  }, [clearHistory, logClear]);

  return (
    <div className="min-h-dvh flex flex-col">
      <BrandHeader engineStatus={engineStatus} listening={audioState.isCapturing} />

      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 pt-1">
        <div className="glass inline-flex gap-1 p-1 rounded-full" role="tablist" aria-label="Mode">
          {(
            [
              ["listen", "Listen"],
              ["speak", "Speak"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`pressable focus-ring h-9 px-5 text-[14px] font-medium rounded-full ${
                view === v ? "btn-primary" : "text-[var(--text-2)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "listen" ? (
        <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 pt-3 flex-1 lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-6 lg:items-start">
          <div className="flex flex-col gap-4 lg:sticky lg:top-4">
            <ListenPanel
              engineStatus={engineStatus}
              engineStatusText={engineStatusText}
              listening={audioState.isCapturing}
              processing={processing}
              levelDb={inputLevelDb}
              suspended={isAudioContextSuspended}
              error={audioState.error}
              onToggle={toggleListening}
              onResume={resumeAudioContext}
            />
            <CurrentFrame frame={latestFrame} listening={audioState.isCapturing} />
          </div>

          <div className="mt-4 lg:mt-0">
            <OutputLog entries={entries} onClear={clearAll} />
          </div>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 pt-3 flex-1">
          <SpeakPanel onPlayback={onPlayback} />
        </main>
      )}

      <InfoFooter backend={backend} modelLoaded={engineStatus === "ready"} />
    </div>
  );
}
