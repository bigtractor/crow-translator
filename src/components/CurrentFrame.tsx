"use client";

import React from "react";
import type { InferenceResult } from "@/types";
import { CROW_PRESENCE_THRESHOLD, mapClassToBehavior } from "@/lib/crow_labels";

interface CurrentFrameProps {
  frame: InferenceResult | null;
  listening: boolean;
}

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

/**
 * The most recent 3-second window: whether a crow call was heard and, if so,
 * what it means. Kept factual and quiet.
 */
export function CurrentFrame({ frame, listening }: CurrentFrameProps) {
  const score = frame?.detection.score ?? 0;
  const passed = !!frame?.detection.isCrow;
  const bar = Math.round(CROW_PRESENCE_THRESHOLD * 100);
  const top3 = frame?.behaviorTop?.slice(0, 3) ?? [];

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
            <dt className="text-[12px] text-[var(--text-2)]">Crow-call score (needs ≥ {bar}%)</dt>
            <dd className="mono text-[13px]">{frame ? pct(score) : "—"}</dd>
          </div>
          <div className={`meter mt-2 ${passed ? "ok" : ""}`} aria-hidden="true">
            <span style={{ width: `${frame ? Math.min(100, Math.round(score * 100)) : 0}%` }} />
          </div>
        </div>

        <div>
          <dt className="text-[12px] text-[var(--text-2)]">Result</dt>
          <dd className="text-[14px] mt-0.5 font-medium">
            {!frame ? "—" : passed ? "Crow call" : "No crow call"}
          </dd>
        </div>

        <div>
          <dt className="text-[12px] text-[var(--text-2)]">Closest matches</dt>
          <dd className="mt-0.5 space-y-0.5">
            {top3.length > 0 ? (
              top3.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="truncate">{mapClassToBehavior(r.label).title}</span>
                  <span className="text-[var(--text-3)] mono text-[12px]">{pct(r.p)}</span>
                </div>
              ))
            ) : (
              <span className="text-[14px]">—</span>
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
