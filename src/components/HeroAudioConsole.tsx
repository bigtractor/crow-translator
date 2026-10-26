// ============================================================
// Calcaine: Hero Audio Intelligence Console & Bioacoustic Canvas
// ============================================================

"use client";

import React, { useEffect, useRef } from "react";
import { Mic, Square, Loader2, Volume2, ShieldCheck, Cpu, Waves } from "lucide-react";

interface HeroAudioConsoleProps {
  isCapturing: boolean;
  isProcessing: boolean;
  isAudioContextSuspended: boolean;
  inputLevelDb: number;
  onToggleCapture: () => void;
  onResumeAudioContext: () => void;
  getAudioVisualData: () => {
    frequencies: Uint8Array | null;
    waveform: Uint8Array | null;
  } | null;
}

export function HeroAudioConsole({
  isCapturing,
  isProcessing,
  isAudioContextSuspended,
  inputLevelDb,
  onToggleCapture,
  onResumeAudioContext,
  getAudioVisualData,
}: HeroAudioConsoleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleClick = () => {
    if (isAudioContextSuspended) {
      onResumeAudioContext();
    }
    onToggleCapture();
  };

  // Organic Spectrum Waveform Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      phase += 0.04;

      if (!isCapturing) {
        // Idle ambient gentle breathing wave
        ctx.beginPath();
        ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
        ctx.lineWidth = 2;
        const midY = height / 2;
        for (let x = 0; x < width; x += 3) {
          const y = midY + Math.sin(phase + x * 0.02) * 5 * Math.sin(x / width * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const visualData = getAudioVisualData();
      const midY = height / 2;

      // Draw mirrored harmonic frequency spectrum
      if (visualData && visualData.frequencies) {
        const freqs = visualData.frequencies;
        const count = 48;
        const step = Math.floor(freqs.length / (count * 2));
        const barWidth = width / count;

        for (let i = 0; i < count; i++) {
          const val = freqs[i * step] || 0;
          const norm = Math.min(1, Math.max(0.05, val / 230));
          const barH = norm * (height * 0.75);

          const x = i * barWidth;
          const y = (height - barH) / 2;

          // Gradient color: Emerald to Cyan
          const grad = ctx.createLinearGradient(0, y, 0, y + barH);
          grad.addColorStop(0, "rgba(52, 211, 153, 0.9)");
          grad.addColorStop(0.5, "rgba(6, 182, 212, 0.7)");
          grad.addColorStop(1, "rgba(16, 185, 129, 0.3)");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x + 1.5, y, barWidth - 3, barH, 4);
          ctx.fill();
        }
      }

      // Draw dynamic glowing center waveform curve
      ctx.beginPath();
      ctx.strokeStyle = "rgba(110, 231, 183, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "rgba(16, 185, 129, 0.8)";
      ctx.shadowBlur = 10;

      for (let x = 0; x < width; x += 4) {
        const normX = x / width;
        const envelope = Math.sin(normX * Math.PI);
        const y =
          midY +
          Math.sin(phase * 1.5 + x * 0.05) *
            (12 + Math.max(0, inputLevelDb + 60) * 0.4) *
            envelope;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isCapturing, inputLevelDb, getAudioVisualData]);

  return (
    <div className="relative w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#0d1612]/90 via-[#09100d]/90 to-[#060a08]/90 border border-emerald-900/40 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col items-center select-none">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Top Architecture Metadata Pills */}
      <div className="w-full flex items-center justify-between gap-2 mb-6 text-[11px] font-semibold text-zinc-400">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800">
          <Waves className="w-3 h-3 text-emerald-400" />
          <span>48.0 kHz Dual-Stage Buffer</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>WASM Neural Core</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Zero Cloud Latency</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CENTRAL REACTOR: THE MASSIVE TACTILE TOGGLE HUB           */}
      {/* ======================================================== */}
      <div className="relative flex items-center justify-center my-4">
        {/* Layered glowing concentric rings when listening */}
        {isCapturing && (
          <>
            <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-emerald-500/15 animate-ping pointer-events-none" />
            <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full border border-emerald-500/30 animate-ring-pulse pointer-events-none" />
            <div className="absolute w-80 h-80 sm:w-92 sm:h-92 rounded-full border border-emerald-500/15 animate-ripple-wave pointer-events-none" />
          </>
        )}

        {/* Ambient Halo */}
        <div
          className={`absolute w-56 h-56 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
            isCapturing
              ? "bg-rose-500/30 scale-125"
              : "bg-emerald-500/25 group-hover:bg-emerald-400/35"
          }`}
        />

        {/* The Hero Button */}
        <button
          onClick={handleClick}
          type="button"
          aria-label={isCapturing ? "Stop Listening" : "Start Listening"}
          className={`relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-full flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all duration-150 transform focus:outline-none shadow-2xl ${
            isCapturing
              ? "bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 text-white border-4 sm:border-6 border-rose-300 shadow-[0_0_50px_rgba(244,63,94,0.6)] animate-breathe"
              : "bg-gradient-to-b from-emerald-400 via-emerald-600 to-emerald-800 text-white border-4 sm:border-6 border-emerald-300 shadow-[0_0_50px_rgba(16,185,129,0.5)] hover:shadow-[0_0_65px_rgba(16,185,129,0.7)] hover:scale-103"
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-14 h-14 sm:w-16 sm:h-16 animate-spin text-white drop-shadow-lg" />
          ) : isCapturing ? (
            <>
              <Square className="w-12 h-12 sm:w-14 sm:h-14 fill-current text-white drop-shadow-md mb-1" />
              <span className="font-black text-xl sm:text-2xl uppercase tracking-wider drop-shadow-md">
                STOP
              </span>
              <span className="font-bold text-[11px] tracking-widest text-rose-100 uppercase">
                LISTENING
              </span>
            </>
          ) : (
            <>
              <Mic className="w-14 h-14 sm:w-16 sm:h-16 text-white drop-shadow-md mb-1" />
              <span className="font-black text-xl sm:text-2xl uppercase tracking-wider drop-shadow-md">
                START
              </span>
              <span className="font-bold text-[11px] tracking-widest text-emerald-100 uppercase">
                TRANSLATING
              </span>
            </>
          )}
        </button>
      </div>

      {/* Live Audio Visualizer Canvas */}
      <div className="w-full max-w-md h-16 sm:h-20 mt-6 relative flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={450}
          height={80}
          className="w-full h-full opacity-90"
        />
      </div>

      {/* Subtitle / Status Line */}
      <p className="mt-2 text-xs sm:text-sm font-semibold text-zinc-400 text-center">
        {isCapturing ? (
          <span className="text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-dot" />
            Analyzing ambient acoustics for Carrion Crow vocalizations (1.2–4.5 kHz)
          </span>
        ) : (
          "Tap the reactor to initialize iOS Safari 48.0 kHz client-side ML pipeline"
        )}
      </p>
    </div>
  );
}
