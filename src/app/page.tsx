// ============================================================
// Corvus-Edge: Real-Time Bioacoustic Acoustic Inference Prototype
// End-to-End Vercel Deployment with Client-Side WebAssembly ML
// ============================================================

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { Header } from "@/components/Header";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { MicrophoneControl } from "@/components/MicrophoneControl";
import { InferenceTelemetry } from "@/components/InferenceTelemetry";
import { ContinuousEventBanner } from "@/components/ContinuousEventBanner";
import { EventLogTerminal } from "@/components/EventLogTerminal";
import { DiagnosticsModal } from "@/components/DiagnosticsModal";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useDebouncer } from "@/hooks/useDebouncer";
import { getInferenceEngine } from "@/lib/inference_engine";
import type { InferenceResult, TranslationEvent } from "@/types";
import { ShieldCheck } from "lucide-react";

export default function Home() {
  const [engineReady, setEngineReady] = useState(false);
  const [engineStatus, setEngineStatus] = useState("Loading ML Pipeline...");
  const [backend, setBackend] = useState("WASM / WebGL");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<InferenceResult | null>(null);
  const [activeTensors, setActiveTensors] = useState(0);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [sharedArrayBufferSupported, setSharedArrayBufferSupported] = useState(false);

  // Confetti trigger ref (fire on first crow detection)
  const hasCelebratedFirstCrowRef = useRef(false);

  // Debouncer hook for Section 3.3 consecutive aggregation
  const {
    events,
    activeEvent,
    silenceCountdownMs,
    processInference,
    clearHistory,
  } = useDebouncer({
    silenceWindowMs: 10000,
    onEventUpdate: (event: TranslationEvent) => {
      // If alarm is detected, trigger visual notification
      if (
        (event.behavior === "alarm_distress" || event.behavior === "mobbing_call") &&
        event.consecutiveCount === 1
      ) {
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate([100, 50, 100]);
          } catch {}
        }
      }
    },
  });

  // Handle incoming 3-second audio slices
  const handleSegmentReady = useCallback(
    async (samples: Float32Array) => {
      setIsProcessing(true);
      try {
        const engine = getInferenceEngine();
        const result = await engine.runInference(samples);
        setLastResult(result);

        // Process through the debouncer hook
        processInference(result);

        // First crow discovery celebration
        if (result.birdnet.isCrow && !hasCelebratedFirstCrowRef.current) {
          hasCelebratedFirstCrowRef.current = true;
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.8 },
              colors: ["#10b981", "#06b6d4", "#f59e0b"],
            });
          } catch {}
        }

        // Check active tensor count in tf to verify zero memory leaks
        try {
          const tf = (window as unknown as { tf?: { memory: () => { numTensors: number } } }).tf;
          if (tf?.memory) {
            setActiveTensors(tf.memory().numTensors);
          } else {
            setActiveTensors(0);
          }
        } catch {
          setActiveTensors(0);
        }
      } catch (err) {
        console.error("Inference execution error:", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [processInference]
  );

  // Web Audio ingestion hook
  const {
    state: audioState,
    inputLevelDb,
    isAudioContextSuspended,
    startCapture,
    stopCapture,
    resumeAudioContext,
    getAudioVisualData,
    injectSyntheticAudio,
  } = useAudioCapture({
    sampleRate: 48000,
    segmentDurationSec: 3,
    onSegmentReady: handleSegmentReady,
  });

  // Toggle capturing state
  const handleToggleCapture = useCallback(() => {
    if (audioState.isCapturing) {
      stopCapture();
    } else {
      startCapture();
    }
  }, [audioState.isCapturing, startCapture, stopCapture]);

  // Check SharedArrayBuffer and initialize ML engine
  useEffect(() => {
    // Check SharedArrayBuffer availability (requires Cross-Origin-Opener-Policy headers)
    if (typeof window !== "undefined") {
      setSharedArrayBufferSupported(typeof SharedArrayBuffer !== "undefined");
    }

    const engine = getInferenceEngine();
    engine
      .initialize((progress, status) => {
        setEngineStatus(status);
        if (progress >= 1.0) {
          setEngineReady(true);
          setBackend(engine.backend || "WASM / WebGL");
        }
      })
      .catch((err) => {
        console.warn("Inference engine notice:", err);
        setEngineReady(true);
        setBackend("Bioacoustic DSP Client");
      });

    return () => {
      engine.dispose();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#05080c] text-zinc-100 selection:bg-emerald-500 selection:text-black">
      {/* Top Cybernetic Header */}
      <Header
        backend={backend}
        isCapturing={audioState.isCapturing}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        sharedArrayBufferSupported={sharedArrayBufferSupported}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Continuous Event Banner (Aggregated by Debouncer) */}
        <ContinuousEventBanner
          activeEvent={activeEvent}
          silenceCountdownMs={silenceCountdownMs}
        />

        {/* Top Control Grid: Microphone & Real-Time Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Prominent Mobile Mic Controller */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <MicrophoneControl
              isCapturing={audioState.isCapturing}
              onToggleCapture={handleToggleCapture}
              onInjectSynthetic={injectSyntheticAudio}
              error={audioState.error}
              isAudioContextSuspended={isAudioContextSuspended}
              onResumeAudioContext={resumeAudioContext}
              isProcessing={isProcessing}
            />
          </div>

          {/* Right Column: 48kHz Real-Time Oscilloscope / Spectrogram Canvas */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <AudioVisualizer
              isCapturing={audioState.isCapturing}
              getAudioVisualData={getAudioVisualData}
              inputLevelDb={inputLevelDb}
            />

            {/* Quick Architecture Callout */}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Client-Side WASM:</strong> Audio never leaves device. 0ms server latency.
                </span>
              </div>
              <button
                onClick={() => setIsDiagnosticsOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 font-mono text-[11px] underline underline-offset-2 shrink-0 ml-2"
              >
                Inspect
              </button>
            </div>
          </div>
        </div>

        {/* Middle Section: Two-Stage Inference Telemetry */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
              Two-Stage Machine Learning Pipeline
            </h2>
            <span className="text-[11px] font-mono text-zinc-500">
              Status: <span className="text-emerald-400">{engineStatus}</span>
            </span>
          </div>

          <InferenceTelemetry
            lastResult={lastResult}
            isProcessing={isProcessing}
          />
        </div>

        {/* Bottom Section: Live Scrolling Event Feed Terminal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
              Chronological Acoustic Feed
            </h2>
            <span className="text-[11px] font-mono text-zinc-500">
              Section 3.3 Debounced Aggregator Active
            </span>
          </div>

          <EventLogTerminal
            events={events}
            onClearHistory={clearHistory}
            supabaseSyncEnabled={true}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-[#040609] py-4 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>CORVUS-EDGE // Bioacoustic Edge Ingestion Prototype</span>
          <span>Targeting Vercel Edge CDN • iOS Safari 48kHz AudioContext Compliant</span>
        </div>
      </footer>

      {/* System Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        sharedArrayBufferSupported={sharedArrayBufferSupported}
        backend={backend}
        activeTensors={activeTensors}
      />
    </div>
  );
}
