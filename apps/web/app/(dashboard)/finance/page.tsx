"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiGet, formatINR, formatDate } from "@/lib/api";
import { FinanceEntry } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  food: "#4ade80", transport: "#60a5fa", housing: "#a78bfa",
  utilities: "#fcd34d", entertainment: "#f472b6", health: "#fb923c",
  shopping: "#34d399", education: "#818cf8", salary: "#4ade80",
  freelance: "#a78bfa", investment: "#60a5fa", other: "#888888",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#111] border-2 border-white px-3 py-2 text-xs font-mono">
        <p className="font-bold">{payload[0].name}</p>
        <p className="text-[#4ade80]">{formatINR(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function FinancePage() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [summary, setSummary] = useState<{ income: number; expenses: number; balance: number } | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    getToken().then((t) => {
      if (!t) return;
      apiGet<FinanceEntry[]>("/finance/entries?limit=50", t).then(setEntries).catch(() => {});
      apiGet<{ income: number; expenses: number; balance: number }>("/finance/summary?period=month", t).then(setSummary).catch(() => {});
    });
  }, [getToken]);

  const byCategory = entries
    .filter((e) => e.type === "expense")
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {});

  const pieData = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="text-3xl font-black tracking-tight">FINANCE<span className="text-[#4ade80]">.</span></h1>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "INCOME", value: summary?.income ?? 0, color: "#4ade80" },
          { label: "SPENT",  value: summary?.expenses ?? 0, color: "#ff4d4d" },
          { label: "NET",    value: summary?.balance ?? 0,  color: (summary?.balance ?? 0) >= 0 ? "#4ade80" : "#ff4d4d" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#111] border-2 border-white p-4" style={{ boxShadow: `3px 3px 0px ${color}` }}>
            <p className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-widest mb-1">{label}</p>
            <p className="text-xl lg:text-2xl font-black font-mono" style={{ color }}>{formatINR(value)}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie */}
        <div className="brute-card p-4">
          <p className="text-xs font-mono font-bold text-[#888] uppercase tracking-widest mb-4">BY CATEGORY</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} strokeWidth={2} stroke="#111">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name] ?? "#888"} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#888] text-sm font-mono py-8 text-center">No expenses yet</p>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map((d) => (
              <span key={d.name} className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase">
                <span className="w-2 h-2 border border-white inline-block" style={{ background: CATEGORY_COLORS[d.name] ?? "#888" }} />
                {d.name}
              </span>
            ))}
          </div>
        </div>

        {/* Transaction list */}
        <div className="brute-card p-4">
          <p className="text-xs font-mono font-bold text-[#888] uppercase tracking-widest mb-4">RECENT</p>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {entries.length === 0 ? (
              <p className="text-[#888] text-sm font-mono py-8 text-center">Log via chat →</p>
            ) : (
              entries.slice(0, 20).map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b border-[#222] pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 shrink-0 h-full self-stretch"
                      style={{ background: CATEGORY_COLORS[e.category] ?? "#888" }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{e.description ?? e.category}</p>
                      <p className="text-[10px] text-[#888] font-mono">{e.category} · {formatDate(e.date)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-black font-mono shrink-0 ml-2 ${e.type === "income" ? "text-[#4ade80]" : "text-[#ff4d4d]"}`}>
                    {e.type === "income" ? "+" : "-"}{formatINR(e.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
