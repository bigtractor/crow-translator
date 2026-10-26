// ============================================================
// Header Component
// Bioacoustic Edge Node Cybernetic Header & Telemetry Bar
// ============================================================

"use client";

import React from "react";
import { Cpu, Wifi, Shield, Settings2, Sparkles } from "lucide-react";

interface HeaderProps {
  backend: string;
  isCapturing: boolean;
  onOpenDiagnostics: () => void;
  sharedArrayBufferSupported: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  backend,
  isCapturing,
  onOpenDiagnostics,
  sharedArrayBufferSupported,
}) => {
  return (
    <header className="border-b border-emerald-500/20 bg-[#070b10]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Node Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/20 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/40">
            <span className="text-xl">🦅</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold font-mono tracking-tight text-white flex items-center gap-1.5">
                CORVUS-EDGE
                <span className="text-emerald-400 font-normal">//</span>
                <span className="text-zinc-300 font-normal text-xs sm:text-sm">
                  ACOUSTIC INFERENCE NODE
                </span>
              </h1>
              <span className="hidden sm:inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/30">
                PROTOTYPE v1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Real-time Corvus corone translation via Client-Side WebAssembly & BirdNET
            </p>
          </div>
        </div>

        {/* Telemetry Status Cluster */}
        <div className="flex items-center gap-2">
          {/* Vercel Edge Badge */}
          <div className="hidden md:flex items-center gap-1.5 rounded-lg bg-zinc-900/80 px-2.5 py-1 text-[11px] font-mono text-zinc-300 border border-zinc-800">
            <Wifi className="h-3.5 w-3.5 text-cyan-400" />
            <span>Vercel Edge CDN</span>
          </div>

          {/* Backend / WASM indicator */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-zinc-900/80 px-2.5 py-1 text-[11px] font-mono text-zinc-300 border border-zinc-800">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span>{backend.toUpperCase()}</span>
          </div>

          {/* Sensor Pulse */}
          <div
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-mono border ${
              isCapturing
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isCapturing ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            <span className="hidden xs:inline">
              {isCapturing ? "LIVE (48kHz)" : "STANDBY"}
            </span>
          </div>

          {/* System Diagnostics Trigger */}
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 px-3 py-1 text-xs font-mono text-emerald-300 border border-emerald-700/50 transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Architecture</span>
          </button>
        </div>
      </div>
    </header>
  );
};
