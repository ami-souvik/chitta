"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiGet, formatDate } from "@/lib/api";
import { JournalEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const MOOD_EMOJI: Record<string, string> = { great: "😄", good: "🙂", neutral: "😐", bad: "😕", awful: "😞" };
const MOOD_COLOR: Record<string, string> = {
  great: "border-[#4ade80] shadow-[3px_3px_0px_#4ade80]",
  good:  "border-[#a7f3d0] shadow-[3px_3px_0px_#a7f3d0]",
  neutral: "border-[#fcd34d] shadow-[3px_3px_0px_#fcd34d]",
  bad:   "border-[#fb923c] shadow-[3px_3px_0px_#fb923c]",
  awful: "border-[#ff4d4d] shadow-[3px_3px_0px_#ff4d4d]",
};

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    getToken().then((t) => {
      if (!t) return;
      apiGet<JournalEntry[]>("/journal/entries?limit=30", t).then((data) => {
        setEntries(data);
        if (data.length > 0) setSelected(data[0]);
      }).catch(() => {});
    });
  }, [getToken]);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="text-3xl font-black tracking-tight">JOURNAL<span className="text-[#a78bfa]">.</span></h1>

      <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[calc(100vh-160px)]">
        {/* Entry list */}
        <div className="brute-card w-full lg:w-64 shrink-0 overflow-hidden flex flex-col">
          <div className="p-3 border-b-2 border-white">
            <p className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-widest">ENTRIES</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {entries.length === 0 ? (
              <p className="text-[#888] text-xs font-mono p-4">Nothing written. Use chat.</p>
            ) : (
              entries.map((e) => (
                <button key={e.id} onClick={() => setSelected(e)}
                  className={cn(
                    "w-full text-left px-3 py-3 border-b-2 border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors",
                    selected?.id === e.id ? "bg-[#1a1a1a] border-l-4 border-l-[#a78bfa]" : ""
                  )}>
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[10px] font-mono font-bold text-[#888]">{formatDate(e.date)}</p>
                    {e.mood && <span className="text-sm">{MOOD_EMOJI[e.mood]}</span>}
                  </div>
                  <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">{e.content}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Entry reader */}
        <div className={cn(
          "flex-1 bg-[#111] border-2 overflow-hidden flex flex-col",
          selected?.mood ? MOOD_COLOR[selected.mood] : "border-white shadow-brute"
        )}>
          {selected ? (
            <>
              <div className="px-5 py-4 border-b-2 border-white flex items-center justify-between">
                <p className="text-xs font-mono font-bold text-[#888]">{formatDate(selected.date)}</p>
                {selected.mood && (
                  <span className="text-xs font-mono font-bold uppercase tracking-wide" style={{
                    color: selected.mood === "great" ? "#4ade80" : selected.mood === "bad" || selected.mood === "awful" ? "#ff4d4d" : "#fcd34d"
                  }}>
                    {MOOD_EMOJI[selected.mood]} {selected.mood}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <p className="text-base leading-relaxed whitespace-pre-wrap text-white/90">{selected.content}</p>
                {selected.tags && selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-6">
                    {selected.tags.map((tag) => (
                      <span key={tag} className="brute-tag text-[#a78bfa] border-[#a78bfa]">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[#444] font-mono text-sm">select an entry</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
