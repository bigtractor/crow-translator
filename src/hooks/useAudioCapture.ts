// ============================================================
// useAudioCapture: Web Audio API Hook for 48kHz Ingestion
// ============================================================
// Strict iOS Safari AudioContext compliance:
// 1. Never creates or resumes AudioContext on page load
// 2. Only creates / resumes inside explicit onClick handler
// 3. Configures strict 48,000 Hz sample rate for BirdNET
// 4. Buffers continuous PCM samples into exact 3000ms (144,000 sample) blocks
// 5. Provides real-time AnalyserNode byte frequencies and waveform for visualizers

import { useState, useRef, useCallback, useEffect } from "react";
import type { AudioCaptureState } from "@/types";

interface UseAudioCaptureOptions {
  /** Target sample rate required by BirdNET (strict 48kHz) */
  sampleRate?: number;
  /** Segment duration in seconds (default: 3 seconds) */
  segmentDurationSec?: number;
  /** Callback fired whenever a 3000ms PCM float32 segment is captured */
  onSegmentReady?: (samples: Float32Array) => void;
}

export function useAudioCapture({
  sampleRate = 48000,
  segmentDurationSec = 3,
  onSegmentReady,
}: UseAudioCaptureOptions = {}) {
  const [state, setState] = useState<AudioCaptureState>({
    isCapturing: false,
    sampleRate: 48000,
    error: null,
  });

  const [inputLevelDb, setInputLevelDb] = useState<number>(-60);
  const [isAudioContextSuspended, setIsAudioContextSuspended] = useState<boolean>(false);

  // References to Web Audio API objects
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);

  // Target sample count for 3 seconds at 48kHz: 144,000 samples
  const targetSamples = sampleRate * segmentDurationSec;

  // Rolling audio buffer
  const audioBufferRef = useRef<Float32Array>(new Float32Array(targetSamples));
  const bufferIndexRef = useRef<number>(0);

  // Frequency and time-domain arrays for canvas visualizers
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const timeDomainDataRef = useRef<Uint8Array | null>(null);

  // Animation frame reference for level metering
  const meterRafRef = useRef<number | null>(null);

  /**
   * Start audio capture.
   * MUST be invoked directly from a user click handler (iOS Safari requirement).
   */
  const startCapture = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: sampleRate,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      mediaStreamRef.current = stream;

      // 2. Initialize AudioContext strictly within user gesture
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtx) {
        throw new Error("Web Audio API is not supported in this browser.");
      }

      const audioCtx = new AudioCtx({
        sampleRate: sampleRate,
        latencyHint: "interactive",
      });

      // iOS Safari resume check
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      audioContextRef.current = audioCtx;
      setIsAudioContextSuspended(audioCtx.state === "suspended");

      // 3. Create AnalyserNode for visualizers (Mel spectrogram / Oscilloscope)
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserNodeRef.current = analyser;

      frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      timeDomainDataRef.current = new Uint8Array(analyser.fftSize);

      // 4. Create Source Node
      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      source.connect(analyser);

      // 5. Use ScriptProcessorNode / AudioWorklet for sample aggregation
      // 4096 buffer size at 48kHz = ~85ms chunks
      const bufferSize = 4096;
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      processorNodeRef.current = processor;

      // Reset rolling buffer index
      bufferIndexRef.current = 0;
      audioBufferRef.current = new Float32Array(targetSamples);

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const buffer = audioBufferRef.current;
        let index = bufferIndexRef.current;

        for (let i = 0; i < inputData.length; i++) {
          buffer[index] = inputData[i];
          index++;

          // Once we have collected 3000ms (144,000 samples)
          if (index >= targetSamples) {
            // Clone the 3-second segment to avoid mutation
            const segment = new Float32Array(buffer);

            // Fire inference trigger
            onSegmentReady?.(segment);

            // Reset buffer
            index = 0;
          }
        }

        bufferIndexRef.current = index;
      };

      // Connect nodes to process
      analyser.connect(processor);
      // Connect processor to destination to keep it ticking (muted via gain if needed)
      const dummyGain = audioCtx.createGain();
      dummyGain.gain.value = 0; // Prevent feedback loop to speakers
      processor.connect(dummyGain);
      dummyGain.connect(audioCtx.destination);

      // 6. Start metering loop for UI dB display
      const updateMeter = () => {
        if (!analyserNodeRef.current) return;

        if (timeDomainDataRef.current) {
          analyserNodeRef.current.getByteTimeDomainData(timeDomainDataRef.current as any);
          let sumSquares = 0;
          for (let i = 0; i < timeDomainDataRef.current.length; i++) {
            const norm = (timeDomainDataRef.current[i] - 128) / 128;
            sumSquares += norm * norm;
          }
          const rms = Math.sqrt(sumSquares / timeDomainDataRef.current.length);
          const db = Math.max(-60, Math.round(20 * Math.log10(rms + 1e-6)));
          setInputLevelDb(db);
        }

        meterRafRef.current = requestAnimationFrame(updateMeter);
      };

      meterRafRef.current = requestAnimationFrame(updateMeter);

      setState({
        isCapturing: true,
        sampleRate: audioCtx.sampleRate,
        error: null,
      });
    } catch (err) {
      console.error("Audio capture failed:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Could not access microphone. Please ensure microphone permissions are granted.";
      setState((prev) => ({ ...prev, error: message, isCapturing: false }));
    }
  }, [sampleRate, targetSamples, onSegmentReady]);

  /**
   * Stop audio capture and release hardware resources.
   */
  const stopCapture = useCallback(() => {
    if (meterRafRef.current) {
      cancelAnimationFrame(meterRafRef.current);
      meterRafRef.current = null;
    }

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    bufferIndexRef.current = 0;
    setInputLevelDb(-60);
    setState((prev) => ({ ...prev, isCapturing: false }));
  }, []);

  /**
   * Explicitly resume AudioContext if suspended (for iOS touch retry)
   */
  const resumeAudioContext = useCallback(async () => {
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
      setIsAudioContextSuspended(false);
    }
  }, []);

  /**
   * Helper to retrieve current frequency & waveform data for rendering
   */
  const getAudioVisualData = useCallback(() => {
    if (!analyserNodeRef.current) return null;

    if (frequencyDataRef.current) {
      analyserNodeRef.current.getByteFrequencyData(frequencyDataRef.current as any);
    }
    if (timeDomainDataRef.current) {
      analyserNodeRef.current.getByteTimeDomainData(timeDomainDataRef.current as any);
    }

    return {
      frequencies: frequencyDataRef.current,
      waveform: timeDomainDataRef.current,
    };
  }, []);

  /**
   * Synthetic Crow Audio Generator:
   * Generates realistic 3-second synthetic audio simulating crow vocalization frequencies:
   * Corvus corone calls have fundamental around 1.2kHz - 1.8kHz with dense harmonic formant
   * banding up to 4.5kHz, sharp transient attacks, and rhythmic rasps.
   */
  const injectSyntheticAudio = useCallback(
    (type: "alarm" | "territorial" | "contact" | "food" | "silence") => {
      const buffer = new Float32Array(targetSamples);
      const sr = sampleRate;

      if (type === "silence") {
        // Light pink background noise
        for (let i = 0; i < targetSamples; i++) {
          buffer[i] = (Math.random() * 2 - 1) * 0.005;
        }
      } else {
        // Generate crow-like harmonic vocalization bursts
        let bursts: { start: number; duration: number; freq: number }[] = [];

        if (type === "alarm") {
          // Rapid harsh alarm caws: 4 short sharp bursts
          bursts = [
            { start: 0.2, duration: 0.35, freq: 1750 },
            { start: 0.8, duration: 0.35, freq: 1780 },
            { start: 1.4, duration: 0.35, freq: 1760 },
            { start: 2.0, duration: 0.35, freq: 1720 },
          ];
        } else if (type === "territorial") {
          // 2 long resonant, deliberate calls
          bursts = [
            { start: 0.3, duration: 0.7, freq: 1350 },
            { start: 1.6, duration: 0.7, freq: 1320 },
          ];
        } else if (type === "food") {
          // 3 excited rising calls
          bursts = [
            { start: 0.4, duration: 0.45, freq: 1550 },
            { start: 1.1, duration: 0.45, freq: 1600 },
            { start: 1.9, duration: 0.45, freq: 1620 },
          ];
        } else {
          // Contact call: 1 gentle flight note
          bursts = [{ start: 0.8, duration: 0.5, freq: 1420 }];
        }

        // Synthesize bursts
        for (const burst of bursts) {
          const startSample = Math.floor(burst.start * sr);
          const numSamples = Math.floor(burst.duration * sr);

          for (let i = 0; i < numSamples; i++) {
            const idx = startSample + i;
            if (idx >= targetSamples) break;

            const t = i / sr;
            // Envelope: fast attack, exponential decay
            const envelope =
              Math.sin((Math.PI * i) / numSamples) * Math.exp((-1.5 * i) / numSamples);

            // Fundamental + harmonics + noise modulation (crow rasp)
            const f = burst.freq;
            const h1 = Math.sin(2 * Math.PI * f * t);
            const h2 = 0.7 * Math.sin(2 * Math.PI * (f * 1.8) * t);
            const h3 = 0.5 * Math.sin(2 * Math.PI * (f * 2.7) * t);
            const rasp = (Math.random() * 2 - 1) * 0.35; // Harsh vocal fold rasp

            buffer[idx] = (h1 + h2 + h3 + rasp) * envelope * 0.4;
          }
        }
      }

      // Dispatch segment
      onSegmentReady?.(buffer);
    },
    [sampleRate, targetSamples, onSegmentReady]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    state,
    inputLevelDb,
    isAudioContextSuspended,
    startCapture,
    stopCapture,
    resumeAudioContext,
    getAudioVisualData,
    injectSyntheticAudio,
  };
}
