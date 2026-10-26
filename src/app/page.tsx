// ============================================================
// Calcaine: Real-Time Corvus corone Bioacoustic Intelligence
// Full Web Application Design (State-of-the-Art AI UI)
// ============================================================

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { FullAppHeader } from "@/components/FullAppHeader";
import { HeroAudioConsole } from "@/components/HeroAudioConsole";
import { InteractiveSoundboard } from "@/components/InteractiveSoundboard";
import { TranslationFeedView } from "@/components/TranslationFeedView";
import { TaxonomyModal } from "@/components/TaxonomyModal";
import { PrivacyModal } from "@/components/PrivacyModal";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useDebouncer } from "@/hooks/useDebouncer";
import { getInferenceEngine } from "@/lib/inference_engine";
import type { TranslationEvent } from "@/types";

export default function Home() {
  const [engineReady, setEngineReady] = useState(false);
  const [activeBackend, setActiveBackend] = useState("WASM / WebGL");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTaxonomyOpen, setIsTaxonomyOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const soundboardRef = useRef<HTMLDivElement | null>(null);
  const hasCelebratedFirstCrowRef = useRef(false);

  // Debouncer hook for consecutive behavior aggregation
  const {
    events,
    activeEvent,
    silenceCountdownMs,
    processInference,
    clearHistory,
  } = useDebouncer({
    silenceWindowMs: 10000,
    onEventUpdate: (event: TranslationEvent) => {
      // Haptic feedback for urgent alarms on mobile
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

  // Handle incoming 3-second audio slices
  const handleSegmentReady = useCallback(
    async (samples: Float32Array) => {
      setIsProcessing(true);
      try {
        const engine = getInferenceEngine();
        const result = await engine.runInference(samples);

        // Process through debouncer (silently filters non-crows)
        processInference(result);

        // Confetti celebration on first crow discovery
        if (result.birdnet.isCrow && !hasCelebratedFirstCrowRef.current) {
          hasCelebratedFirstCrowRef.current = true;
          try {
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.7 },
              colors: ["#10b981", "#06b6d4", "#f59e0b"],
            });
          } catch {}
        }
      } catch (err) {
        console.error("Audio inference notice:", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [processInference]
  );

  // Web Audio capture hook (48.0 kHz iOS Safari compliant)
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

  // Toggle listening state
  const handleToggleCapture = useCallback(() => {
    if (audioState.isCapturing) {
      stopCapture();
    } else {
      startCapture();
    }
  }, [audioState.isCapturing, startCapture, stopCapture]);

  // Initialize engine and load crow_behavior.tflite
  useEffect(() => {
    const engine = getInferenceEngine();
    engine
      .initialize((progress) => {
        if (progress >= 1.0) {
          setEngineReady(true);
          setActiveBackend(engine.backend || "WASM / WebGL");
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
    <div className="min-h-screen flex flex-col bg-[#050907] text-zinc-100 selection:bg-emerald-500 selection:text-black bg-radial-glow overflow-x-hidden">
      {/* High-End AI App Header */}
      <FullAppHeader
        isCapturing={audioState.isCapturing}
        isProcessing={isProcessing}
        activeBackend={activeBackend}
        onOpenTaxonomy={() => setIsTaxonomyOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenSoundboard={() => {
          soundboardRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6 pb-12 flex flex-col items-center">
        {/* Hero Section: Interactive Reactor Hub + Bioacoustic Spectrum */}
        <HeroAudioConsole
          isCapturing={audioState.isCapturing}
          isProcessing={isProcessing}
          isAudioContextSuspended={isAudioContextSuspended}
          inputLevelDb={inputLevelDb}
          onToggleCapture={handleToggleCapture}
          onResumeAudioContext={resumeAudioContext}
          getAudioVisualData={getAudioVisualData}
        />

        {/* Bioacoustic Soundboard Strip */}
        <div ref={soundboardRef} className="w-full">
          <InteractiveSoundboard
            onTriggerSample={(type) => {
              injectSyntheticAudio(type);
            }}
            isProcessing={isProcessing}
          />
        </div>

        {/* Live Translation Timeline Feed */}
        <TranslationFeedView
          events={events}
          activeEvent={activeEvent}
          silenceCountdownMs={silenceCountdownMs}
          isCapturing={audioState.isCapturing}
          onClearHistory={clearHistory}
        />
      </main>

      {/* Behavioral Taxonomy Modal */}
      <TaxonomyModal
        isOpen={isTaxonomyOpen}
        onClose={() => setIsTaxonomyOpen(false)}
        onSelectSample={(type) => {
          injectSyntheticAudio(type);
        }}
      />

      {/* Privacy & Architecture Modal */}
      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </div>
  );
}
