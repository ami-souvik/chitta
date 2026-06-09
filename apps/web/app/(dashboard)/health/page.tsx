"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiGet } from "@/lib/api";
import { HealthLog } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

const MOOD_EMOJI: Record<string, string> = { great: "😄", good: "🙂", neutral: "😐", bad: "😕", awful: "😞" };
const MOOD_COLOR: Record<string, string> = { great: "#4ade80", good: "#a7f3d0", neutral: "#fcd34d", bad: "#fb923c", awful: "#ff4d4d" };

const BruteTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border-2 border-white px-3 py-1.5 text-xs font-mono">
      <p className="font-bold text-[#4ade80]">{payload[0].value}</p>
    </div>
  );
};

export default function HealthPage() {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const { getToken } = useAuth();

  useEffect(() => {
    getToken().then((t) => {
      if (t) apiGet<HealthLog[]>("/health/logs?days=30", t).then(setLogs).catch(() => {});
    });
  }, [getToken]);

  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter((l) => l.date === today);

  const sleepData = logs.filter((l) => l.type === "sleep").slice(-7).map((l) => ({
    d: new Date(l.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    h: l.value,
  }));

  const weightData = logs.filter((l) => l.type === "weight").slice(-14).map((l) => ({
    d: new Date(l.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    kg: l.value,
  }));

  const moodLogs = logs.filter((l) => l.type === "mood").slice(-7);
  const todaySleep = todayLogs.find((l) => l.type === "sleep");
  const todayWater = todayLogs.find((l) => l.type === "water");
  const todayMood = todayLogs.find((l) => l.type === "mood");
  const todayWeight = todayLogs.find((l) => l.type === "weight");

  const stats = [
    { label: "SLEEP",  value: todaySleep  ? `${todaySleep.value}h`   : "—", color: "#a78bfa" },
    { label: "WATER",  value: todayWater  ? `${todayWater.value}L`   : "—", color: "#60a5fa" },
    { label: "MOOD",   value: todayMood   ? MOOD_EMOJI[todayMood.notes ?? ""] ?? "—" : "—", color: "#f472b6" },
    { label: "WEIGHT", value: todayWeight ? `${todayWeight.value}kg` : "—", color: "#fcd34d" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="text-3xl font-black tracking-tight">HEALTH<span className="text-[#f472b6]">.</span></h1>

      {/* Today stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="bg-[#111] border-2 border-white p-3" style={{ boxShadow: `3px 3px 0px ${color}` }}>
            <p className="text-[9px] font-mono font-black text-[#888] uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="brute-card p-4">
          <p className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-widest mb-4">SLEEP — 7 DAYS (hrs)</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={sleepData} barSize={20}>
              <XAxis dataKey="d" tick={{ fontSize: 9, fill: "#888", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: "#888", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <Tooltip content={<BruteTooltip />} />
              <Bar dataKey="h" fill="#a78bfa" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="brute-card p-4">
          <p className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-widest mb-4">WEIGHT TREND (kg)</p>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={weightData}>
              <XAxis dataKey="d" tick={{ fontSize: 9, fill: "#888", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#888", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <Tooltip content={<BruteTooltip />} />
              <Line type="monotone" dataKey="kg" stroke="#fcd34d" strokeWidth={2} dot={{ fill: "#fcd34d", r: 3, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mood strip */}
      <div className="brute-card p-4">
        <p className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-widest mb-4">MOOD — LAST 7 DAYS</p>
        {moodLogs.length === 0 ? (
          <p className="text-[#888] text-xs font-mono">No mood logs. Tell Chitta how you feel.</p>
        ) : (
          <div className="flex gap-4">
            {moodLogs.map((l) => (
              <div key={l.id} className="text-center">
                <div className="text-2xl border-2 border-[#333] w-10 h-10 flex items-center justify-center"
                  style={{ borderColor: MOOD_COLOR[l.notes ?? ""] ?? "#333" }}>
                  {MOOD_EMOJI[l.notes ?? ""] ?? "?"}
                </div>
                <p className="text-[9px] text-[#888] font-mono mt-1">
                  {new Date(l.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
