"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiGet } from "@/lib/api";

interface HealthSummary { sleep_hours: number | null; water_litres: number | null; mood: string | null; workout_streak: number; }
const MOOD_EMOJI: Record<string, string> = { great: "😄", good: "🙂", neutral: "😐", bad: "😕", awful: "😞" };

export function HealthWidget() {
  const [data, setData] = useState<HealthSummary | null>(null);
  const { getToken } = useAuth();
  useEffect(() => {
    getToken().then((t) => { if (t) apiGet<HealthSummary>("/health/today", t).then(setData).catch(() => {}); });
  }, [getToken]);

  return (
    <div className="bg-[#111] border-2 border-white p-4" style={{ boxShadow: "3px 3px 0px #f472b6" }}>
      <p className="text-[9px] font-mono font-black text-[#888] uppercase tracking-widest mb-3">HEALTH / TODAY</p>
      {data ? (
        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
          {[
            { k: "sleep",   v: data.sleep_hours   != null ? `${data.sleep_hours}h`   : "—", color: "#a78bfa" },
            { k: "water",   v: data.water_litres   != null ? `${data.water_litres}L`  : "—", color: "#60a5fa" },
            { k: "mood",    v: data.mood ? MOOD_EMOJI[data.mood] ?? data.mood : "—",           color: "#f472b6" },
            { k: "streak",  v: `${data.workout_streak}d 🔥`,                                   color: "#fb923c" },
          ].map(({ k, v, color }) => (
            <div key={k}>
              <p className="text-[9px] font-mono text-[#888] uppercase tracking-wide">{k}</p>
              <p className="text-sm font-black" style={{ color }}>{v}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[#444] text-xs font-mono">nothing logged</p>
      )}
    </div>
  );
}
