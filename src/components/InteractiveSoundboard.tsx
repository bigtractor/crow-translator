// ============================================================
// Calcaine: Interactive Crow Audio Soundboard
// ============================================================

"use client";

import React from "react";
import { Sparkles, AlertTriangle, Shield, Radio, Volume2, Flame } from "lucide-react";

interface InteractiveSoundboardProps {
  onTriggerSample: (
    type: "alarm" | "territorial" | "contact" | "food" | "silence"
  ) => void;
  isProcessing: boolean;
}

export function InteractiveSoundboard({
  onTriggerSample,
  isProcessing,
}: InteractiveSoundboardProps) {
  const cards = [
    {
      id: "alarm" as const,
      label: "🚨 Danger Nearby",
      sub: "1.75 kHz harsh rapid caws",
      theme:
        "from-rose-950/60 to-rose-900/40 border-rose-500/40 hover:border-rose-400 text-rose-200 hover:shadow-[0_4px_20px_rgba(244,63,94,0.3)]",
      badge: "ALARM",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    },
    {
      id: "food" as const,
      label: "🦅 Mobbing Predator",
      sub: "Harass predator scold",
      theme:
        "from-orange-950/60 to-orange-900/40 border-orange-500/40 hover:border-orange-400 text-orange-200 hover:shadow-[0_4px_20px_rgba(249,115,22,0.3)]",
      badge: "MOBBING",
      badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    },
    {
      id: "territorial" as const,
      label: "📢 Back Off Warning",
      sub: "Resonant canopy declaration",
      theme:
        "from-amber-950/60 to-amber-900/40 border-amber-500/40 hover:border-amber-400 text-amber-200 hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)]",
      badge: "TERRITORY",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    },
    {
      id: "contact" as const,
      label: "💬 Pair-Bond Duet",
      sub: "Partner acoustic contact",
      theme:
        "from-cyan-950/60 to-cyan-900/40 border-cyan-500/40 hover:border-cyan-400 text-cyan-200 hover:shadow-[0_4px_20px_rgba(6,182,212,0.3)]",
      badge: "SOCIAL",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    },
  ];

  return (
    <div className="w-full my-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Bioacoustic Soundboard (Instant Test Demos)
          </h2>
        </div>
        <span className="text-[11px] text-zinc-500 hidden sm:inline">
          Tap to trigger authentic audio through neural engine
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => onTriggerSample(card.id)}
            disabled={isProcessing}
            className={`p-3.5 rounded-2xl bg-gradient-to-br border transition-all duration-200 text-left flex flex-col justify-between group active:scale-95 cursor-pointer shadow-md ${card.theme} disabled:opacity-50`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span
                className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border ${card.badgeColor}`}
              >
                {card.badge}
              </span>
              <Volume2 className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-white tracking-tight leading-tight">
                {card.label}
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                {card.sub}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
