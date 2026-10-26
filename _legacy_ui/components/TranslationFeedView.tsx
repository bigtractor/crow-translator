// ============================================================
// Calcaine: Real-Time AI Translation Feed (Rich Intelligence Cards)
// ============================================================

"use client";

import React, { useState } from "react";
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
  Clock,
  Trash2,
  Activity,
  Layers,
  ChevronRight,
} from "lucide-react";

interface TranslationFeedViewProps {
  events: TranslationEvent[];
  activeEvent: TranslationEvent | null;
  silenceCountdownMs: number | null;
  isCapturing: boolean;
  onClearHistory: () => void;
}

function getIcon(behavior: CrowBehavior) {
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
      return <Activity className="w-5 h-5" />;
  }
}

function formatRelativeTime(timestamp: number): string {
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

export function TranslationFeedView({
  events,
  activeEvent,
  silenceCountdownMs,
  isCapturing,
  onClearHistory,
}: TranslationFeedViewProps) {
  const [filter, setFilter] = useState<"all" | "alarms" | "territory" | "social">("all");

  const filteredEvents = events.filter((e) => {
    if (filter === "alarms") {
      return e.behavior === "alarm_distress" || e.behavior === "mobbing_call";
    }
    if (filter === "territory") {
      return e.behavior === "territorial_call";
    }
    if (filter === "social") {
      return (
        e.behavior === "contact_call" ||
        e.behavior === "food_announcement" ||
        e.behavior === "juvenile_begging" ||
        e.behavior === "roosting_call"
      );
    }
    return true;
  });

  return (
    <section className="w-full flex flex-col mt-4 mb-12">
      {/* Feed Section Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Live Acoustic Translation Feed
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
            {events.length} {events.length === 1 ? "vocalization" : "vocalizations"}
          </span>
        </div>

        {/* Filter Pills & Clear */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-zinc-900/90 border border-zinc-800 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filter === "all"
                  ? "bg-emerald-500 text-black shadow-sm font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("alarms")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filter === "alarms"
                  ? "bg-rose-500 text-white shadow-sm font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              🚨 Alarms
            </button>
            <button
              onClick={() => setFilter("territory")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filter === "territory"
                  ? "bg-amber-500 text-black shadow-sm font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              📢 Territory
            </button>
            <button
              onClick={() => setFilter("social")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filter === "social"
                  ? "bg-cyan-500 text-black shadow-sm font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              💬 Social
            </button>
          </div>

          {events.length > 0 && (
            <button
              onClick={onClearHistory}
              className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              title="Clear feed history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {/* ======================================================== */}
        {/* ACTIVE LIVE CALL HERO CARD (WHEN CURRENTLY HEARD)        */}
        {/* ======================================================== */}
        {activeEvent && (
          <div
            key={activeEvent.id}
            className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-[#12221b] via-[#0d1813] to-[#080f0c] border-2 border-emerald-400 shadow-[0_12px_40px_rgba(16,185,129,0.35)] animate-in fade-in slide-in-from-top-3 duration-300"
          >
            {/* Ambient corner glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Live Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-emerald-400 text-black shadow-md">
                  <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                  Live Caw Detected
                </span>
                {activeEvent.consecutiveCount > 1 && (
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-700/50">
                    {activeEvent.consecutiveCount}× Consecutive Aggregated
                  </span>
                )}
              </div>

              {silenceCountdownMs !== null && (
                <div className="text-xs font-mono text-emerald-400 font-bold bg-black/40 px-3 py-1 rounded-full border border-emerald-500/30">
                  Duration: {activeEvent.durationSec}s
                </div>
              )}
            </div>

            {/* Translation Body */}
            <div className="flex items-start gap-4 mt-3">
              <div
                className={`p-3.5 rounded-2xl ${
                  BEHAVIOR_THEMES[activeEvent.behavior]?.iconBg || "bg-emerald-500/20"
                } ${
                  BEHAVIOR_THEMES[activeEvent.behavior]?.iconColor || "text-emerald-400"
                } border border-emerald-400/40 shrink-0 shadow-lg`}
              >
                {getIcon(activeEvent.behavior)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {activeEvent.customTitle ||
                      BEHAVIOR_TITLES[activeEvent.behavior] ||
                      activeEvent.behavior}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {Math.round(activeEvent.confidence * 100)}% Neural Match
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-zinc-200 font-medium mt-1 leading-relaxed">
                  {activeEvent.customMeaning ||
                    BEHAVIOR_MEANINGS[activeEvent.behavior] ||
                    "Recognized Carrion Crow vocalization sequence."}
                </p>

                {/* Live Confidence meter bar */}
                <div className="mt-3 w-full bg-black/40 h-2 rounded-full overflow-hidden border border-emerald-900/50">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(activeEvent.confidence * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* HISTORICAL DETECTIONS TIMELINE                           */}
        {/* ======================================================== */}
        {filteredEvents.length > 0 ? (
          filteredEvents
            .filter((e) => !activeEvent || e.id !== activeEvent.id)
            .map((event) => {
              const theme =
                BEHAVIOR_THEMES[event.behavior] || BEHAVIOR_THEMES.unknown;
              return (
                <div
                  key={event.id}
                  className="rounded-3xl p-5 bg-[#0a110e]/85 backdrop-blur-xl border border-zinc-800/80 hover:border-emerald-500/40 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon Bubble */}
                    <div
                      className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} border border-emerald-950 shrink-0 mt-0.5 shadow-md`}
                    >
                      {getIcon(event.behavior)}
                    </div>

                    {/* Translation Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                          {event.customTitle ||
                            BEHAVIOR_TITLES[event.behavior] ||
                            event.behavior}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0 font-medium">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{formatRelativeTime(event.startTime)}</span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-300 mt-1 leading-relaxed">
                        {event.customMeaning ||
                          BEHAVIOR_MEANINGS[event.behavior] ||
                          "Recognized Carrion Crow communication sound."}
                      </p>

                      {/* Metadata tags */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800">
                          {Math.round(event.confidence * 100)}% Confidence
                        </span>
                        {event.consecutiveCount > 1 && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                            {event.consecutiveCount} consecutive caws • {event.durationSec}s
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-500">
                          Corvus corone
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center rounded-3xl border border-dashed border-zinc-800 bg-[#09100d]/40 backdrop-blur-md">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <Activity className="w-8 h-8 opacity-80" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white">
              {isCapturing
                ? "Listening for Carrion Crow Calls..."
                : "Acoustic Pipeline Ready"}
            </h3>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mt-1.5 leading-relaxed">
              {isCapturing
                ? "Calcaine is actively analyzing your microphone audio. When a crow caws, its biological translation and confidence score will appear instantly here."
                : "Activate the microphone above or test any call in the soundboard to see the real-time neural translation in action."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
