// ============================================================
// Calcaine: Corvus corone Behavioral Taxonomy Reference Modal
// ============================================================

"use client";

import React from "react";
import { X, BookOpen, Sparkles, CheckCircle2 } from "lucide-react";

interface TaxonomyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (
    type: "alarm" | "territorial" | "contact" | "food" | "silence"
  ) => void;
}

export function TaxonomyModal({
  isOpen,
  onClose,
  onSelectSample,
}: TaxonomyModalProps) {
  if (!isOpen) return null;

  const taxonomy = [
    {
      category: "Alarm & Defense",
      items: [
        {
          label: "Corvus corone_there is danger nearby",
          title: "Danger Nearby Alert",
          desc: "High-cadence warning signaling an immediate ground or aerial predator threat.",
          icon: "🚨",
          badge: "ALARM",
          type: "alarm" as const,
        },
        {
          label: "Corvus corone_I am in trouble",
          title: "Distress / Threat Cry",
          desc: "Intense alarm caw indicating direct physical attack, injury, or entrapment.",
          icon: "⚠️",
          badge: "ALARM",
          type: "alarm" as const,
        },
        {
          label: "Corvus corone_harass this predator",
          title: "Mobbing Call",
          desc: "Aggressive rallying cry organizing flock members to swarm and drive away a raptor.",
          icon: "🦅",
          badge: "MOBBING",
          type: "food" as const,
        },
      ],
    },
    {
      category: "Territory & Boundaries",
      items: [
        {
          label: "Corvus corone_back off",
          title: "Territorial Warning (Back Off)",
          desc: "Deep resonant caws from canopy perches defending boundary sovereignty.",
          icon: "📢",
          badge: "TERRITORY",
          type: "territorial" as const,
        },
      ],
    },
    {
      category: "Social, Pair & Flock Coordination",
      items: [
        {
          label: "Corvus corone_calling together with partner",
          title: "Pair-Bond Duet",
          desc: "Antiphonal synchronized calling between monogamous mated pairs.",
          icon: "💬",
          badge: "SOCIAL",
          type: "contact" as const,
        },
        {
          label: "Corvus corone_I am here",
          title: "Location Call (I Am Here)",
          desc: "Acoustic positioning beacon maintaining contact across dense foliage.",
          icon: "📍",
          badge: "SOCIAL",
          type: "contact" as const,
        },
        {
          label: "Corvus corone_I am flying overhead",
          title: "Flight Contact Call",
          desc: "High-altitude movement caw notifying ground crows of active flight transit.",
          icon: "✈️",
          badge: "SOCIAL",
          type: "contact" as const,
        },
        {
          label: "Corvus corone_complex rattling phrase",
          title: "Complex Rattle Display",
          desc: "Intricate guttural throat rattle delivered during close social interaction.",
          icon: "🎶",
          badge: "SOCIAL",
          type: "contact" as const,
        },
        {
          label: "Corvus corone_I am settling for the night",
          title: "Dusk Roosting Call",
          desc: "Evening twilight aggregation call coordinating arrival at communal roosts.",
          icon: "🌙",
          badge: "ROOST",
          type: "contact" as const,
        },
        {
          label: "Corvus corone_feed me",
          title: "Juvenile Begging Call",
          desc: "Fledgling crow soliciting food regurgitation from adult parents.",
          icon: "🐣",
          badge: "JUVENILE",
          type: "contact" as const,
        },
        {
          label: "Corvus corone_singing",
          title: "Crow Sub-Song",
          desc: "Quiet, melodious solo vocalization delivered during relaxed solitary perching.",
          icon: "🎵",
          badge: "SUB-SONG",
          type: "contact" as const,
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0c1410] border border-emerald-900/60 p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-zinc-900/80 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">
              Corvus corone Behavioral Taxonomy
            </h3>
            <p className="text-xs text-zinc-400">
              17 specialized behavioral classes detected by the <span className="text-emerald-400 font-mono">crow_behavior.tflite</span> neural model
            </p>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {taxonomy.map((group) => (
            <div key={group.category} className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90 border-b border-emerald-950 pb-1">
                {group.category}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-emerald-500/30 transition-all flex items-start gap-3"
                  >
                    <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="text-sm font-bold text-white truncate">
                          {item.title}
                        </h5>
                        <button
                          onClick={() => {
                            onSelectSample(item.type);
                            onClose();
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-300 transition-colors shrink-0"
                        >
                          Test
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
