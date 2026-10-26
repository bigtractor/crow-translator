"use client";

import React from "react";
import { CROW_CONFIDENCE_THRESHOLD } from "@/lib/inference_engine";

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
          BirdNET V2.4 (6,522 species) with 17 Corvus corone behaviour classes.
          <div className="mt-1 mono text-[11px] text-[var(--text-3)]">
            {modelLoaded ? "crow_behavior.tflite · " : "fallback · "}
            {backend}
          </div>
        </div>
        <div>
          <div className="text-[var(--text-3)] uppercase tracking-[0.08em] text-[10px] mb-1">Method</div>
          Each 3-second window must score at least {Math.round(CROW_CONFIDENCE_THRESHOLD * 100)}% for
          Carrion or Hooded Crow before a meaning is assigned.
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
