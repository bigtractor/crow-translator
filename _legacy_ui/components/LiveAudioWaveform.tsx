// ============================================================
// Calcaine: Sleek Consumer Audio Waveform Indicator
// ============================================================

"use client";

import React, { useEffect, useRef } from "react";

interface LiveAudioWaveformProps {
  isCapturing: boolean;
  getAudioVisualData: () => {
    frequencies: Uint8Array | null;
    waveform: Uint8Array | null;
  } | null;
}

export function LiveAudioWaveform({
  isCapturing,
  getAudioVisualData,
}: LiveAudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let bars = 24;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isCapturing) {
        // Idle gentle subtle wave
        const time = Date.now() * 0.002;
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
        const barWidth = canvas.width / bars;
        const gap = 3;
        for (let i = 0; i < bars; i++) {
          const h = Math.sin(time + i * 0.3) * 3 + 4;
          const x = i * barWidth + gap / 2;
          const y = (canvas.height - h) / 2;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth - gap, h, 2);
          ctx.fill();
        }
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const visualData = getAudioVisualData();
      const barWidth = canvas.width / bars;
      const gap = 3;

      if (visualData && visualData.frequencies) {
        const freqs = visualData.frequencies;
        // Focus on mid/high-mid frequencies where crow vocalizations reside (500Hz - 4kHz)
        const step = Math.floor(freqs.length / (bars * 2));

        for (let i = 0; i < bars; i++) {
          const dataIndex = Math.min(freqs.length - 1, (i + 4) * step);
          const rawVal = freqs[dataIndex] || 0;
          const normalized = Math.min(1, Math.max(0.08, rawVal / 220));
          const h = Math.max(4, normalized * (canvas.height - 8));
          const x = i * barWidth + gap / 2;
          const y = (canvas.height - h) / 2;

          // Gradient color depending on height
          const grad = ctx.createLinearGradient(0, y, 0, y + h);
          grad.addColorStop(0, "rgba(52, 211, 153, 0.95)");
          grad.addColorStop(1, "rgba(16, 185, 129, 0.5)");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth - gap, h, 3);
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isCapturing, getAudioVisualData]);

  return (
    <div className="w-full flex justify-center items-center py-1">
      <div className="w-48 sm:w-64 h-8 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={256}
          height={32}
          className="w-full h-full opacity-80"
        />
      </div>
    </div>
  );
}
