"use client";

import React from "react";

export type EngineStatus = "loading" | "ready" | "fallback";

interface BrandHeaderProps {
  engineStatus: EngineStatus;
  listening: boolean;
}

function CrowMark() {
  // Minimal corvid silhouette, single colour, no gradients.
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className="text-[var(--text)]"
    >
      <path
        d="M4 16.5c2.6-.4 4.6-1.6 6-3.5l1.2-1.7c.9-1.3 2.2-2.1 3.8-2.3l5.6-.8c.7-.1 1.4.2 1.8.8L24 11l-2.6.9c-.4.1-.6.5-.5.9l.6 1.8c-2.1 1.6-4.3 2.4-6.6 2.6l-1.3 4.3h-1.8l.6-4.2c-1.9-.1-3.5-.9-4.8-2.3L4 16.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BrandHeader({ engineStatus, listening }: BrandHeaderProps) {
  const pill =
    engineStatus === "loading"
      ? { text: "Loading model", tone: "muted" as const }
      : engineStatus === "fallback"
        ? { text: "Model unavailable", tone: "warn" as const }
        : listening
          ? { text: "Listening", tone: "ok" as const }
          : { text: "Ready", tone: "muted" as const };

  const toneClass =
    pill.tone === "ok"
      ? "bg-[var(--ok-soft)] text-[var(--ok)]"
      : pill.tone === "warn"
        ? "bg-[var(--warn-soft)] text-[var(--warn)]"
        : "bg-[var(--muted-soft)] text-[var(--text-2)]";

  return (
    <header className="pt-safe">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <CrowMark />
            <div className="leading-none">
              <div className="text-[17px] font-semibold tracking-[-0.02em]">CrowTrans</div>
              <div className="text-[11px] text-[var(--text-2)] mt-1 tracking-[0.01em]">
                Carrion crow call recognition
              </div>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium ${toneClass}`}
            role="status"
            aria-live="polite"
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full bg-current ${
                pill.tone === "ok" ? "dot-live" : ""
              }`}
            />
            {pill.text}
          </div>
        </div>
      </div>
    </header>
  );
}
