// ============================================================
// ContinuousEventBanner Component
// Visualizes the Debouncer state (Section 3.3):
// - Aggregates consecutive identical behavior classifications
// - Shows incrementing continuous duration timer
// - Visualizes 10-second silence countdown before resetting state
// ============================================================

"use client";

import React from "react";
import type { TranslationEvent } from "@/types";
import { BEHAVIOR_LABELS, BEHAVIOR_ICONS, BEHAVIOR_COLORS } from "@/types";
import { Timer, AlertTriangle, Radio, Flame } from "lucide-react";

interface ContinuousEventBannerProps {
  activeEvent: TranslationEvent | null;
  silenceCountdownMs: number | null;
  silenceWindowMs?: number;
}

export const ContinuousEventBanner: React.FC<ContinuousEventBannerProps> = ({
  activeEvent,
  silenceCountdownMs,
  silenceWindowMs = 10000,
}) => {
  if (!activeEvent || !activeEvent.active) {
    return null;
  }

  const { behavior, consecutiveCount, durationSec, confidence } = activeEvent;
  const isAlarm = behavior === "alarm_distress" || behavior === "mobbing_call";

  const remainingSec = silenceCountdownMs !== null ? (silenceCountdownMs / 1000).toFixed(1) : "10.0";
  const silencePercent = silenceCountdownMs !== null ? (silenceCountdownMs / silenceWindowMs) * 100 : 100;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 shadow-xl transition-all ${
        isAlarm
          ? "border-red-500/60 bg-gradient-to-r from-red-950/80 via-[#150a0e] to-red-950/60 shadow-red-950/30"
          : "border-cyan-500/50 bg-gradient-to-r from-cyan-950/70 via-[#06121a] to-emerald-950/60 shadow-cyan-950/30"
      }`}
    >
      {/* Background glowing indicator */}
      <div
        className={`absolute -right-10 -bottom-10 h-32 w-32 rounded-full blur-2xl pointer-events-none opacity-40 ${
          isAlarm ? "bg-red-500" : "bg-cyan-500"
        }`}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Active Event Info */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-inner ${
              isAlarm ? "bg-red-900/60 text-red-200" : "bg-cyan-900/60 text-cyan-200"
            }`}
          >
            {BEHAVIOR_ICONS[behavior]}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/50">
                <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
                ACTIVE CONTINUOUS VOCALIZATION
              </span>

              {consecutiveCount > 1 && (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/50">
                  <Flame className="h-3 w-3 text-amber-400" />
                  {consecutiveCount}x CONSECUTIVE DETECTIONS
                </span>
              )}
            </div>

            <h3
              className={`text-base font-bold font-mono tracking-tight mt-1 ${
                BEHAVIOR_COLORS[behavior] || "text-white"
              }`}
            >
              {BEHAVIOR_LABELS[behavior]}
            </h3>

            <p className="text-xs text-zinc-400">
              Aggregated via client debouncer • {(confidence * 100).toFixed(0)}% avg confidence
            </p>
          </div>
        </div>

        {/* Right: Duration Timer & Silence Window Countdown */}
        <div className="flex flex-col md:items-end gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-left md:text-right">
              <span className="block text-[10px] font-mono text-zinc-400 uppercase">
                Active Event Duration
              </span>
              <span className="text-xl font-bold font-mono text-white flex items-center gap-1 md:justify-end">
                <Timer className="h-4 w-4 text-cyan-400" />
                {Math.floor(durationSec / 60)}:
                {(durationSec % 60).toString().padStart(2, "0")}s
              </span>
            </div>
          </div>

          {/* 10-Second Silence Window Reset Bar */}
          <div className="w-full md:w-48 space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-zinc-400">
              <span>Silence Reset Window:</span>
              <span className="text-amber-300 font-bold">{remainingSec}s</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900 border border-zinc-700/60">
              <div
                className={`h-full transition-all duration-100 ${
                  isAlarm ? "bg-red-400" : "bg-cyan-400"
                }`}
                style={{ width: `${silencePercent}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-zinc-500 block text-right">
              10s without vocalization finalizes event
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
