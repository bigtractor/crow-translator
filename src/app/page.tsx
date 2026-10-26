// ============================================================
// Calcaine: Real-Time Bioacoustic Translation for Corvus corone
// Mobile-First, Consumer-Sleek UI Architecture
// ============================================================

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { Header } from "@/components/Header";
import { PrimaryActionButton } from "@/components/PrimaryActionButton";
import { LiveAudioWaveform } from "@/components/LiveAudioWaveform";
import { TranslationFeed } from "@/components/TranslationFeed";
import { ErrorModal } from "@/components/ErrorModal";
import { SampleAudioDrawer } from "@/components/SampleAudioDrawer";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useDebouncer } from "@/hooks/useDebouncer";
import { getInferenceEngine } from "@/lib/inference_engine";
import type { TranslationEvent } from "@/types";

export default function Home() {
  const [engineReady, setEngineReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDemoDrawerOpen, setIsDemoDrawerOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  // Confetti trigger ref (celebrate first crow detection)
  const hasCelebratedFirstCrowRef = useRef(false);

  // Debouncer hook for consecutive behavior aggregation (Section 3.3)
  const {
    events,
    activeEvent,
    silenceCountdownMs,
    processInference,
    clearHistory,
  } = useDebouncer({
    silenceWindowMs: 10000,
    onEventUpdate: (event: TranslationEvent) => {
      // Haptic feedback for urgent alarms on supported mobile devices
      if (
        (event.behavior === "alarm_distress" ||
          event.behavior === "mobbing_call") &&
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

  // Handle incoming 3-second audio slices from Web Audio API
  const handleSegmentReady = useCallback(
    async (samples: Float32Array) => {
      setIsProcessing(true);
      try {
        const engine = getInferenceEngine();
        const result = await engine.runInference(samples);

        // Process through debouncer (silently ignores non-crows < 0.70)
        processInference(result);

        // First crow discovery celebration
        if (result.birdnet.isCrow && !hasCelebratedFirstCrowRef.current) {
          hasCelebratedFirstCrowRef.current = true;
          try {
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { y: 0.8 },
              colors: ["#10b981", "#34d399", "#f59e0b"],
            });
          } catch {}
        }
      } catch (err) {
        console.error("Inference execution notice:", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [processInference]
  );

  // Web Audio ingestion hook (48kHz iOS Safari AudioContext compliant)
  const {
    state: audioState,
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

  // Open error modal when microphone or audio error occurs
  useEffect(() => {
    if (audioState.error) {
      setIsErrorModalOpen(true);
    }
  }, [audioState.error]);

  // Toggle capturing state
  const handleToggleCapture = useCallback(() => {
    if (audioState.isCapturing) {
      stopCapture();
    } else {
      startCapture();
    }
  }, [audioState.isCapturing, startCapture, stopCapture]);

  // Initialize client-side ML engine silently in background
  useEffect(() => {
    const engine = getInferenceEngine();
    engine
      .initialize((progress) => {
        if (progress >= 1.0) {
          setEngineReady(true);
        }
      })
      .catch((err) => {
        console.warn("Inference engine notice:", err);
        setEngineReady(true);
      });

    return () => {
      engine.dispose();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#080c0a] text-zinc-100 selection:bg-emerald-500 selection:text-black bg-radial-glow relative overflow-x-hidden">
      {/* Sleek Minimalist Header */}
      <Header
        isCapturing={audioState.isCapturing}
        isProcessing={isProcessing}
        onOpenDemo={() => setIsDemoDrawerOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-4 pb- safe flex flex-col">
        {/* Hero Section: The Massive Action Button */}
        <div className="my-4 sm:my-6 flex flex-col items-center">
          <PrimaryActionButton
            isCapturing={audioState.isCapturing}
            isProcessing={isProcessing}
            isAudioContextSuspended={isAudioContextSuspended}
            onToggleCapture={handleToggleCapture}
            onResumeAudioContext={resumeAudioContext}
          />

          {/* Clean Soundwave Indicator */}
          <div className="mt-2 w-full flex justify-center">
            <LiveAudioWaveform
              isCapturing={audioState.isCapturing}
              getAudioVisualData={getAudioVisualData}
            />
          </div>
        </div>

        {/* Live Translation Feed Section */}
        <section className="flex-1 flex flex-col mt-2">
          <TranslationFeed
            events={events}
            activeEvent={activeEvent}
            silenceCountdownMs={silenceCountdownMs}
            isCapturing={audioState.isCapturing}
            onClearHistory={clearHistory}
            onSelectSample={(sampleType) => {
              injectSyntheticAudio(sampleType);
            }}
          />
        </section>
      </main>

      {/* Human-Readable Error Modal (Silent error handling) */}
      <ErrorModal
        isOpen={isErrorModalOpen}
        errorMessage={audioState.error}
        onClose={() => setIsErrorModalOpen(false)}
        onRetry={() => {
          setIsErrorModalOpen(false);
          startCapture();
        }}
        onUseDemo={() => {
          setIsErrorModalOpen(false);
          setIsDemoDrawerOpen(true);
        }}
      />

      {/* Quick Sample Audio Demo Drawer */}
      <SampleAudioDrawer
        isOpen={isDemoDrawerOpen}
        onClose={() => setIsDemoDrawerOpen(false)}
        onSelectSample={(type) => {
          injectSyntheticAudio(type);
        }}
      />
    </div>
  );
}
