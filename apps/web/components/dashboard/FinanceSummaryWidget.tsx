"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiGet, formatINR } from "@/lib/api";

interface Summary { income: number; expenses: number; balance: number; }

export function FinanceSummaryWidget() {
  const [data, setData] = useState<Summary | null>(null);
  const { getToken } = useAuth();
  useEffect(() => {
    getToken().then((t) => { if (t) apiGet<Summary>("/finance/summary?period=month", t).then(setData).catch(() => {}); });
  }, [getToken]);

  return (
    <div className="bg-[#111] border-2 border-white p-4" style={{ boxShadow: "3px 3px 0px #4ade80" }}>
      <p className="text-[9px] font-mono font-black text-[#888] uppercase tracking-widest mb-3">FINANCE / MONTH</p>
      {data ? (
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-mono text-[#888]">income</span>
            <span className="font-black text-[#4ade80] text-sm font-mono">{formatINR(data.income)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-mono text-[#888]">spent</span>
            <span className="font-black text-[#ff4d4d] text-sm font-mono">{formatINR(data.expenses)}</span>
          </div>
          <div className="flex justify-between items-baseline border-t border-[#333] pt-1.5 mt-1.5">
            <span className="text-[10px] font-mono text-white font-bold">net</span>
            <span className={`font-black text-base font-mono ${data.balance >= 0 ? "text-[#4ade80]" : "text-[#ff4d4d]"}`}>{formatINR(data.balance)}</span>
          </div>
        </div>
      ) : (
        <p className="text-[#444] text-xs font-mono">no data</p>
      )}
    </div>
  );
}
