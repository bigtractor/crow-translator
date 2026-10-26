"use client";

import React from "react";
import { Mic, Square } from "lucide-react";
import { GlassButton } from "./GlassButton";
import type { EngineStatus } from "./BrandHeader";

interface ListenPanelProps {
  engineStatus: EngineStatus;
  engineStatusText: string;
  listening: boolean;
  processing: boolean;
  levelDb: number;
  suspended: boolean;
  error: string | null;
  onToggle: () => void;
  onResume: () => void;
}

export function ListenPanel({
  engineStatus,
  engineStatusText,
  listening,
  processing,
  levelDb,
  suspended,
  error,
  onToggle,
  onResume,
}: ListenPanelProps) {
  // Map -60..0 dB to 0..100 %
  const level = Math.max(0, Math.min(100, ((levelDb + 60) / 60) * 100));
  const disabled = engineStatus === "loading";

  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="listen-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="listen-heading" className="text-[15px] font-semibold tracking-[-0.01em]">
            Microphone
          </h2>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            {listening
              ? "Analysing 3-second windows on this device."
              : "Audio is processed locally and never uploaded."}
          </p>
        </div>
        <div className="text-right">
          <div className="mono text-[13px] text-[var(--text-2)]">{levelDb <= -60 ? "—" : `${levelDb} dB`}</div>
          <div className="text-[11px] text-[var(--text-3)] mt-0.5">input level</div>
        </div>
      </div>

      <div className={`meter mt-4 ${listening ? "ok" : ""}`} aria-hidden="true">
        <span style={{ width: `${listening ? level : 0}%` }} />
      </div>

      <div className="mt-5">
        <GlassButton
          variant={listening ? "glass" : "primary"}
          size="lg"
          pill
          block
          disabled={disabled}
          onClick={onToggle}
          aria-pressed={listening}
          icon={listening ? <Square size={18} strokeWidth={2.25} /> : <Mic size={20} strokeWidth={2} />}
        >
          {listening ? "Stop listening" : "Start listening"}
        </GlassButton>
      </div>

      {suspended ? (
        <div className="mt-3">
          <GlassButton size="sm" pill block onClick={onResume}>
            Tap to resume audio
          </GlassButton>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-[12px] text-[var(--text-2)]">
        <span className="truncate">{engineStatusText}</span>
        <span className="flex-none ml-3">
          {processing ? "Analysing…" : listening ? "Idle between windows" : ""}
        </span>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] text-[var(--warn)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
