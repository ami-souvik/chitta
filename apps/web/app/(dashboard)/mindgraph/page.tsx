"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import { apiGet } from "@/lib/api";
import { GraphNode, GraphEdge } from "@/lib/types";
import { X } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  idea:          "#fcd34d",
  worry:         "#ff4d4d",
  goal:          "#4ade80",
  journal_theme: "#a78bfa",
  finance_goal:  "#60a5fa",
  health_goal:   "#f472b6",
  task_cluster:  "#fb923c",
};

export default function MindGraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const { getToken } = useAuth();

  useEffect(() => {
    getToken().then(async (t) => {
      if (!t) return;
      const [rawNodes, rawEdges] = await Promise.all([
        apiGet<GraphNode[]>("/mindgraph/nodes", t).catch(() => [] as GraphNode[]),
        apiGet<GraphEdge[]>("/mindgraph/edges", t).catch(() => [] as GraphEdge[]),
      ]);

      const color = (type: string) => TYPE_COLORS[type] ?? "#888";

      const flowNodes: Node[] = rawNodes.map((n, i) => ({
        id: n.id,
        data: { label: n.label, type: n.type, raw: n },
        position: { x: (i % 5) * 220 + 60, y: Math.floor(i / 5) * 160 + 60 },
        style: {
          background: color(n.type),
          color: "#000",
          border: "2px solid #fff",
          borderRadius: 0,
          padding: "6px 12px",
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "monospace",
          boxShadow: `3px 3px 0px #fff`,
        },
      }));

      const flowEdges: Edge[] = rawEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.type,
        style: { stroke: "#444", strokeWidth: 2 },
        labelStyle: { fontSize: 9, fill: "#888", fontFamily: "monospace", fontWeight: 700 },
        labelBgStyle: { fill: "#0a0a0a", fillOpacity: 0.9 },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    });
  }, [getToken, setEdges, setNodes]);

  const onNodeClick: NodeMouseHandler = useCallback(async (_, node) => {
    const raw = node.data.raw as GraphNode;
    setSelected(raw);
    setExplanation("thinking...");
    const t = await getToken();
    if (!t) return;
    try {
      const res = await apiGet<{ explanation: string }>(`/mindgraph/explain/${raw.id}`, t);
      setExplanation(res.explanation);
    } catch {
      setExplanation("Could not load explanation.");
    }
  }, [getToken]);

  return (
    <div className="relative w-full h-[calc(100vh-48px)] lg:h-screen">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-[#0a0a0a] border-2 border-white p-3 text-[10px] font-mono space-y-1"
        style={{ boxShadow: "3px 3px 0px #fff" }}>
        <p className="font-black text-white uppercase tracking-widest mb-2">TYPES</p>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 border border-white" style={{ background: color }} />
            <span className="text-[#888] uppercase">{type.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        style={{ background: "#0a0a0a" }}
      >
        <Background color="#1a1a1a" gap={24} />
        <Controls style={{ border: "2px solid white", background: "#111" }} />
        <MiniMap nodeColor={(n) => TYPE_COLORS[n.data?.type] ?? "#888"}
          style={{ border: "2px solid white", background: "#111" }} />
      </ReactFlow>

      {/* Side panel */}
      {selected && (
        <div className="absolute top-0 right-0 h-full w-72 bg-[#0a0a0a] border-l-2 border-white z-20 flex flex-col"
          style={{ boxShadow: "-4px 0 0 0 #fff" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-white">
            <p className="text-xs font-mono font-black uppercase text-white truncate">{selected.label}</p>
            <button onClick={() => setSelected(null)} className="text-[#888] hover:text-white ml-2 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            <div>
              <p className="text-[9px] font-mono text-[#888] uppercase tracking-widest mb-1">TYPE</p>
              <span className="text-xs font-mono font-bold px-2 py-0.5 border border-white"
                style={{ color: TYPE_COLORS[selected.type] ?? "#fff", borderColor: TYPE_COLORS[selected.type] ?? "#fff" }}>
                {selected.type.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-[9px] font-mono text-[#888] uppercase tracking-widest mb-2">CHITTA SAYS</p>
              <p className="text-sm text-white/80 leading-relaxed font-mono">{explanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
