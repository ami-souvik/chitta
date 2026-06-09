"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { X, Send, Loader2, MessageSquareDot, Plus, ChevronLeft, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

interface ActionMeta {
  domain: string;
  id: string | null;
  href: string;
  emoji: string;
  label: string;
  sub: string;
  color: string;
}

interface Session {
  session_id: string;
  title: string;
  created_at: string;
}

type Panel = "chat" | "sessions";

function ActionCard({ meta }: { meta: ActionMeta }) {
  return (
    <Link href={meta.href}
      className="flex items-center gap-3 border-2 border-white p-3 mt-1 hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform w-full"
      style={{ background: "#111", boxShadow: `3px 3px 0px ${meta.color}`, borderColor: meta.color }}>
      <span className="text-2xl shrink-0">{meta.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white truncate">{meta.label}</p>
        <p className="text-[10px] font-mono mt-0.5" style={{ color: meta.color }}>{meta.sub}</p>
      </div>
      <span className="text-[10px] font-mono text-[#888] shrink-0 uppercase border border-[#333] px-1.5 py-0.5">
        {meta.domain} →
      </span>
    </Link>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-black text-white">{children}</strong>,
        em: ({ children }) => <em className="text-[#888]">{children}</em>,
        ul: ({ children }) => <ul className="list-none space-y-0.5 my-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
        li: ({ children }) => <li className="text-sm before:content-['–'] before:mr-1.5 before:text-[#888]">{children}</li>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock
            ? <pre className="bg-[#0a0a0a] border border-[#333] p-2 text-[11px] overflow-x-auto my-1 font-mono"><code>{children}</code></pre>
            : <code className="bg-[#0a0a0a] border border-[#333] px-1 text-[11px] font-mono text-[#4ade80]">{children}</code>;
        },
        h1: ({ children }) => <p className="font-black text-sm text-white mb-1">{children}</p>,
        h2: ({ children }) => <p className="font-black text-xs text-[#888] uppercase tracking-widest mb-1">{children}</p>,
        h3: ({ children }) => <p className="font-bold text-xs mb-0.5">{children}</p>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-[#4ade80] pl-2 text-[#888] my-1">{children}</blockquote>,
        hr: () => <hr className="border-[#333] my-2" />,
        a: ({ href, children }) => <a href={href} className="text-[#4ade80] underline" target="_blank" rel="noopener">{children}</a>,
      }}>
      {content}
    </ReactMarkdown>
  );
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("chat");
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<(ChatMessage & { action?: ActionMeta })[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { getToken } = useAuth();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (open && panel === "chat") setTimeout(() => inputRef.current?.focus(), 100); }, [open, panel]);

  const loadSessions = useCallback(async () => {
    const t = await getToken();
    if (!t) return;
    try {
      const res = await fetch("/api/chat/sessions", { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) setSessions(await res.json());
    } catch {}
  }, [getToken]);

  const loadSession = useCallback(async (sid: string) => {
    const t = await getToken();
    if (!t) return;
    try {
      const res = await fetch(`/api/chat/sessions/${sid}`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map((m: ChatMessage) => ({
          id: m.id, role: m.role, content: m.content, created_at: m.created_at,
        })));
        setSessionId(sid);
        setPanel("chat");
      }
    } catch {}
  }, [getToken]);

  const newChat = () => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setPanel("chat");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    if (text === "/clear") { setMessages([]); setInput(""); return; }

    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, { id: assistantId, role: "assistant" as const, content: "", created_at: new Date().toISOString() }]);

    try {
      const token = await getToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history: messages.slice(-10), session_id: sessionId }),
      });
      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw.trim() === "[DONE]") break;
          try {
            const json = JSON.parse(raw);
            if (json.action) {
              // Attach action card to the assistant message
              setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, action: json.action } : msg));
            } else if (json.token) {
              full += json.token;
              setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, content: full } : msg));
            }
          } catch {}
        }
      }
    } catch {
      setMessages((m) => m.map((msg) => msg.id === assistantId ? { ...msg, content: "Connection error. Try again." } : msg));
    } finally {
      setStreaming(false);
    }
  }

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  return (
    <>
      {/* FAB */}
      {!open && (
        <button onClick={() => { setOpen(true); loadSessions(); }}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-12 h-12 bg-[#4ade80] border-2 border-white flex items-center justify-center transition-all hover:translate-x-[-1px] hover:translate-y-[-1px]"
          style={{ boxShadow: "3px 3px 0px #fff" }}>
          <MessageSquareDot className="h-5 w-5 text-black" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 lg:inset-auto lg:right-0 lg:top-0 lg:h-full lg:w-[400px] z-50 flex flex-col bg-[#0a0a0a] lg:border-l-2 border-white"
          style={{ boxShadow: "-4px 0 0 0 #fff" }}>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 h-14 border-b-2 border-white shrink-0 bg-[#111]">
            {panel === "sessions" ? (
              <button onClick={() => setPanel("chat")} className="flex items-center gap-1 text-sm font-bold hover:text-[#4ade80]">
                <ChevronLeft className="h-4 w-4" /> BACK
              </button>
            ) : (
              <div>
                <p className="font-black text-sm tracking-tight">CHITTA CHAT</p>
                <p className="text-[10px] font-mono text-[#888]">session · {sessionId.slice(0, 8)}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              {panel === "chat" && (
                <>
                  <button onClick={() => { loadSessions(); setPanel("sessions"); }}
                    className="border-2 border-[#333] p-1.5 hover:border-white transition-colors" title="History">
                    <Clock className="h-3.5 w-3.5 text-[#888]" />
                  </button>
                  <button onClick={newChat}
                    className="border-2 border-[#4ade80] p-1.5 hover:bg-[#4ade80] hover:text-black transition-colors" title="New chat">
                    <Plus className="h-3.5 w-3.5 text-[#4ade80] hover:text-black" />
                  </button>
                </>
              )}
              <button onClick={() => setOpen(false)} className="border-2 border-white p-1 hover:bg-white hover:text-black transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Sessions panel ── */}
          {panel === "sessions" && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-[#222]">
                <button onClick={() => { newChat(); }} className="w-full brute-btn bg-[#4ade80] text-black flex items-center justify-center gap-2 py-2">
                  <Plus className="h-4 w-4" /> New Chat
                </button>
              </div>
              {sessions.length === 0 ? (
                <p className="text-[#444] font-mono text-xs p-6 text-center">No previous sessions</p>
              ) : (
                sessions.map((s) => (
                  <button key={s.session_id} onClick={() => loadSession(s.session_id)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors",
                      s.session_id === sessionId && "border-l-4 border-l-[#4ade80] bg-[#111]"
                    )}>
                    <p className="text-sm font-bold text-white truncate">{s.title}</p>
                    <p className="text-[10px] font-mono text-[#888] mt-0.5">{fmtDate(s.created_at)}</p>
                  </button>
                ))
              )}
            </div>
          )}

          {/* ── Chat panel ── */}
          {panel === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-12 space-y-3">
                    <p className="text-4xl">🧠</p>
                    <p className="text-[#888] font-mono text-xs leading-relaxed">
                      Log in plain text.<br />
                      <span className="text-white">{`"spent ₹500 on food"`}</span><br />
                      <span className="text-white">{`"slept 7 hours last night"`}</span><br />
                      <span className="text-white">{`"idea: build X for Y"`}</span>
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[88%] border-2 px-3 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-[#4ade80] text-black border-white font-bold"
                        : "bg-[#111] text-white/90 border-[#333] font-mono text-xs"
                    )}
                      style={msg.role === "user" ? { boxShadow: "2px 2px 0px #fff" } : {}}>
                      {msg.role === "user" ? (
                        msg.content
                      ) : msg.content ? (
                        <MarkdownMessage content={msg.content} />
                      ) : streaming ? (
                        <Loader2 className="h-3 w-3 animate-spin text-[#4ade80]" />
                      ) : null}
                    </div>
                    {/* Action thumbnail card */}
                    {msg.action && (
                      <div className="max-w-[88%] w-full mt-1">
                        <ActionCard meta={msg.action} />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t-2 border-white bg-[#111] shrink-0">
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Log something..."
                    rows={1}
                    className="flex-1 bg-[#0a0a0a] border-2 border-white text-white text-sm px-3 py-2 resize-none outline-none placeholder:text-[#444] font-mono focus:border-[#4ade80] transition-colors"
                    style={{ minHeight: 40 }}
                  />
                  <button onClick={send} disabled={streaming || !input.trim()}
                    className="w-10 h-10 bg-[#4ade80] border-2 border-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-white transition-colors"
                    style={{ boxShadow: "2px 2px 0px #fff" }}>
                    <Send className="h-4 w-4 text-black" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
