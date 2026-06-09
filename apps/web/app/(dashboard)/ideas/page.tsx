"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiGet, formatDate } from "@/lib/api";
import { Idea } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<Idea["type"], { emoji: string; color: string; bg: string }> = {
  idea:        { emoji: "💡", color: "#fcd34d", bg: "border-[#fcd34d]" },
  worry:       { emoji: "😰", color: "#ff4d4d", bg: "border-[#ff4d4d]" },
  goal:        { emoji: "🎯", color: "#4ade80", bg: "border-[#4ade80]" },
  observation: { emoji: "👁",  color: "#60a5fa", bg: "border-[#60a5fa]" },
  question:    { emoji: "❓", color: "#a78bfa", bg: "border-[#a78bfa]" },
};

type Filter = "all" | Idea["type"];

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const { getToken } = useAuth();

  useEffect(() => {
    getToken().then((t) => {
      if (t) apiGet<Idea[]>("/ideas?limit=100", t).then(setIdeas).catch(() => {});
    });
  }, [getToken]);

  const filtered = filter === "all" ? ideas : ideas.filter((i) => i.type === filter);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="text-3xl font-black tracking-tight">IDEAS<span className="text-[#fcd34d]">.</span></h1>

      {/* Filter strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(["all", "idea", "worry", "goal", "observation", "question"] as const).map((f) => {
          const cfg = f !== "all" ? TYPE_CONFIG[f] : null;
          const active = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1.5 border-2 transition-all",
                active
                  ? "bg-white text-black border-white"
                  : "border-[#333] text-[#888] hover:border-white hover:text-white"
              )}>
              {cfg ? `${cfg.emoji} ${f}` : "ALL"}
            </button>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="flex gap-3 text-[10px] font-mono text-[#888]">
        {(["idea", "worry", "goal", "observation", "question"] as const).map((type) => {
          const count = ideas.filter((i) => i.type === type).length;
          const cfg = TYPE_CONFIG[type];
          return (
            <span key={type} style={{ color: cfg.color }}>{cfg.emoji} {count}</span>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="brute-card p-8 text-center">
          <p className="text-[#888] font-mono text-sm">No entries yet. Dump your thoughts via chat.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((idea) => {
            const cfg = TYPE_CONFIG[idea.type];
            return (
              <div key={idea.id}
                className={cn("bg-[#111] border-2 border-white p-4 space-y-3 hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform", cfg.bg)}
                style={{ boxShadow: `3px 3px 0px ${cfg.color}` }}>
                <div className="flex items-start gap-2">
                  <span className="text-xl shrink-0">{cfg.emoji}</span>
                  <p className="text-sm leading-relaxed font-medium text-white/90">{idea.content}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-[#888]">{formatDate(idea.created_at)}</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-[9px] font-mono font-bold uppercase border border-[#333] px-1.5 py-0.5"
                      style={{ color: cfg.color, borderColor: cfg.color }}>
                      {idea.status}
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase text-[#888]">{idea.type}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
