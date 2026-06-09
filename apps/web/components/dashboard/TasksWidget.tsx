"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiGet } from "@/lib/api";
import { Task } from "@/lib/types";

const P_COLOR: Record<string, string> = { high: "text-[#ff4d4d]", medium: "text-[#fcd34d]", low: "text-[#888]" };

export function TasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { getToken } = useAuth();
  useEffect(() => {
    getToken().then((t) => { if (t) apiGet<Task[]>("/tasks?status=pending&limit=5", t).then(setTasks).catch(() => {}); });
  }, [getToken]);

  return (
    <div className="bg-[#111] border-2 border-white p-4" style={{ boxShadow: "3px 3px 0px #fcd34d" }}>
      <p className="text-[9px] font-mono font-black text-[#888] uppercase tracking-widest mb-3">PENDING TASKS</p>
      {tasks.length === 0 ? (
        <p className="text-[#444] text-xs font-mono">clear queue</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-start gap-2">
              <span className={`text-[10px] font-mono font-black uppercase shrink-0 ${P_COLOR[t.priority]}`}>{t.priority[0]}</span>
              <span className="text-xs truncate">{t.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
