"use client";

import React from "react";
import { CROW_PRESENCE_THRESHOLD } from "@/lib/inference_engine";

interface InfoFooterProps {
  backend: string;
  modelLoaded: boolean;
}

export function InfoFooter({ backend, modelLoaded }: InfoFooterProps) {
  return (
    <footer className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 pb-safe pt-6">
      <div className="grid gap-4 sm:grid-cols-3 text-[12px] text-[var(--text-2)]">
        <div>
          <div className="text-[var(--text-3)] uppercase tracking-[0.08em] text-[10px] mb-1">Model</div>
          BirdNET V2.4 audio features with a CrowTrans head: 7 call types, trained on
          Carrion, Hooded, American and other crows, ravens, rooks and jackdaws, plus everyday background sound.
          <div className="mt-1 mono text-[11px] text-[var(--text-3)]">
            {modelLoaded ? "crowtrans_v2.tflite · " : "not loaded · "}
            {backend}
          </div>
        </div>
        <div>
          <div className="text-[var(--text-3)] uppercase tracking-[0.08em] text-[10px] mb-1">Method</div>
          Each 3-second window is scored against all 7 call types. If the strongest reaches{" "}
          {Math.round(CROW_PRESENCE_THRESHOLD * 100)}%, it is reported as a crow call with that
          meaning. Meanings describe what a call does in context, not how the bird feels.
        </div>
        <div>
          <div className="text-[var(--text-3)] uppercase tracking-[0.08em] text-[10px] mb-1">Privacy</div>
          Inference runs in your browser. No audio or results are transmitted.
        </div>
      </div>
      <div className="mt-6 text-[11px] text-[var(--text-3)]">CrowTrans · Research prototype</div>
    </footer>
  );
}
