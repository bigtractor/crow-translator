// ============================================================
// Calcaine: Privacy & On-Device Edge Architecture Modal
// ============================================================

"use client";

import React from "react";
import { X, ShieldCheck, Cpu, Lock, Zap } from "lucide-react";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0c1410] border border-emerald-900/60 p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-zinc-900/80 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-black text-white tracking-tight">
          100% Private Client-Side AI
        </h3>

        <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
          Calcaine executes the entire audio pipeline directly inside your browser using Web Audio API and WebAssembly TensorFlow.js.
        </p>

        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                No Audio Ever Uploaded
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Microphone audio streams never touch a cloud server. Audio buffers are processed locally and discarded immediately.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <Zap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                0ms Server Latency
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Runs at edge speed on your device GPU/CPU via WebGL and WebAssembly SIMD hardware acceleration.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <Cpu className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Full 60MB Neural Model
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Loads <span className="text-emerald-400 font-mono">crow_behavior.tflite</span> with 6,539 classes directly into client RAM.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
