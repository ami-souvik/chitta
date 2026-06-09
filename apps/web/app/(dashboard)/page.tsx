"use client";

import { useUser } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { apiGet, formatINR } from "@/lib/api";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, CheckSquare, Heart, BookOpen, Lightbulb } from "lucide-react";

export default function DashboardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GM" : hour < 17 ? "Hey" : "GN";

  const [summary, setSummary] = useState<{ income: number; expenses: number; balance: number } | null>(null);
  const [taskCount, setTaskCount] = useState<number | null>(null);

  useEffect(() => {
    getToken().then((t) => {
      if (!t) return;
      apiGet<{ income: number; expenses: number; balance: number }>("/finance/summary?period=month", t)
        .then(setSummary).catch(() => {});
      apiGet<any[]>("/tasks?status=pending&limit=100", t)
        .then((d) => setTaskCount(d.length)).catch(() => {});
    });
  }, [getToken]);

  const quickLinks = [
    { href: "/finance",   label: "Finance",  color: "bg-[#4ade80] text-black",   icon: TrendingUp },
    { href: "/tasks",     label: "Tasks",    color: "bg-[#fcd34d] text-black",   icon: CheckSquare },
    { href: "/health",    label: "Health",   color: "bg-[#f472b6] text-black",   icon: Heart },
    { href: "/journal",   label: "Journal",  color: "bg-[#a78bfa] text-black",   icon: BookOpen },
    { href: "/ideas",     label: "Ideas",    color: "bg-[#fb923c] text-black",   icon: Lightbulb },
    { href: "/mindgraph", label: "Graph",    color: "bg-[#60a5fa] text-black",   icon: ArrowRight },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-2xl lg:max-w-none mx-auto">

      {/* Greeting */}
      <div className="brute-card p-5">
        <p className="text-[#888] text-xs font-mono uppercase tracking-widest mb-1">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
        </p>
        <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-none">
          {greeting}, {user?.firstName ?? "there"}<span className="text-[#4ade80]">.</span>
        </h1>
        <p className="text-[#888] text-sm mt-2">What's on your mind today?</p>
      </div>

      {/* Balance hero */}
      <div className="brute-card p-5 border-[#4ade80]" style={{ boxShadow: "4px 4px 0px #4ade80" }}>
        <p className="text-[#888] text-xs font-mono uppercase tracking-widest mb-2">This Month — Net</p>
        <p className="text-5xl font-black font-mono-num text-[#4ade80]">
          {summary ? formatINR(summary.balance) : "₹—"}
        </p>
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-[10px] text-[#888] uppercase tracking-wide font-mono">Income</p>
            <p className="text-lg font-bold text-[#4ade80]">{summary ? formatINR(summary.income) : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#888] uppercase tracking-wide font-mono">Spent</p>
            <p className="text-lg font-bold text-[#ff4d4d]">{summary ? formatINR(summary.expenses) : "—"}</p>
          </div>
          {taskCount !== null && (
            <div>
              <p className="text-[10px] text-[#888] uppercase tracking-wide font-mono">Pending</p>
              <p className="text-lg font-bold text-[#fcd34d]">{taskCount} tasks</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick links grid */}
      <div className="grid grid-cols-3 gap-3">
        {quickLinks.map(({ href, label, color, icon: Icon }) => (
          <Link key={href} href={href}
            className={`${color} border-2 border-white p-4 flex flex-col gap-2 font-bold text-sm active:translate-x-[2px] active:translate-y-[2px] transition-transform`}
            style={{ boxShadow: "3px 3px 0px #ffffff" }}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-[#1a1a1a] border-2 border-[#888] p-4">
        <p className="text-[#888] text-sm font-mono">
          💬 Use the chat button to log expenses, tasks, health, journal entries, and ideas — all in plain text.
        </p>
      </div>
    </div>
  );
}
