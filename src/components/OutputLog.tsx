"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { GlassButton } from "./GlassButton";
import { formatClock, logToText, type LogEntry, type LogKind } from "@/hooks/useSessionLog";

interface OutputLogProps {
  entries: LogEntry[];
  onClear: () => void;
}

const KIND_LABEL: Record<LogKind, string> = {
  detection: "Detected",
  rejected: "Rejected",
  system: "System",
};

const KIND_CLASS: Record<LogKind, string> = {
  detection: "bg-[var(--ok-soft)] text-[var(--ok)]",
  rejected: "bg-[var(--muted-soft)] text-[var(--text-2)]",
  system: "bg-[var(--muted-soft)] text-[var(--text-2)]",
};

function pct(v?: number) {
  return v == null ? "" : `${Math.round(v * 100)}%`;
}

export function OutputLog({ entries, onClear }: OutputLogProps) {
  const [showRejected, setShowRejected] = useState(false);
  const [copied, setCopied] = useState(false);

  const visible = useMemo(
    () => (showRejected ? entries : entries.filter((e) => e.kind !== "rejected")),
    [entries, showRejected]
  );

  const detections = useMemo(() => entries.filter((e) => e.kind === "detection").length, [entries]);
  const rejectedCount = useMemo(() => entries.filter((e) => e.kind === "rejected").length, [entries]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(logToText(visible));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable: ignore */
    }
  };

  return (
    <section className="glass flex flex-col min-h-[320px] lg:h-[calc(100dvh-7.5rem)]" aria-labelledby="log-heading">
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[var(--hairline)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="log-heading" className="text-[15px] font-semibold tracking-[-0.01em]">
              Output log
            </h2>
            <p className="text-[12px] text-[var(--text-2)] mt-0.5">
              {detections} {detections === 1 ? "detection" : "detections"}
              {rejectedCount ? ` · ${rejectedCount} rejected` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GlassButton
              size="sm"
              pill
              onClick={copy}
              disabled={visible.length === 0}
              aria-label="Copy log"
              icon={copied ? <Check size={14} /> : <Copy size={14} />}
            >
              {copied ? "Copied" : "Copy"}
            </GlassButton>
            <GlassButton
              size="sm"
              pill
              onClick={onClear}
              disabled={entries.length === 0}
              aria-label="Clear log"
              icon={<Trash2 size={14} />}
            >
              Clear
            </GlassButton>
          </div>
        </div>

        <label className="mt-4 flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-[13px] text-[var(--text-2)]">Show rejected windows</span>
          <button
            type="button"
            role="switch"
            aria-checked={showRejected}
            className="switch focus-ring"
            onClick={() => setShowRejected((v) => !v)}
          />
        </label>
      </div>

      <ol className="log-scroll flex-1 overflow-y-auto px-2 sm:px-3 py-2" aria-live="polite">
        {visible.length === 0 ? (
          <li className="px-3 py-10 text-center text-[13px] text-[var(--text-3)]">
            Nothing logged yet. Start listening and detections will appear here with a time stamp.
          </li>
        ) : (
          visible.map((e) => <LogRow key={e.id} entry={e} />)
        )}
      </ol>
    </section>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const isDetection = entry.kind === "detection";
  return (
    <li
      className={`row-enter grid grid-cols-[auto_1fr] gap-x-3 px-3 py-3 rounded-[14px] ${
        isDetection ? "" : "opacity-90"
      }`}
    >
      <time
        dateTime={new Date(entry.time).toISOString()}
        className="mono text-[12px] text-[var(--text-2)] pt-[3px] tabular-nums"
      >
        {formatClock(entry.time)}
      </time>

      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex-none inline-flex items-center h-5 px-1.5 rounded-md text-[11px] font-medium ${KIND_CLASS[entry.kind]}`}
          >
            {KIND_LABEL[entry.kind]}
          </span>
          <span
            className={`truncate text-[14px] ${isDetection ? "font-medium" : "text-[var(--text-2)]"}`}
          >
            {entry.title}
          </span>
          {entry.active ? (
            <span className="flex-none w-1.5 h-1.5 rounded-full bg-[var(--ok)] dot-live" aria-label="ongoing" />
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[var(--text-2)]">
          {entry.confidence != null ? <span className="mono">{pct(entry.confidence)}</span> : null}
          {entry.durationSec != null ? (
            <span className="mono">
              {entry.durationSec}s{entry.count && entry.count > 1 ? ` · ×${entry.count}` : ""}
            </span>
          ) : null}
          {entry.detail ? <span className="truncate max-w-full">{entry.detail}</span> : null}
        </div>
      </div>
    </li>
  );
}
