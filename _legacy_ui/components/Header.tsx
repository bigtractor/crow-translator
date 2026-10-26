// ============================================================
// Calcaine: Minimalist Brand Header & Ambient Status Pill
// ============================================================

"use client";

import React from "react";
import { Sparkles, ShieldCheck } from "lucide-react";

interface HeaderProps {
  isCapturing: boolean;
  isProcessing: boolean;
  onOpenDemo?: () => void;
}

export function Header({ isCapturing, isProcessing, onOpenDemo }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-[#080c0a]/85 border-b border-emerald-950/40 transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 border border-emerald-500/30 text-emerald-400 shadow-inner">
            {/* Custom stylized feather/raven icon */}
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M21.71 2.29a1 1 0 0 0-1.05-.24c-2.45.86-5.87 2.47-8.73 4.88-3.05 2.58-4.93 5.48-4.93 8.07 0 1.25.43 2.37 1.24 3.24.84.9 2.01 1.41 3.26 1.41 2.59 0 5.49-1.88 8.07-4.93 2.41-2.86 4.02-6.28 4.88-8.73a1 1 0 0 0-.24-1.05l-2.5-2.65zm-7.9 14.5c-.75 0-1.42-.29-1.88-.79-.43-.46-.68-1.08-.68-1.75 0-1.85 1.55-4.14 4.06-6.38 1.48-1.32 3.09-2.39 4.67-3.15-.76 1.58-1.83 3.19-3.15 4.67-2.24 2.51-4.53 4.06-6.38 4.06zM3 21h4c.55 0 1-.45 1-1s-.45-1-1-1H4.41l4.3-4.29a1 1 0 1 0-1.42-1.42L3 18.59V15c0-.55-.45-1-1-1s-1 .45-1 1v5c0 .55.45 1 1 1z" />
            </svg>
            {isCapturing && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-base tracking-tight text-white">
                Calcaine
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Beta
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-none">
              Corvus corone bioacoustics
            </p>
          </div>
        </div>

        {/* Right Action / Status Pill */}
        <div className="flex items-center gap-2">
          {/* Live Audio State Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-300 ${
              isProcessing
                ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                : isCapturing
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]"
                : "bg-zinc-900/60 border-zinc-800 text-zinc-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isProcessing
                  ? "bg-amber-400 animate-pulse"
                  : isCapturing
                  ? "bg-emerald-400 animate-live-dot"
                  : "bg-zinc-500"
              }`}
            />
            <span className="text-[11px] tracking-wide">
              {isProcessing
                ? "Translating..."
                : isCapturing
                ? "Listening"
                : "Ready"}
            </span>
          </div>

          {/* Quick Demo Button for users without real crows */}
          {onOpenDemo && (
            <button
              onClick={onOpenDemo}
              aria-label="Test with sample crow vocalization"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/40 hover:bg-emerald-900/40 active:scale-95 text-emerald-300 border border-emerald-800/40 transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Demo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
