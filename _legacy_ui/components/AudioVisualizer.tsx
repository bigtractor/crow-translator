// ============================================================
// AudioVisualizer Component
// Real-time Oscilloscope & Frequency Spectrum Canvas
// ============================================================

"use client";

import React, { useRef, useEffect, useState } from "react";
import { Activity, Radio, BarChart3 } from "lucide-react";

interface AudioVisualizerProps {
  isCapturing: boolean;
  getAudioVisualData: () => { frequencies: Uint8Array | null; waveform: Uint8Array | null } | null;
  inputLevelDb: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isCapturing,
  getAudioVisualData,
  inputLevelDb,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visualMode, setVisualMode] = useState<"oscilloscope" | "spectrum">("oscilloscope");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark background with bioacoustic phosphor grid
      ctx.fillStyle = "#0c1017";
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid lines
      ctx.strokeStyle = "rgba(16, 185, 129, 0.08)";
      ctx.lineWidth = 1;

      // Horizontal grid
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical grid
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      const visualData = isCapturing ? getAudioVisualData() : null;

      if (!isCapturing || !visualData) {
        // Idle baseline scanline
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);

        const time = Date.now() / 1000;
        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.02 + time * 2) * 2;
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Overlay text
        ctx.fillStyle = "rgba(110, 231, 183, 0.7)";
        ctx.font = "12px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SENSOR DISENGAGED • 48.0 kHz AUDIO PIPELINE IDLE", width / 2, height / 2 - 15);
      } else if (visualMode === "oscilloscope" && visualData.waveform) {
        // === OSCILLOSCOPE WAVEFORM ===
        const buffer = visualData.waveform;
        const sliceWidth = width / buffer.length;

        // Glowing gradient path
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "#06b6d4"); // Cyan
        gradient.addColorStop(0.5, "#10b981"); // Emerald
        gradient.addColorStop(1, "#f59e0b"); // Amber

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(16, 185, 129, 0.6)";

        ctx.beginPath();
        let x = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i] / 128.0; // 0 to 2
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset
      } else if (visualMode === "spectrum" && visualData.frequencies) {
        // === FFT FREQUENCY SPECTRUM ===
        const buffer = visualData.frequencies;
        const barCount = 64;
        const step = Math.floor(buffer.length / barCount);
        const barWidth = width / barCount;

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += buffer[i * step + j];
          }
          const avg = sum / step;
          const barHeight = (avg / 255) * (height - 20);

          // Corvus vocalization band highlight (~1.2kHz to 3.5kHz)
          // At 48kHz, bin index ~ 15 to 40
          const isCorvidBand = i >= 12 && i <= 36;

          const barGradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          if (isCorvidBand) {
            barGradient.addColorStop(0, "rgba(245, 158, 11, 0.3)");
            barGradient.addColorStop(1, "#f59e0b"); // Highlight corvid frequencies in amber
          } else {
            barGradient.addColorStop(0, "rgba(16, 185, 129, 0.2)");
            barGradient.addColorStop(1, "#10b981"); // Normal frequency in emerald
          }

          ctx.fillStyle = barGradient;
          ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
        }

        // Draw Corvid band indicator marker
        const startX = 12 * barWidth;
        const endX = 36 * barWidth;
        ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(startX, 10, endX - startX, height - 20);
        ctx.setLineDash([]);

        ctx.fillStyle = "#f59e0b";
        ctx.font = "10px monospace";
        ctx.fillText("CORVUS TARGET FREQ BAND (1.2k - 3.5kHz)", startX + 6, 25);
      }

      // Draw VU Meter in bottom-left corner
      const dbClamped = Math.max(-60, Math.min(0, inputLevelDb));
      const meterPercent = (dbClamped + 60) / 60; // 0 to 1
      const meterW = 120;
      const meterH = 6;
      const meterX = 14;
      const meterY = height - 16;

      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(meterX, meterY, meterW, meterH);

      const levelGradient = ctx.createLinearGradient(meterX, 0, meterX + meterW, 0);
      levelGradient.addColorStop(0, "#10b981");
      levelGradient.addColorStop(0.7, "#f59e0b");
      levelGradient.addColorStop(1, "#ef4444");

      ctx.fillStyle = levelGradient;
      ctx.fillRect(meterX, meterY, meterW * meterPercent, meterH);

      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${inputLevelDb} dB`, meterX + meterW + 8, meterY + 6);

      rafRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isCapturing, getAudioVisualData, visualMode, inputLevelDb]);

  return (
    <div className="relative rounded-xl border border-emerald-500/30 bg-[#070b10] p-4 shadow-xl shadow-emerald-950/20">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            {isCapturing && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isCapturing ? "bg-emerald-500" : "bg-zinc-600"
              }`}
            ></span>
          </div>
          <span className="text-xs font-mono font-semibold tracking-wider uppercase text-emerald-400">
            DSP Telemetry • 48 kHz Stream
          </span>
          <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-700/50">
            FFT 2048
          </span>
        </div>

        {/* View Switcher */}
        <div className="flex items-center rounded-lg bg-black/40 p-1 border border-white/10">
          <button
            onClick={() => setVisualMode("oscilloscope")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono transition-colors ${
              visualMode === "oscilloscope"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Waveform
          </button>
          <button
            onClick={() => setVisualMode("spectrum")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono transition-colors ${
              visualMode === "spectrum"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Spectrogram FFT
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg border border-emerald-900/40 bg-[#0c1017]">
        <canvas
          ref={canvasRef}
          width={840}
          height={280}
          className="h-full w-full object-cover"
        />

        {/* Top-right real-time status tag */}
        <div className="absolute top-2 right-3 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
            <Radio className={`h-3 w-3 ${isCapturing ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`} />
            {isCapturing ? "STREAMING 48000Hz" : "STANDBY"}
          </span>
        </div>
      </div>
    </div>
  );
};
