// ============================================================
// useSessionLog: timestamped session log for the CrowTrans output panel
// ============================================================
// Holds system messages and per-frame results that are NOT translation
// events (those come from useDebouncer). The page merges both lists.

import { useCallback, useRef, useState } from "react";

export type LogKind = "detection" | "rejected" | "system";

export interface LogEntry {
  id: string;
  /** Epoch ms */
  time: number;
  kind: LogKind;
  /** Primary line */
  title: string;
  /** Secondary line */
  detail?: string;
  /** 0..1 */
  confidence?: number;
  /** Seconds, for continuous detections */
  durationSec?: number;
  /** Consecutive 3 s frames, for continuous detections */
  count?: number;
  /** Still being extended by new frames */
  active?: boolean;
}

const MAX_ENTRIES = 400;

export function useSessionLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const seq = useRef(0);

  const push = useCallback((entry: Omit<LogEntry, "id" | "time"> & { time?: number }) => {
    seq.current += 1;
    const full: LogEntry = {
      id: `log-${Date.now()}-${seq.current}`,
      time: entry.time ?? Date.now(),
      ...entry,
    };
    setEntries((prev) => [full, ...prev].slice(0, MAX_ENTRIES));
    return full.id;
  }, []);

  const system = useCallback(
    (title: string, detail?: string) => push({ kind: "system", title, detail }),
    [push]
  );

  const rejected = useCallback(
    (title: string, detail: string | undefined, confidence: number) =>
      push({ kind: "rejected", title, detail, confidence }),
    [push]
  );

  const clear = useCallback(() => setEntries([]), []);

  return { entries, push, system, rejected, clear };
}

/** HH:MM:SS, 24-hour, local time */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Plain-text rendering of the log for copy / export */
export function logToText(entries: LogEntry[]): string {
  const kindLabel: Record<LogKind, string> = {
    detection: "DETECTED",
    rejected: "REJECTED",
    system: "SYSTEM  ",
  };
  return [...entries]
    .sort((a, b) => a.time - b.time)
    .map((e) => {
      const conf = e.confidence != null ? ` ${(e.confidence * 100).toFixed(0)}%` : "";
      const dur =
        e.durationSec != null ? ` ${e.durationSec}s${e.count && e.count > 1 ? ` x${e.count}` : ""}` : "";
      const detail = e.detail ? ` | ${e.detail}` : "";
      return `[${formatClock(e.time)}] ${kindLabel[e.kind]} ${e.title}${conf}${dur}${detail}`;
    })
    .join("\n");
}
