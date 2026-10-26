// ============================================================
// EventLogTerminal Component
// Dark-mode styled terminal window for the live event feed
// (As requested in Phase 1 & Section 3.3)
// ============================================================

"use client";

import React, { useState } from "react";
import type { TranslationEvent, CrowBehavior } from "@/types";
import { BEHAVIOR_LABELS, BEHAVIOR_ICONS, BEHAVIOR_COLORS } from "@/types";
import {
  Terminal,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Database,
  ExternalLink,
} from "lucide-react";

interface EventLogTerminalProps {
  events: TranslationEvent[];
  onClearHistory: () => void;
  supabaseSyncEnabled?: boolean;
}

export const EventLogTerminal: React.FC<EventLogTerminalProps> = ({
  events,
  onClearHistory,
  supabaseSyncEnabled = true,
}) => {
  const [filterBehavior, setFilterBehavior] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filtered events
  const filteredEvents = events.filter((evt) => {
    if (filterBehavior !== "all" && evt.behavior !== filterBehavior) {
      return false;
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const label = BEHAVIOR_LABELS[evt.behavior].toLowerCase();
      return label.includes(q) || evt.id.toLowerCase().includes(q);
    }
    return true;
  });

  // Export events to JSON
  const handleExportJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `crow_translations_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export events to CSV
  const handleExportCSV = () => {
    const headers = [
      "EventID",
      "Behavior",
      "Label",
      "Confidence",
      "ConsecutiveDetections",
      "DurationSec",
      "StartTimeISO",
      "Status",
    ];
    const rows = events.map((e) => [
      e.id,
      e.behavior,
      `"${BEHAVIOR_LABELS[e.behavior]}"`,
      e.confidence,
      e.consecutiveCount,
      e.durationSec,
      new Date(e.startTime).toISOString(),
      e.active ? "ACTIVE" : "FINALIZED",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute(
      "download",
      `crow_translations_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-[#060a0f] shadow-2xl overflow-hidden font-mono">
      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 bg-[#0c121b] px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Mac/Linux terminal window control dots */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>

          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            corvus-edge-terminal://live-feed
          </span>

          <span className="rounded bg-emerald-950/80 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-700/50">
            {events.length} EVENTS RECORDED
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {supabaseSyncEnabled && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-900/90 px-2.5 py-1 rounded border border-zinc-700/60">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span>Supabase Edge Logging</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          )}

          <button
            onClick={handleExportJSON}
            title="Export JSON"
            className="flex items-center gap-1 rounded bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 border border-zinc-700 transition-colors"
          >
            <Download className="h-3 w-3" />
            <span>JSON</span>
          </button>

          <button
            onClick={handleExportCSV}
            title="Export CSV"
            className="flex items-center gap-1 rounded bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 border border-zinc-700 transition-colors"
          >
            <Download className="h-3 w-3" />
            <span>CSV</span>
          </button>

          {events.length > 0 && (
            <button
              onClick={onClearHistory}
              title="Clear Terminal Feed"
              className="flex items-center gap-1 rounded bg-red-950/40 hover:bg-red-900/60 px-2 py-1 text-xs text-red-300 border border-red-700/50 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Filters and Search */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 bg-[#090e15] px-4 py-2 text-xs">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1">
          <Filter className="h-3 w-3 text-zinc-500 mr-1" />
          {[
            { id: "all", label: "All" },
            { id: "alarm_distress", label: "Alarm" },
            { id: "territorial_call", label: "Territorial" },
            { id: "food_announcement", label: "Food" },
            { id: "contact_call", label: "Contact" },
            { id: "mobbing_call", label: "Mobbing" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterBehavior(cat.id)}
              className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
                filterBehavior === cat.id
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                  : "text-zinc-400 hover:bg-zinc-800/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search feed..."
            className="w-36 rounded bg-black/60 pl-7 pr-2 py-0.5 text-xs text-zinc-200 placeholder-zinc-600 border border-zinc-800 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Terminal Feed Scroll Container */}
      <div className="h-80 overflow-y-auto p-4 space-y-2 bg-[#04070a]/90 divide-y divide-zinc-900/60">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-12">
            <Terminal className="h-8 w-8 mb-2 opacity-30 text-emerald-500" />
            <span className="text-xs text-zinc-400">FEED_STATUS: AWAITING_INGESTION</span>
            <span className="text-[11px] text-zinc-600 mt-1 max-w-sm text-center">
              Engage the bioacoustic microphone or tap a test vocalization above to begin real-time translation logging.
            </span>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const timeStr = new Date(evt.startTime).toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            const isAlarm = evt.behavior === "alarm_distress" || evt.behavior === "mobbing_call";

            return (
              <div
                key={evt.id}
                className={`pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded transition-colors ${
                  evt.active
                    ? "bg-emerald-950/20 border-l-2 border-emerald-400"
                    : "hover:bg-zinc-900/40"
                }`}
              >
                {/* Left: Timestamp + Behavior */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500 shrink-0 font-mono">
                    [{timeStr}]
                  </span>

                  <span className="text-base">{BEHAVIOR_ICONS[evt.behavior]}</span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          BEHAVIOR_COLORS[evt.behavior] || "text-white"
                        }`}
                      >
                        {BEHAVIOR_LABELS[evt.behavior]}
                      </span>

                      {evt.active && (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] text-emerald-300 font-bold border border-emerald-500/40 animate-pulse">
                          STREAMING
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 mt-0.5">
                      <span>Corvus corone</span>
                      <span>•</span>
                      <span>ID: {evt.id.slice(0, 14)}...</span>
                      <span>•</span>
                      <span>
                        Cadence:{" "}
                        <strong className="text-zinc-200">
                          {evt.consecutiveCount} consecutive
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Confidence + Duration Pills */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className="rounded bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-300 border border-zinc-800">
                    Duration: <strong className="text-white">{evt.durationSec}s</strong>
                  </span>

                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-bold border ${
                      isAlarm
                        ? "bg-red-950/60 text-red-300 border-red-800/60"
                        : "bg-cyan-950/60 text-cyan-300 border-cyan-800/60"
                    }`}
                  >
                    {(evt.confidence * 100).toFixed(0)}% Conf
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Command Line Footer */}
      <div className="border-t border-zinc-800 bg-[#080d14] px-4 py-2 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">&gt;</span>
          <span className="text-zinc-500">pipeline_status:</span>
          <span className="text-emerald-400">CLIENT_WASM_ONLINE</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500">sample_rate:</span>
          <span className="text-zinc-300">48,000 Hz</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-500">
          <span>Vercel Edge Network</span>
          <span>•</span>
          <span>tfjs-tflite client runtime</span>
        </div>
      </div>
    </div>
  );
};
