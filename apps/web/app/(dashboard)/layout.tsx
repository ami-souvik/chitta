"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/chat/ChatPanel";
import {
  LayoutDashboard, IndianRupee, CheckSquare, Heart,
  BookOpen, Lightbulb, Network,
} from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/finance", label: "Finance", icon: IndianRupee },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/health", label: "Health", icon: Heart },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/mindgraph", label: "Graph", icon: Network },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0a0a0a]">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r-2 border-white min-h-screen">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b-2 border-white">
          <span className="font-black text-xl tracking-tight text-white">chitta</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-1 px-2">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = path === href;
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition-all duration-100",
                  active
                    ? "bg-[#4ade80] text-black border-2 border-white shadow-[3px_3px_0px_#fff]"
                    : "text-[#888] hover:text-white hover:bg-[#1a1a1a] border-2 border-transparent"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t-2 border-white">
          <UserButton />
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 h-12 border-b-2 border-white sticky top-0 z-30 bg-[#0a0a0a]">
          <span className="font-black text-lg tracking-tight">chitta</span>
          <UserButton />
        </div>
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a] border-t-2 border-white flex">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-bold transition-all",
                active ? "bg-[#4ade80] text-black" : "text-[#555] hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Chat */}
      <ChatPanel />
    </div>
  );
}
