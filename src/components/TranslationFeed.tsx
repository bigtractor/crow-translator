// ============================================================
// Calcaine: Live Translation Feed (Clean, Scrolling Cards)
// ============================================================

"use client";

import React from "react";
import type { TranslationEvent, CrowBehavior } from "@/types";
import {
  BEHAVIOR_TITLES,
  BEHAVIOR_MEANINGS,
  BEHAVIOR_THEMES,
} from "@/types";
import {
  AlertTriangle,
  Flame,
  Shield,
  Sparkles,
  Radio,
  Heart,
  Moon,
  HelpCircle,
  Clock,
  Volume2,
  Trash2,
} from "lucide-react";

interface TranslationFeedProps {
  events: TranslationEvent[];
  activeEvent: TranslationEvent | null;
  silenceCountdownMs: number | null;
  isCapturing: boolean;
  onClearHistory?: () => void;
  onSelectSample?: (type: "alarm" | "territorial" | "contact" | "food") => void;
}

/** Icon resolver for crow behaviors */
function getBehaviorIcon(behavior: CrowBehavior) {
  switch (behavior) {
    case "alarm_distress":
      return <AlertTriangle className="w-5 h-5" />;
    case "mobbing_call":
      return <Flame className="w-5 h-5" />;
    case "territorial_call":
      return <Shield className="w-5 h-5" />;
    case "food_announcement":
      return <Sparkles className="w-5 h-5" />;
    case "contact_call":
      return <Radio className="w-5 h-5" />;
    case "juvenile_begging":
      return <Heart className="w-5 h-5" />;
    case "roosting_call":
      return <Moon className="w-5 h-5" />;
    default:
      return <HelpCircle className="w-5 h-5" />;
  }
}

/** Human-friendly relative timestamp formatter */
function formatTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TranslationFeed({
  events,
  activeEvent,
  silenceCountdownMs,
  isCapturing,
  onClearHistory,
  onSelectSample,
}: TranslationFeedProps) {
  const hasEvents = events.length > 0;

  return (
    <div className="w-full flex flex-col flex-1 min-h-[300px]">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Live Translations
          </h2>
          {hasEvents && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              {events.length} {events.length === 1 ? "call" : "calls"}
            </span>
          )}
        </div>

        {hasEvents && onClearHistory && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors py-1 px-2 rounded-lg hover:bg-zinc-800/40"
            title="Clear translation history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Main Feed Content */}
      <div className="flex-1 space-y-3 pb-4">
        {/* If Active Consecutive Event (Section 3.3) */}
        {activeEvent && (
          <div
            key={activeEvent.id}
            className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#0e1713] to-[#070b09] border-2 border-emerald-500/50 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.3)] transition-all animate-in fade-in slide-in-from-top-2 duration-300"
          >
            {/* Live pulsating badge & countdown */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500 text-black shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                  Active Call
                </span>
                {activeEvent.consecutiveCount > 1 && (
                  <span className="text-[11px] font-medium text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                    {activeEvent.consecutiveCount}× repeated
                  </span>
                )}
              </div>

              {silenceCountdownMs !== null && (
                <span className="text-[11px] text-emerald-400/80 font-mono">
                  {activeEvent.durationSec}s duration
                </span>
              )}
            </div>

            {/* Content Row */}
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-xl ${
                  BEHAVIOR_THEMES[activeEvent.behavior]?.iconBg ||
                  "bg-emerald-500/15"
                } ${
                  BEHAVIOR_THEMES[activeEvent.behavior]?.iconColor ||
                  "text-emerald-400"
                } border border-emerald-500/30 shrink-0`}
              >
                {getBehaviorIcon(activeEvent.behavior)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                    {BEHAVIOR_TITLES[activeEvent.behavior] ||
                      activeEvent.behavior}
                  </h3>
                  <span className="text-xs text-emerald-300 font-semibold shrink-0">
                    {Math.round(activeEvent.confidence * 100)}% match
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-300 mt-1 leading-relaxed">
                  {BEHAVIOR_MEANINGS[activeEvent.behavior] ||
                    "Recognized Carrion Crow vocalization sequence."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Historical Events List (excluding active duplicate) */}
        {hasEvents ? (
          events
            .filter((e) => !activeEvent || e.id !== activeEvent.id)
            .map((event) => {
              const theme =
                BEHAVIOR_THEMES[event.behavior] || BEHAVIOR_THEMES.unknown;
              return (
                <div
                  key={event.id}
                  className={`relative rounded-2xl p-4 bg-[#0a100d]/90 backdrop-blur-md border ${theme.border} hover:border-emerald-500/40 transition-all duration-200 shadow-sm`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Icon Bubble */}
                    <div
                      className={`p-2.5 rounded-xl ${theme.iconBg} ${theme.iconColor} border border-emerald-950 shrink-0 mt-0.5`}
                    >
                      {getBehaviorIcon(event.behavior)}
                    </div>

                    {/* Translation Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight truncate">
                          {BEHAVIOR_TITLES[event.behavior] || event.behavior}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 shrink-0">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{formatTime(event.startTime)}</span>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {BEHAVIOR_MEANINGS[event.behavior]}
                      </p>

                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                          {Math.round(event.confidence * 100)}% confidence
                        </span>
                        {event.consecutiveCount > 1 && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-900/40">
                            {event.consecutiveCount} caws • {event.durationSec}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border border-dashed border-zinc-800/70 bg-[#090e0c]/40">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-800/30 flex items-center justify-center text-emerald-400 mb-3.5 shadow-inner">
              <Volume2 className="w-6 h-6 opacity-80" />
            </div>

            <h3 className="text-sm sm:text-base font-medium text-zinc-200">
              {isCapturing
                ? "Listening for Carrion Crows..."
                : "No Crow Calls Detected Yet"}
            </h3>

            <p className="text-xs text-zinc-400 max-w-xs mt-1 leading-relaxed">
              {isCapturing
                ? "When a Carrion Crow (Corvus corone) vocalizes, Calcaine will automatically translate the behavior here."
                : "Tap 'Start Listening' to begin real-time translation with your device microphone."}
            </p>

            {/* Quick Demo Test Buttons */}
            {onSelectSample && (
              <div className="mt-5 w-full max-w-xs">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-2">
                  Or Test Sample Audio:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onSelectSample("alarm")}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-red-950/30 hover:bg-red-900/40 active:scale-95 border border-red-800/40 text-[11px] font-medium text-red-300 transition-all cursor-pointer"
                  >
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span>Alarm Call</span>
                  </button>
                  <button
                    onClick={() => onSelectSample("food")}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 active:scale-95 border border-amber-800/40 text-[11px] font-medium text-amber-300 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Food Call</span>
                  </button>
                  <button
                    onClick={() => onSelectSample("territorial")}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/40 active:scale-95 border border-emerald-800/40 text-[11px] font-medium text-emerald-300 transition-all cursor-pointer"
                  >
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span>Territory Call</span>
                  </button>
                  <button
                    onClick={() => onSelectSample("contact")}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-cyan-950/30 hover:bg-cyan-900/40 active:scale-95 border border-cyan-800/40 text-[11px] font-medium text-cyan-300 transition-all cursor-pointer"
                  >
                    <Radio className="w-3 h-3 text-cyan-400" />
                    <span>Contact Call</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
