// ============================================================
// Calcaine: Full Web App Header (High-End AI SaaS Brand Bar)
// ============================================================

"use client";

import React from "react";
import { Sparkles, Shield, BookOpen, Volume2, Radio } from "lucide-react";

interface FullAppHeaderProps {
  isCapturing: boolean;
  isProcessing: boolean;
  activeBackend: string;
  onOpenTaxonomy: () => void;
  onOpenPrivacy: () => void;
  onOpenSoundboard: () => void;
}

export function FullAppHeader({
  isCapturing,
  isProcessing,
  activeBackend,
  onOpenTaxonomy,
  onOpenPrivacy,
  onOpenSoundboard,
}: FullAppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-[#070b09]/85 border-b border-emerald-900/30 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400/20 via-emerald-600/30 to-emerald-950/80 border border-emerald-400/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M21.71 2.29a1 1 0 0 0-1.05-.24c-2.45.86-5.87 2.47-8.73 4.88-3.05 2.58-4.93 5.48-4.93 8.07 0 1.25.43 2.37 1.24 3.24.84.9 2.01 1.41 3.26 1.41 2.59 0 5.49-1.88 8.07-4.93 2.41-2.86 4.02-6.28 4.88-8.73a1 1 0 0 0-.24-1.05l-2.5-2.65zm-7.9 14.5c-.75 0-1.42-.29-1.88-.79-.43-.46-.68-1.08-.68-1.75 0-1.85 1.55-4.14 4.06-6.38 1.48-1.32 3.09-2.39 4.67-3.15-.76 1.58-1.83 3.19-3.15 4.67-2.24 2.51-4.53 4.06-6.38 4.06zM3 21h4c.55 0 1-.45 1-1s-.45-1-1-1H4.41l4.3-4.29a1 1 0 1 0-1.42-1.42L3 18.59V15c0-.55-.45-1-1-1s-1 .45-1 1v5c0 .55.45 1 1 1z" />
            </svg>
            {isCapturing && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white font-sans">
                CALCAINE
              </span>
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                AI v2.4
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium hidden sm:block">
              Real-time <span className="text-emerald-400/90 italic">Corvus corone</span> bioacoustic intelligence
            </p>
          </div>
        </div>

        {/* Center: Live Neural Pipeline Status */}
        <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900/70 border border-zinc-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isProcessing
                ? "bg-amber-400 animate-ping"
                : isCapturing
                ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"
                : "bg-emerald-500/50"
            }`}
          />
          <span className="text-zinc-300 font-medium">
            {isProcessing
              ? "Neural Inference Active..."
              : isCapturing
              ? "48.0 kHz Listening Active"
              : "Model Ready (6,539 classes)"}
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-[11px] font-mono text-emerald-400/80">
            {activeBackend}
          </span>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {/* Soundboard Button */}
          <button
            onClick={onOpenSoundboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 hover:border-emerald-500/50 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Soundboard</span>
            <span className="sm:hidden">Test</span>
          </button>

          {/* Taxonomy Dictionary Button */}
          <button
            onClick={onOpenTaxonomy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Browse 17 Corvus corone behavior taxonomy classes"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Taxonomy</span>
          </button>

          {/* Privacy Button */}
          <button
            onClick={onOpenPrivacy}
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 active:scale-95 transition-all cursor-pointer"
            title="Private On-Device Inference Details"
          >
            <Shield className="w-4 h-4 text-emerald-400/80" />
          </button>
        </div>
      </div>
    </header>
  );
}
