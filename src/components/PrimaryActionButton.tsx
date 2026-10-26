// ============================================================
// Calcaine: Massive Primary Action Button (Single Gesture iOS Safari Compliant)
// ============================================================

"use client";

import React from "react";
import { Mic, Square, Loader2 } from "lucide-react";

interface PrimaryActionButtonProps {
  isCapturing: boolean;
  isProcessing: boolean;
  isAudioContextSuspended: boolean;
  onToggleCapture: () => void;
  onResumeAudioContext: () => void;
}

export function PrimaryActionButton({
  isCapturing,
  isProcessing,
  isAudioContextSuspended,
  onToggleCapture,
  onResumeAudioContext,
}: PrimaryActionButtonProps) {
  const handleClick = () => {
    // Satisfy strict iOS Safari user gesture requirement
    if (isAudioContextSuspended) {
      onResumeAudioContext();
    }
    onToggleCapture();
  };

  return (
    <div className="flex flex-col items-center justify-center py-2 select-none">
      {/* Outer Glow & Ripple Area */}
      <div className="relative flex items-center justify-center">
        {/* Animated concentric rings when active */}
        {isCapturing && (
          <>
            <div className="absolute w-36 h-36 rounded-full bg-emerald-500/15 animate-ping pointer-events-none" />
            <div className="absolute w-44 h-44 rounded-full border border-emerald-500/20 animate-ring-pulse pointer-events-none" />
            <div className="absolute w-52 h-52 rounded-full border border-emerald-500/10 animate-ripple-wave pointer-events-none" />
          </>
        )}

        {/* Ambient background glow */}
        <div
          className={`absolute w-32 h-32 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
            isCapturing
              ? "bg-emerald-500/35 scale-125"
              : "bg-emerald-600/15 group-hover:bg-emerald-500/25"
          }`}
        />

        {/* The Massive Button */}
        <button
          onClick={handleClick}
          type="button"
          aria-label={isCapturing ? "Stop Listening" : "Start Listening"}
          className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform active:scale-92 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/50 shadow-2xl ${
            isCapturing
              ? "bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-[0_0_40px_rgba(16,185,129,0.5)] border-2 border-emerald-300/40 animate-breathe"
              : "bg-gradient-to-b from-emerald-500/90 to-emerald-800 text-white shadow-[0_10px_30px_rgba(5,150,105,0.3)] hover:shadow-[0_12px_36px_rgba(16,185,129,0.4)] border border-emerald-400/30 hover:scale-103"
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-9 h-9 sm:w-10 sm:h-10 animate-spin text-white drop-shadow" />
          ) : isCapturing ? (
            <div className="flex flex-col items-center justify-center gap-1">
              <Square className="w-8 h-8 sm:w-9 sm:h-9 fill-current text-white drop-shadow" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1">
              <Mic className="w-9 h-9 sm:w-10 sm:h-10 text-white drop-shadow transition-transform group-hover:scale-110" />
            </div>
          )}
        </button>
      </div>

      {/* Button State Labeling */}
      <div className="mt-4 text-center">
        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center justify-center gap-2">
          {isProcessing ? (
            <span className="text-amber-300">Translating Call...</span>
          ) : isCapturing ? (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-dot" />
              Listening for Crows
            </span>
          ) : (
            "Start Listening"
          )}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
          {isCapturing
            ? "Tap button to stop microphone"
            : "Tap to activate real-time translation"}
        </p>
      </div>
    </div>
  );
}
