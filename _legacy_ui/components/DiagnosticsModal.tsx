// ============================================================
// DiagnosticsModal Component
// Explains the Client-Side WebAssembly Architecture on Vercel
// (Highlights elimination of WebSocket latency, serverless limits,
// and zero backend audio processing costs)
// ============================================================

"use client";

import React from "react";
import { X, CheckCircle, ShieldCheck, Zap, ServerOff, Cpu, Layers } from "lucide-react";

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharedArrayBufferSupported: boolean;
  backend: string;
  activeTensors: number;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  sharedArrayBufferSupported,
  backend,
  activeTensors,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-emerald-500/30 bg-[#0a0f16] p-6 shadow-2xl text-zinc-200 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Bioacoustic Edge Node Architecture
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs font-sans">
          {/* Architecture Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3">
              <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold mb-1">
                <ServerOff className="h-4 w-4" />
                <span>Zero Server Cost</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Inference runs 100% on the mobile device client. No cloud GPU instances or serverless runtime fees.
              </p>
            </div>

            <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-3">
              <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold mb-1">
                <Zap className="h-4 w-4" />
                <span>Zero WS Latency</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Eliminates WebSocket round-trip transmission times. 3s audio slices are ingested and classified locally in &lt;30ms.
              </p>
            </div>

            <div className="rounded-xl border border-purple-900/60 bg-purple-950/20 p-3">
              <div className="flex items-center gap-2 text-purple-400 font-mono font-bold mb-1">
                <Layers className="h-4 w-4" />
                <span>Vercel Edge CDN</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Static .tflite weights are cached globally across Vercel’s Edge Network bypassing serverless function payload limits.
              </p>
            </div>
          </div>

          {/* Telemetry Matrix */}
          <div className="rounded-xl border border-zinc-800 bg-black/60 p-4 font-mono text-xs space-y-2">
            <h4 className="text-zinc-400 text-[11px] uppercase tracking-wider mb-2">
              System Environment Diagnostics
            </h4>

            <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
              <span className="text-zinc-500">TensorFlow.js Backend:</span>
              <span className="text-emerald-400 font-bold">{backend.toUpperCase()}</span>
            </div>

            <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
              <span className="text-zinc-500">SharedArrayBuffer (WASM Threading):</span>
              <span
                className={`font-bold ${
                  sharedArrayBufferSupported ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {sharedArrayBufferSupported ? "ENABLED (COOP/COEP Headers Active)" : "FALLBACK SINGLE-THREAD"}
              </span>
            </div>

            <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
              <span className="text-zinc-500">Target BirdNET Sample Rate:</span>
              <span className="text-white font-bold">48,000 Hz PCM Float32</span>
            </div>

            <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
              <span className="text-zinc-500">Window Slice Duration:</span>
              <span className="text-white font-bold">3,000 ms (144,000 Samples)</span>
            </div>

            <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
              <span className="text-zinc-500">Gatekeeper Threshold:</span>
              <span className="text-amber-400 font-bold">0.70 (Corvus corone)</span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-500">Active Memory Tensors:</span>
              <span className="text-emerald-400 font-bold">
                {activeTensors} (Explicit tf.dispose() active)
              </span>
            </div>
          </div>

          {/* iOS Safari Audio Policies Notice */}
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-[11px] text-amber-200/90 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong className="font-mono text-amber-300 block mb-0.5">
                iOS Safari Audio Engine Safeguard
              </strong>
              Web Audio contexts are kept uninitialized until the user explicitly triggers the button gesture, completely avoiding iOS autoplay restrictions and silence dropouts.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-mono font-bold text-black transition-colors"
          >
            DISMISS DIAGNOSTICS
          </button>
        </div>
      </div>
    </div>
  );
};
