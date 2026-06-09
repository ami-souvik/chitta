"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiGet, apiPatch, formatDate } from "@/lib/api";
import { Task } from "@/lib/types";
import { Circle, Clock, CheckCircle2 } from "lucide-react";

const STATUS_COLS: Task["status"][] = ["pending", "in_progress", "done"];
const STATUS_LABEL: Record<Task["status"], string> = { pending: "TODO", in_progress: "DOING", done: "DONE" };
const STATUS_COLOR: Record<Task["status"], string> = {
  pending:     "border-[#fcd34d] shadow-[3px_3px_0px_#fcd34d]",
  in_progress: "border-[#fb923c] shadow-[3px_3px_0px_#fb923c]",
  done:        "border-[#4ade80] shadow-[3px_3px_0px_#4ade80]",
};
const STATUS_HEADER: Record<Task["status"], string> = {
  pending:     "text-[#fcd34d]",
  in_progress: "text-[#fb923c]",
  done:        "text-[#4ade80]",
};
const PRIORITY_COLOR: Record<Task["priority"], string> = {
  high:   "bg-[#ff4d4d] text-white",
  medium: "bg-[#fcd34d] text-black",
  low:    "bg-[#1a1a1a] text-[#888]",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { getToken } = useAuth();

  const load = useCallback(async () => {
    const t = await getToken();
    if (t) apiGet<Task[]>("/tasks?limit=100", t).then(setTasks).catch(() => {});
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  async function advance(task: Task) {
    const next: Record<Task["status"], Task["status"]> = { pending: "in_progress", in_progress: "done", done: "done" };
    const t = await getToken();
    if (!t) return;
    const updated = await apiPatch<Task>(`/tasks/${task.id}`, { status: next[task.status] }, t);
    setTasks((ts) => ts.map((x) => (x.id === updated.id ? updated : x)));
  }

  const grouped = STATUS_COLS.reduce<Record<Task["status"], Task[]>>(
    (acc, s) => { acc[s] = tasks.filter((t) => t.status === s); return acc; },
    { pending: [], in_progress: [], done: [] }
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl lg:max-w-4xl mx-auto">
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-black tracking-tight">TASKS<span className="text-[#fcd34d]">.</span></h1>
        <p className="text-[#888] text-xs font-mono">{tasks.filter(t => t.status !== "done").length} open</p>
      </div>

      {/* Kanban — stacked on mobile, 3-col on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {STATUS_COLS.map((status) => (
          <div key={status} className={`bg-[#111] border-2 border-white p-4 ${STATUS_COLOR[status]}`}>
            <div className={`flex items-center gap-2 mb-4`}>
              {status === "pending"     && <Circle className={`h-3.5 w-3.5 ${STATUS_HEADER[status]}`} />}
              {status === "in_progress" && <Clock className={`h-3.5 w-3.5 ${STATUS_HEADER[status]}`} />}
              {status === "done"        && <CheckCircle2 className={`h-3.5 w-3.5 ${STATUS_HEADER[status]}`} />}
              <p className={`text-xs font-mono font-black uppercase tracking-widest ${STATUS_HEADER[status]}`}>
                {STATUS_LABEL[status]}
              </p>
              <span className={`ml-auto text-xs font-mono font-bold bg-[#1a1a1a] border border-[#333] px-1.5 py-0.5`}>
                {grouped[status].length}
              </span>
            </div>

            <div className="space-y-2">
              {grouped[status].length === 0 ? (
                <p className="text-[#444] text-xs font-mono py-4 text-center">empty</p>
              ) : (
                grouped[status].map((task) => {
                  const overdue = task.due_date && task.due_date < today && task.status !== "done";
                  return (
                    <div key={task.id} className="bg-[#0a0a0a] border-2 border-[#333] p-3 space-y-2 hover:border-white transition-colors">
                      <p className="text-sm font-bold leading-tight">{task.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 border border-[#333] ${PRIORITY_COLOR[task.priority]}`}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className={`text-[9px] font-mono ${overdue ? "text-[#ff4d4d]" : "text-[#888]"}`}>
                            {overdue ? "⚠ " : ""}{formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                      {status !== "done" && (
                        <button onClick={() => advance(task)}
                          className="text-[10px] font-mono font-bold text-[#4ade80] hover:underline">
                          {status === "pending" ? "→ start" : "→ done"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
