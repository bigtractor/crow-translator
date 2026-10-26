// ============================================================
// Calcaine: Friendly Human-Readable Error Modal
// ============================================================

"use client";

import React from "react";
import { MicOff, X, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";

interface ErrorModalProps {
  isOpen: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onRetry: () => void;
  onUseDemo: () => void;
}

export function ErrorModal({
  isOpen,
  errorMessage,
  onClose,
  onRetry,
  onUseDemo,
}: ErrorModalProps) {
  if (!isOpen || !errorMessage) return null;

  const isPermissionDenied =
    errorMessage.toLowerCase().includes("permission") ||
    errorMessage.toLowerCase().includes("notallowed") ||
    errorMessage.toLowerCase().includes("denied") ||
    errorMessage.toLowerCase().includes("microphone");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#0c1410] border border-emerald-900/60 p-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 shadow-inner">
          <MicOff className="w-6 h-6" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white tracking-tight">
          {isPermissionDenied
            ? "Microphone Access Required"
            : "Audio Setup Notice"}
        </h3>

        {/* Description */}
        <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
          {isPermissionDenied
            ? "Calcaine translates crow vocalizations directly through your microphone. Please allow microphone access in your browser or device settings to continue."
            : "We encountered an issue initializing the audio pipeline. Tap retry or test with sample audio."}
        </p>

        {/* Privacy Note */}
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/30 text-xs text-emerald-300/90">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Audio is analyzed 100% locally on your device and is never saved or uploaded.
          </span>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={() => {
              onClose();
              onRetry();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onUseDemo();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 active:scale-98 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Use Demo Audio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
