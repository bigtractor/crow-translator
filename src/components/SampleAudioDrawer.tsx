// ============================================================
// Calcaine: Sample Audio Modal / Drawer for Demonstration
// ============================================================

"use client";

import React from "react";
import {
  X,
  AlertTriangle,
  Shield,
  Sparkles,
  Radio,
  VolumeX,
} from "lucide-react";

interface SampleAudioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (
    type: "alarm" | "territorial" | "contact" | "food" | "silence"
  ) => void;
}

export function SampleAudioDrawer({
  isOpen,
  onClose,
  onSelectSample,
}: SampleAudioDrawerProps) {
  if (!isOpen) return null;

  const samples = [
    {
      id: "alarm",
      title: "Alarm / Distress Cry",
      desc: "Rapid, harsh caws warning of predator threat",
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
      theme: "border-red-500/30 hover:border-red-500/60 bg-red-950/20",
    },
    {
      id: "food",
      title: "Food Announcement",
      desc: "Excited harmonic bursts signaling discovered food",
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      theme: "border-amber-500/30 hover:border-amber-500/60 bg-amber-950/20",
    },
    {
      id: "territorial",
      title: "Territorial Declaration",
      desc: "Resonant, deliberate canopy boundary call",
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      theme: "border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/20",
    },
    {
      id: "contact",
      title: "Social Contact Call",
      desc: "Gentle flight note keeping acoustic flock cohesion",
      icon: <Radio className="w-5 h-5 text-cyan-400" />,
      theme: "border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-950/20",
    },
    {
      id: "silence",
      title: "Background Ambient (Non-Crow)",
      desc: "Tests silent rejection by Stage 1 gatekeeper",
      icon: <VolumeX className="w-5 h-5 text-zinc-400" />,
      theme: "border-zinc-800 hover:border-zinc-700 bg-zinc-900/40",
    },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#0b120f] border border-emerald-900/60 p-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close demo samples"
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white tracking-tight">
          Test with Crow Audio
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Select a bioacoustic sample to run through the neural translation pipeline:
        </p>

        <div className="mt-4 space-y-2.5">
          {samples.map((sample) => (
            <button
              key={sample.id}
              onClick={() => {
                onSelectSample(sample.id);
                onClose();
              }}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-3.5 active:scale-98 cursor-pointer ${sample.theme}`}
            >
              <div className="p-2.5 rounded-xl bg-zinc-900/80 shrink-0">
                {sample.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white tracking-tight">
                  {sample.title}
                </h4>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {sample.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
