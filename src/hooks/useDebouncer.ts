// ============================================================
// useDebouncer: React Hook for Aggregating Consecutive Crow Behaviors
// ============================================================
// As per Section 3.3:
// "Aggregates consecutive identical behavior classifications.
// If 'alarm' is detected 4 times in a row, it counts as one continuous event,
// incrementing a duration timer. A 10-second silence window resets the state."

import { useState, useRef, useEffect, useCallback } from "react";
import type { InferenceResult, TranslationEvent } from "@/types";

interface UseDebouncerOptions {
  /** Silence window in milliseconds before resetting continuous event (default: 10,000ms = 10s) */
  silenceWindowMs?: number;
  /** Callback fired whenever a new translation event is logged or updated */
  onEventUpdate?: (event: TranslationEvent) => void;
  /** Callback fired when an event is finalized after silence */
  onEventFinalized?: (event: TranslationEvent) => void;
}

export function useDebouncer({
  silenceWindowMs = 10000,
  onEventUpdate,
  onEventFinalized,
}: UseDebouncerOptions = {}) {
  // Chronological event log
  const [events, setEvents] = useState<TranslationEvent[]>([]);

  // Currently active continuous event
  const [activeEvent, setActiveEvent] = useState<TranslationEvent | null>(null);

  // Remaining ms until silence window expires (for live UI countdown)
  const [silenceCountdownMs, setSilenceCountdownMs] = useState<number | null>(null);

  // References for mutable tracking across 3s inference cycles
  const activeEventRef = useRef<TranslationEvent | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveTimestampRef = useRef<number>(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync ref with state
  useEffect(() => {
    activeEventRef.current = activeEvent;
  }, [activeEvent]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  /**
   * Finalizes the current active event and resets state
   */
  const finalizeActiveEvent = useCallback(() => {
    const current = activeEventRef.current;
    if (!current) return;

    const finalized: TranslationEvent = {
      ...current,
      active: false,
      lastUpdateTime: Date.now(),
      durationSec: Math.max(
        3,
        Math.round((Date.now() - current.startTime) / 1000)
      ),
    };

    // Update in history
    setEvents((prev) =>
      prev.map((e) => (e.id === finalized.id ? finalized : e))
    );

    setActiveEvent(null);
    activeEventRef.current = null;
    setSilenceCountdownMs(null);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    onEventFinalized?.(finalized);
  }, [onEventFinalized]);

  /**
   * Resets the silence countdown timer
   */
  const armSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    lastActiveTimestampRef.current = Date.now();
    setSilenceCountdownMs(silenceWindowMs);

    // Live countdown ticker every 100ms
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActiveTimestampRef.current;
      const remaining = Math.max(0, silenceWindowMs - elapsed);
      setSilenceCountdownMs(remaining);

      if (remaining <= 0 && countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, 100);

    // Master silence window timeout
    silenceTimerRef.current = setTimeout(() => {
      finalizeActiveEvent();
    }, silenceWindowMs);
  }, [silenceWindowMs, finalizeActiveEvent]);

  /**
   * Main ingest function: Feed an InferenceResult from the 3-second cycle
   */
  const processInference = useCallback(
    (result: InferenceResult) => {
      const { detection, behavior, behaviorConfidence } = result;

      // No crow call in this window, so there is nothing to log
      if (!detection.isCrow || !behavior) {
        // We received non-crow or silence.
        // We do NOT immediately reset; we let the 10-second silence window tick down!
        return;
      }

      const now = Date.now();
      const current = activeEventRef.current;

      // Aggregate only windows carrying the SAME meaning.
      //
      // Keyed on rawLabel (the model class), not the coarser `behavior`. With
      // the previous 17-class model several classes shared one category, and
      // because a merge spreads the existing event it kept the FIRST window's
      // title, so a run of calls showed one frozen label while the model's
      // answer changed. Keying on the class means a change of meaning always
      // starts a new log entry, whatever the category mapping does later.
      const sameMeaning =
        current && current.active && (current.rawLabel ?? current.behavior) === (result.rawLabel ?? behavior);

      if (current && sameMeaning) {
        // Consecutive identical meaning!
        // Increment consecutive count and duration timer
        const updatedDurationSec = Math.max(
          3,
          Math.round((now - current.startTime) / 1000)
        );

        const updatedEvent: TranslationEvent = {
          ...current,
          lastUpdateTime: now,
          consecutiveCount: current.consecutiveCount + 1,
          durationSec: updatedDurationSec,
          // Rolling weighted average of confidence
          confidence: Math.round(((current.confidence * current.consecutiveCount + (behaviorConfidence || 0.8)) / (current.consecutiveCount + 1)) * 100) / 100,
        };

        setActiveEvent(updatedEvent);
        activeEventRef.current = updatedEvent;

        // Update in event log
        setEvents((prev) =>
          prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
        );

        onEventUpdate?.(updatedEvent);
        // Reset the 10-second silence window
        armSilenceTimer();
      } else {
        // New behavior or previous event timed out
        // If there was an existing active event with a different behavior, finalize it first
        if (current && current.active) {
          finalizeActiveEvent();
        }

        // Create new continuous translation event
        const newEvent: TranslationEvent = {
          id: `evt-${now}-${Math.random().toString(36).substring(2, 7)}`,
          behavior,
          confidence: Math.round((behaviorConfidence || 0.85) * 100) / 100,
          startTime: now,
          lastUpdateTime: now,
          consecutiveCount: 1,
          durationSec: 3, // Each slice is 3 seconds
          active: true,
          rawLabel: result.rawLabel,
          customTitle: result.customTitle,
          customMeaning: result.customMeaning,
        };

        setActiveEvent(newEvent);
        activeEventRef.current = newEvent;

        // Prepend to event log
        setEvents((prev) => [newEvent, ...prev.slice(0, 99)]); // Keep last 100

        onEventUpdate?.(newEvent);
        // Start 10-second silence countdown
        armSilenceTimer();
      }
    },
    [armSilenceTimer, finalizeActiveEvent, onEventUpdate]
  );

  /**
   * Manually clear event history
   */
  const clearHistory = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setActiveEvent(null);
    activeEventRef.current = null;
    setSilenceCountdownMs(null);
    setEvents([]);
  }, []);

  return {
    events,
    activeEvent,
    silenceCountdownMs,
    processInference,
    finalizeActiveEvent,
    clearHistory,
  };
}
