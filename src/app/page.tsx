// ============================================================
// Calcaine: Tactile, Dead-Simple, Mobile-First UI
// Complete visual tear-down: Zero clutter, giant tactile buttons
// ============================================================

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { Mic, Square, Sparkles } from "lucide-react";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useDebouncer } from "@/hooks/useDebouncer";
import { getInferenceEngine } from "@/lib/inference_engine";
import type { CrowBehavior, TranslationEvent } from "@/types";

/** Bold, vibrant theme styling for translation cards */
const CARD_THEMES: Record<
  CrowBehavior,
  {
    icon: string;
    bg: string;
    border: string;
    shadow: string;
    titleColor: string;
    subColor: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  alarm_distress: {
    icon: "🚨",
    bg: "bg-rose-950/90",
    border: "border-rose-500",
    shadow: "shadow-[0_10px_35px_rgba(244,63,94,0.4)]",
    titleColor: "text-white",
    subColor: "text-rose-200",
    badgeBg: "bg-rose-500 text-black",
    badgeText: "font-black",
  },
  mobbing_call: {
    icon: "🦅",
    bg: "bg-orange-950/90",
    border: "border-orange-500",
    shadow: "shadow-[0_10px_35px_rgba(249,115,22,0.4)]",
    titleColor: "text-white",
    subColor: "text-orange-200",
    badgeBg: "bg-orange-500 text-black",
    badgeText: "font-black",
  },
  territorial_call: {
    icon: "📢",
    bg: "bg-amber-950/90",
    border: "border-amber-500",
    shadow: "shadow-[0_10px_35px_rgba(245,158,11,0.4)]",
    titleColor: "text-white",
    subColor: "text-amber-200",
    badgeBg: "bg-amber-500 text-black",
    badgeText: "font-black",
  },
  food_announcement: {
    icon: "🍖",
    bg: "bg-emerald-950/90",
    border: "border-emerald-500",
    shadow: "shadow-[0_10px_35px_rgba(16,185,129,0.4)]",
    titleColor: "text-white",
    subColor: "text-emerald-200",
    badgeBg: "bg-emerald-500 text-black",
    badgeText: "font-black",
  },
  contact_call: {
    icon: "💬",
    bg: "bg-sky-950/90",
    border: "border-sky-500",
    shadow: "shadow-[0_10px_35px_rgba(14,165,233,0.4)]",
    titleColor: "text-white",
    subColor: "text-sky-200",
    badgeBg: "bg-sky-500 text-black",
    badgeText: "font-black",
  },
  juvenile_begging: {
    icon: "🐣",
    bg: "bg-pink-950/90",
    border: "border-pink-500",
    shadow: "shadow-[0_10px_35px_rgba(236,72,153,0.4)]",
    titleColor: "text-white",
    subColor: "text-pink-200",
    badgeBg: "bg-pink-500 text-black",
    badgeText: "font-black",
  },
  roosting_call: {
    icon: "🌙",
    bg: "bg-indigo-950/90",
    border: "border-indigo-500",
    shadow: "shadow-[0_10px_35px_rgba(99,102,241,0.4)]",
    titleColor: "text-white",
    subColor: "text-indigo-200",
    badgeBg: "bg-indigo-500 text-black",
    badgeText: "font-black",
  },
  unknown: {
    icon: "❓",
    bg: "bg-zinc-900/90",
    border: "border-zinc-500",
    shadow: "shadow-[0_10px_35px_rgba(113,113,122,0.3)]",
    titleColor: "text-white",
    subColor: "text-zinc-300",
    badgeBg: "bg-zinc-500 text-black",
    badgeText: "font-black",
  },
};

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const hasCelebratedFirstCrowRef = useRef(false);

  // Debouncer hook for continuous event aggregation
  const {
    events,
    activeEvent,
    processInference,
    clearHistory,
  } = useDebouncer({
    silenceWindowMs: 10000,
    onEventUpdate: (event: TranslationEvent) => {
      // Mobile haptic vibration for alarms
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

        // Process through debouncer (silently discards non-crows)
        processInference(result);

        // Confetti celebration on first crow
        if (result.birdnet.isCrow && !hasCelebratedFirstCrowRef.current) {
          hasCelebratedFirstCrowRef.current = true;
          try {
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.6 },
              colors: ["#10b981", "#f43f5e", "#f59e0b"],
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

  // Web Audio capture hook
  const {
    state: audioState,
    isAudioContextSuspended,
    startCapture,
    stopCapture,
    resumeAudioContext,
    injectSyntheticAudio,
  } = useAudioCapture({
    sampleRate: 48000,
    segmentDurationSec: 3,
    onSegmentReady: handleSegmentReady,
  });

  // Toggle listening with iOS Safari compliance
  const handleToggle = useCallback(() => {
    if (isAudioContextSuspended) {
      resumeAudioContext();
    }
    if (audioState.isCapturing) {
      stopCapture();
    } else {
      startCapture();
    }
  }, [
    audioState.isCapturing,
    isAudioContextSuspended,
    resumeAudioContext,
    startCapture,
    stopCapture,
  ]);

  // Initialize engine on mount silently
  useEffect(() => {
    const engine = getInferenceEngine();
    engine.initialize().catch(() => {});
    return () => {
      engine.dispose();
    };
  }, []);

  const isListening = audioState.isCapturing;

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-start p-4 sm:p-6 transition-colors duration-700 ease-in-out select-none ${
        isListening
          ? "bg-gradient-to-b from-[#06140d] via-[#091f14] to-[#040c08]"
          : "bg-zinc-950"
      }`}
    >
      {/* Container restricted to mobile-first column */}
      <div className="w-full max-w-md flex flex-col items-center my-auto py-8">
        {/* ===================================================== */}
        {/* THE PRIMARY ACTION: MASSIVE, TACTILE, VIBRANT BUTTON   */}
        {/* ===================================================== */}
        <div className="relative flex items-center justify-center my-6">
          {/* Animated pulsing outer aura when listening */}
          {isListening && (
            <>
              <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
              <div className="absolute w-84 h-84 sm:w-96 sm:h-96 rounded-full border-4 border-rose-500/30 animate-pulse pointer-events-none" />
            </>
          )}

          {/* The Big Button */}
          <button
            onClick={handleToggle}
            type="button"
            aria-label={isListening ? "Stop Listening" : "Start Listening"}
            className={`w-64 h-64 sm:w-72 sm:h-72 rounded-full flex flex-col items-center justify-center text-center cursor-pointer active:scale-90 transition-transform duration-150 transform focus:outline-none ${
              isListening
                ? "bg-rose-500 hover:bg-rose-400 text-white border-6 sm:border-8 border-rose-300 shadow-[0_16px_50px_rgba(244,63,94,0.65)]"
                : "bg-emerald-500 hover:bg-emerald-400 text-white border-6 sm:border-8 border-emerald-300 shadow-[0_16px_50px_rgba(16,185,129,0.55)]"
            }`}
          >
            {isListening ? (
              <>
                <Square className="w-16 h-16 sm:w-20 sm:h-20 fill-current mb-2 drop-shadow-md" />
                <span className="font-black text-2xl sm:text-3xl uppercase tracking-wider leading-none drop-shadow-md">
                  STOP
                </span>
                <span className="font-bold text-xs sm:text-sm tracking-widest text-rose-100 uppercase mt-1">
                  Listening Active
                </span>
              </>
            ) : (
              <>
                <Mic className="w-16 h-16 sm:w-20 sm:h-20 mb-2 drop-shadow-md" />
                <span className="font-black text-2xl sm:text-3xl uppercase tracking-wider leading-none drop-shadow-md">
                  START
                </span>
                <span className="font-bold text-xs sm:text-sm tracking-widest text-emerald-100 uppercase mt-1">
                  Listening
                </span>
              </>
            )}
          </button>
        </div>

        {/* Quick Demo Test Buttons (Discrete, Chunky, Instant) */}
        <div className="flex items-center gap-2 my-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
            Test Sound:
          </span>
          <button
            onClick={() => injectSyntheticAudio("alarm")}
            className="px-3 py-1.5 rounded-xl font-black text-xs bg-zinc-900 hover:bg-rose-950 text-rose-300 border-2 border-rose-500/40 active:scale-90 transition-transform duration-150 cursor-pointer shadow-sm"
          >
            🚨 Danger
          </button>
          <button
            onClick={() => injectSyntheticAudio("territorial")}
            className="px-3 py-1.5 rounded-xl font-black text-xs bg-zinc-900 hover:bg-amber-950 text-amber-300 border-2 border-amber-500/40 active:scale-90 transition-transform duration-150 cursor-pointer shadow-sm"
          >
            📢 Back Off
          </button>
          <button
            onClick={() => injectSyntheticAudio("food")}
            className="px-3 py-1.5 rounded-xl font-black text-xs bg-zinc-900 hover:bg-orange-950 text-orange-300 border-2 border-orange-500/40 active:scale-90 transition-transform duration-150 cursor-pointer shadow-sm"
          >
            🦅 Mobbing
          </button>
        </div>

        {/* ===================================================== */}
        {/* THE TRANSLATION FEED: CLEAN, CHUNKY, BIG CARDS        */}
        {/* ===================================================== */}
        <div className="w-full flex flex-col gap-3.5 mt-2">
          {/* Active / Most Recent Event Card */}
          {activeEvent && (
            <div
              key={activeEvent.id}
              className={`w-full rounded-3xl p-5 border-4 transition-all duration-200 animate-in fade-in slide-in-from-top-3 ${
                CARD_THEMES[activeEvent.behavior]?.bg || "bg-zinc-900"
              } ${
                CARD_THEMES[activeEvent.behavior]?.border || "border-zinc-700"
              } ${CARD_THEMES[activeEvent.behavior]?.shadow || ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider ${
                    CARD_THEMES[activeEvent.behavior]?.badgeBg ||
                    "bg-white text-black"
                  } ${CARD_THEMES[activeEvent.behavior]?.badgeText || "font-black"}`}
                >
                  ● Active Crow Call
                </span>
                {activeEvent.consecutiveCount > 1 && (
                  <span className="text-xs font-black text-white bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
                    {activeEvent.consecutiveCount}× caws
                  </span>
                )}
              </div>

              <div className="flex items-start gap-4 mt-2">
                <span className="text-5xl select-none shrink-0 drop-shadow-md">
                  {CARD_THEMES[activeEvent.behavior]?.icon || "📢"}
                </span>
                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-2xl sm:text-3xl font-black tracking-tight leading-tight ${
                      CARD_THEMES[activeEvent.behavior]?.titleColor ||
                      "text-white"
                    }`}
                  >
                    {activeEvent.customTitle ||
                      activeEvent.rawLabel?.replace("Corvus corone_", "") ||
                      activeEvent.behavior}
                  </h3>
                  <p
                    className={`text-sm sm:text-base font-bold mt-1 leading-snug ${
                      CARD_THEMES[activeEvent.behavior]?.subColor ||
                      "text-zinc-200"
                    }`}
                  >
                    {activeEvent.customMeaning ||
                      "Recognized Carrion Crow vocalization"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Historical Events List */}
          {events
            .filter((e) => !activeEvent || e.id !== activeEvent.id)
            .map((event) => {
              const theme = CARD_THEMES[event.behavior] || CARD_THEMES.unknown;
              return (
                <div
                  key={event.id}
                  className={`w-full rounded-3xl p-5 border-4 transition-all duration-200 ${theme.bg} ${theme.border} ${theme.shadow}`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl sm:text-5xl select-none shrink-0 drop-shadow">
                      {theme.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${theme.titleColor}`}
                      >
                        {event.customTitle ||
                          event.rawLabel?.replace("Corvus corone_", "") ||
                          event.behavior}
                      </h4>
                      <p
                        className={`text-xs sm:text-sm font-semibold mt-1 leading-snug ${theme.subColor}`}
                      >
                        {event.customMeaning ||
                          "Recognized Carrion Crow vocalization"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-black/40 text-white border border-white/20">
                          {Math.round(event.confidence * 100)}% match
                        </span>
                        {event.consecutiveCount > 1 && (
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-black/40 text-white border border-white/20">
                            {event.consecutiveCount} caws
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Empty State */}
          {events.length === 0 && !activeEvent && (
            <div className="w-full text-center py-8 px-4 rounded-3xl border-4 border-dashed border-zinc-800 bg-zinc-900/30">
              <span className="text-4xl block mb-2">🦅</span>
              <p className="font-black text-lg text-zinc-300 uppercase tracking-wide">
                {isListening
                  ? "Listening for Crows..."
                  : "Ready to Translate"}
              </p>
              <p className="text-xs font-semibold text-zinc-500 mt-1">
                {isListening
                  ? "Caw sounds will pop up here in real time."
                  : "Tap the big button above or try a test sound."}
              </p>
            </div>
          )}

          {/* Clear history button */}
          {events.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-300 py-2 self-center active:scale-90 transition-transform duration-150 cursor-pointer"
            >
              Clear Feed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
