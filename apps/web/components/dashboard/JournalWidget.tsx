"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiGet } from "@/lib/api";
import { JournalEntry } from "@/lib/types";

export function JournalWidget() {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const { getToken } = useAuth();
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    getToken().then((t) => { if (t) apiGet<JournalEntry>(`/journal/entry?date=${today}`, t).then(setEntry).catch(() => {}); });
  }, [getToken]);

  return (
    <div className="bg-[#111] border-2 border-white p-4 col-span-2" style={{ boxShadow: "3px 3px 0px #a78bfa" }}>
      <p className="text-[9px] font-mono font-black text-[#888] uppercase tracking-widest mb-3">JOURNAL / TODAY</p>
      {entry ? (
        <p className="text-sm text-white/80 leading-relaxed line-clamp-3 font-mono">{entry.content}</p>
      ) : (
        <p className="text-[#444] text-xs font-mono">nothing written today — tell Chitta how you feel</p>
      )}
    </div>
  );
}
