// ============================================================
// InferenceTelemetry Component
// Real-time Visualizer of the Two-Stage ML Inference Pipeline
// Stage 1: BirdNET Gatekeeper (Corvus corone >= 0.70)
// Stage 2: Custom TFLite Crow Behavior Translator
// ============================================================

"use client";

import React from "react";
import type { InferenceResult } from "@/types";
import { BEHAVIOR_LABELS, BEHAVIOR_ICONS, BEHAVIOR_COLORS } from "@/types";
import { ShieldCheck, ShieldAlert, Cpu, CheckCircle2, XCircle, Clock } from "lucide-react";

interface InferenceTelemetryProps {
  lastResult: InferenceResult | null;
  isProcessing: boolean;
}

export const InferenceTelemetry: React.FC<InferenceTelemetryProps> = ({
  lastResult,
  isProcessing,
}) => {
  const birdnet = lastResult?.birdnet;
  const isCrow = birdnet?.isCrow ?? false;
  const crowConfidence = birdnet?.confidence ?? 0;
  const behavior = lastResult?.behavior;
  const behaviorConfidence = lastResult?.behaviorConfidence ?? 0;
  const processingTimeMs = lastResult?.processingTimeMs ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* STAGE 1: BIRDNET GATEKEEPER CARD */}
      <div
        className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
          isCrow
            ? "border-emerald-500/50 bg-[#07130f] shadow-lg shadow-emerald-950/20"
            : "border-zinc-800 bg-[#0a0f16]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-950 text-[10px] font-bold font-mono text-cyan-400 border border-cyan-700/50">
              1
            </span>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
              Stage 1: BirdNET Primary Filter
            </h4>
          </div>
          <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-700">
            Gatekeeper (0.70 Threshold)
          </span>
        </div>

        {/* Target Species Info */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-400 font-sans">Target Species:</span>
          <span className="text-xs font-mono font-semibold text-emerald-300">
            Corvus corone (Carrion Crow)
          </span>
        </div>

        {/* Confidence Meter Bar */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-zinc-400">Species Confidence:</span>
            <span
              className={`font-bold ${
                isCrow ? "text-emerald-400" : "text-zinc-400"
              }`}
            >
              {(crowConfidence * 100).toFixed(1)}%
            </span>
          </div>

          <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-900 border border-zinc-800">
            {/* 70% Gatekeeper Threshold Line */}
            <div
              className="absolute top-0 bottom-0 z-10 w-0.5 bg-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,1)]"
              style={{ left: "70%" }}
            />

            {/* Filled Bar */}
            <div
              className={`h-full transition-all duration-500 ${
                isCrow
                  ? "bg-gradient-to-r from-teal-500 to-emerald-400"
                  : "bg-zinc-600"
              }`}
              style={{ width: `${Math.min(100, crowConfidence * 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>0%</span>
            <span className="text-amber-400 font-semibold">&uarr; 70% Gatekeeper Cutoff</span>
            <span>100%</span>
          </div>
        </div>

        {/* Gatekeeper Decision Outcome */}
        <div className="flex items-center justify-between rounded-lg bg-black/40 p-2.5 border border-white/5">
          <div className="flex items-center gap-2">
            {isCrow ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-zinc-500 shrink-0" />
            )}
            <div className="text-left">
              <div className="text-xs font-mono font-bold text-white">
                {isCrow ? "PASSED GATEKEEPER" : "DISCARDED / SILENCE"}
              </div>
              <div className="text-[10px] text-zinc-400">
                {isCrow
                  ? "Confidence &ge; 0.70 &rarr; Forwarded to Stage 2"
                  : "Confidence < 0.70 &rarr; Tensor discarded to save RAM"}
              </div>
            </div>
          </div>

          <span
            className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
              isCrow
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {isCrow ? "FORWARD" : "DISCARD"}
          </span>
        </div>
      </div>

      {/* STAGE 2: CROW BEHAVIOR TRANSLATOR CARD */}
      <div
        className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
          behavior
            ? "border-cyan-500/50 bg-[#06111a] shadow-lg shadow-cyan-950/20"
            : "border-zinc-800/80 bg-[#0a0f16]/60 opacity-80"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-950 text-[10px] font-bold font-mono text-cyan-400 border border-cyan-700/50">
              2
            </span>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
              Stage 2: Crow Behavior Translator
            </h4>
          </div>
          <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-700">
            crow_behavior.tflite
          </span>
        </div>

        {behavior ? (
          <div>
            {/* Behavior Badge */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-400 font-sans">Classified Call:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{BEHAVIOR_ICONS[behavior]}</span>
                <span
                  className={`text-sm font-mono font-bold ${
                    BEHAVIOR_COLORS[behavior] || "text-white"
                  }`}
                >
                  {BEHAVIOR_LABELS[behavior]}
                </span>
              </div>
            </div>

            {/* Translation Confidence */}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Translator Confidence:</span>
                <span className="font-bold text-cyan-400">
                  {(behaviorConfidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-900 border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, behaviorConfidence * 100)}%` }}
                />
              </div>
            </div>

            {/* Inference Telemetry Footer */}
            <div className="flex items-center justify-between rounded-lg bg-black/40 p-2 text-[11px] font-mono text-zinc-400 border border-white/5">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                Latency: <span className="text-white font-bold">{processingTimeMs} ms</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Cpu className="h-3.5 w-3.5" />
                WASM Edge Client
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-500">
            <Cpu className="h-8 w-8 mb-2 opacity-40 text-zinc-600" />
            <span className="text-xs font-mono text-zinc-400">Translator Idle</span>
            <span className="text-[10px] text-zinc-600 max-w-xs mt-0.5">
              Stage 2 remains dormant until Stage 1 detects Corvus corone with &ge; 0.70 confidence.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
