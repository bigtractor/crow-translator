"use client";

import React from "react";
import type { InferenceResult } from "@/types";
import { CROW_CONFIDENCE_THRESHOLD } from "@/lib/inference_engine";

interface CurrentFrameProps {
  frame: InferenceResult | null;
  listening: boolean;
}

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

function shortSpecies(label?: string): string {
  if (!label) return "—";
  const i = label.indexOf("_");
  return i >= 0 ? label.slice(i + 1) : label;
}

/**
 * The most recent 3-second window: Stage 1 species gate and, if it passed,
 * the Stage 2 behaviour. Kept factual and quiet.
 */
export function CurrentFrame({ frame, listening }: CurrentFrameProps) {
  const gate = frame?.birdnet.confidence ?? 0;
  const passed = !!frame?.birdnet.isCrow;
  const threshold = Math.round(CROW_CONFIDENCE_THRESHOLD * 100);

  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="frame-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="frame-heading" className="text-[15px] font-semibold tracking-[-0.01em]">
          Latest window
        </h2>
        <span className="text-[12px] text-[var(--text-3)] mono">
          {frame ? `${frame.processingTimeMs} ms` : listening ? "waiting…" : "not listening"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
        <div className="col-span-2">
          <div className="flex items-baseline justify-between">
            <dt className="text-[12px] text-[var(--text-2)]">Crow likelihood (gate ≥ {threshold}%)</dt>
            <dd className="mono text-[13px]">{frame ? pct(gate) : "—"}</dd>
          </div>
          <div className={`meter mt-2 ${passed ? "ok" : ""}`} aria-hidden="true">
            <span style={{ width: `${frame ? Math.round(gate * 100) : 0}%` }} />
          </div>
        </div>

        <div>
          <dt className="text-[12px] text-[var(--text-2)]">Result</dt>
          <dd className="text-[14px] mt-0.5 font-medium">
            {!frame ? "—" : frame.simulated ? "Model not loaded" : passed ? "Crow call" : "Not a crow"}
          </dd>
        </div>

        <div>
          <dt className="text-[12px] text-[var(--text-2)]">Closest species</dt>
          <dd className="text-[14px] mt-0.5 truncate" title={frame?.birdnet.topSpecies}>
            {frame?.birdnet.topSpecies ? (
              <>
                {shortSpecies(frame.birdnet.topSpecies)}{" "}
                <span className="text-[var(--text-3)] mono text-[12px]">
                  {pct(frame.birdnet.topSpeciesConfidence)}
                </span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>

        <div className="col-span-2 pt-3 border-t border-[var(--hairline)]">
          <dt className="text-[12px] text-[var(--text-2)]">Meaning</dt>
          <dd className="mt-0.5">
            {passed && frame?.customTitle ? (
              <>
                <div className="text-[15px] font-medium tracking-[-0.01em]">
                  {frame.customTitle}{" "}
                  <span className="text-[var(--text-3)] mono text-[12px] font-normal">
                    {pct(frame.behaviorConfidence)}
                  </span>
                </div>
                <div className="text-[13px] text-[var(--text-2)] mt-0.5">{frame.customMeaning}</div>
              </>
            ) : (
              <div className="text-[14px] text-[var(--text-3)]">
                {frame ? "No translation for this window." : "—"}
              </div>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
