// ============================================================
// MicrophoneControl Component
// Prominent Mobile-Responsive Audio Ingestion Controller
// Compliant with iOS Safari user-gesture AudioContext policies
// ============================================================

"use client";

import React from "react";
import { Mic, MicOff, AlertCircle, Sparkles, Volume2, ShieldAlert } from "lucide-react";

interface MicrophoneControlProps {
  isCapturing: boolean;
  onToggleCapture: () => void;
  onInjectSynthetic: (type: "alarm" | "territorial" | "contact" | "food" | "silence") => void;
  error: string | null;
  isAudioContextSuspended: boolean;
  onResumeAudioContext: () => void;
  isProcessing: boolean;
}

export const MicrophoneControl: React.FC<MicrophoneControlProps> = ({
  isCapturing,
  onToggleCapture,
  onInjectSynthetic,
  error,
  isAudioContextSuspended,
  onResumeAudioContext,
  isProcessing,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Primary Mic Button Card */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-[#0e1722] to-[#070b10] p-6 text-center shadow-2xl shadow-emerald-950/30">
        {/* Glow ambient background effect */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none ${
            isCapturing ? "bg-emerald-500/25 opacity-100" : "bg-cyan-500/10 opacity-40"
          }`}
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* iOS Safari Context Resume Prompt (if suspended) */}
          {isAudioContextSuspended && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-1.5 border border-amber-500/40 text-xs font-mono text-amber-300">
              <ShieldAlert className="h-4 w-4" />
              <span>iOS AudioContext asleep. Tap below to reactivate stream.</span>
            </div>
          )}

          {/* Big Tactile Action Button */}
          <button
            id="mic-toggle-btn"
            onClick={isAudioContextSuspended ? onResumeAudioContext : onToggleCapture}
            className={`group relative flex h-28 w-28 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 active:scale-95 ${
              isCapturing
                ? "bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-rose-900/50 hover:from-red-500 hover:to-rose-400"
                : "bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-900/50 hover:from-emerald-500 hover:to-teal-400"
            }`}
          >
            {/* Pulsing ring when active */}
            {isCapturing && (
              <span className="absolute -inset-2 rounded-full border-2 border-rose-500/60 animate-ping" />
            )}

            <div className="flex flex-col items-center">
              {isCapturing ? (
                <MicOff className="h-10 w-10 transition-transform group-hover:scale-110" />
              ) : (
                <Mic className="h-10 w-10 transition-transform group-hover:scale-110" />
              )}
            </div>
          </button>

          {/* Action Labels */}
          <div className="mt-4">
            <h3 className="text-lg font-bold tracking-tight text-white font-mono">
              {isCapturing ? "EDGE SENSOR ACTIVE" : "ARM BIOACOUSTIC SENSOR"}
            </h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm font-sans">
              {isCapturing
                ? "Capturing 48kHz PCM audio in 3-second slices. Evaluating BirdNET + TFLite in client WebAssembly."
                : "Tap to initialize 48.0 kHz Web Audio pipeline. iOS Safari compatible single-gesture activation."}
            </p>
          </div>

          {/* Telemetry Status Pills */}
          <div className="mt-4 flex flex-wrap justify-center items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono border ${
                isCapturing
                  ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                  : "bg-zinc-900 border-zinc-700/50 text-zinc-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isCapturing ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                }`}
              />
              {isCapturing ? "LISTENING (48kHz)" : "OFFLINE"}
            </span>

            {isProcessing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/50 px-3 py-1 text-xs font-mono text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-spin" />
                INFERRING 3s SLICE
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900/80 border border-zinc-800 px-3 py-1 text-xs font-mono text-zinc-400">
              BUFFER: 144,000 SAMPLES
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-950/60 p-3 text-left text-xs text-red-300 border border-red-800/60 max-w-md">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Simulation & Test Suite */}
      <div className="rounded-xl border border-zinc-800 bg-[#0a0f16] p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Interactive Bioacoustic Injector</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            Simulate Corvus corone Calls for Testing
          </span>
        </div>

        <p className="text-xs text-zinc-400 mb-3 font-sans">
          Test the two-stage gatekeeper (&ge;0.70 threshold) and debounce aggregator without waiting for a crow outside:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={() => onInjectSynthetic("alarm")}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-700/40 text-red-300 transition-colors group text-center"
          >
            <span className="text-base group-hover:scale-110 transition-transform">⚠️</span>
            <span className="text-xs font-mono font-semibold mt-1">Alarm Call</span>
            <span className="text-[10px] text-red-400/80">4 rapid bursts</span>
          </button>

          <button
            onClick={() => onInjectSynthetic("territorial")}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/40 text-amber-300 transition-colors group text-center"
          >
            <span className="text-base group-hover:scale-110 transition-transform">🏴</span>
            <span className="text-xs font-mono font-semibold mt-1">Territorial</span>
            <span className="text-[10px] text-amber-400/80">2 resonant calls</span>
          </button>

          <button
            onClick={() => onInjectSynthetic("food")}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/40 text-emerald-300 transition-colors group text-center"
          >
            <span className="text-base group-hover:scale-110 transition-transform">🍖</span>
            <span className="text-xs font-mono font-semibold mt-1">Food Call</span>
            <span className="text-[10px] text-emerald-400/80">3 rising calls</span>
          </button>

          <button
            onClick={() => onInjectSynthetic("contact")}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-700/40 text-cyan-300 transition-colors group text-center"
          >
            <span className="text-base group-hover:scale-110 transition-transform">📡</span>
            <span className="text-xs font-mono font-semibold mt-1">Contact Call</span>
            <span className="text-[10px] text-cyan-400/80">1 flight note</span>
          </button>

          <button
            onClick={() => onInjectSynthetic("silence")}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 transition-colors group text-center col-span-2 sm:col-span-1"
          >
            <span className="text-base group-hover:scale-110 transition-transform">🍃</span>
            <span className="text-xs font-mono font-semibold mt-1">Ambient Noise</span>
            <span className="text-[10px] text-zinc-400/80">Gatekeeper reject</span>
          </button>
        </div>
      </div>
    </div>
  );
};
