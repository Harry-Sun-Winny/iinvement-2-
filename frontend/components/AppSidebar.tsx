"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Bot, ClipboardCheck, LogOut, User,
  CalendarDays, TrendingUp, BookOpen, LayoutGrid,
  Eye, Target, Newspaper, Settings, LineChart
} from "lucide-react";
import { useTheme } from "./providers/ThemeProvider";
import AppearanceSettings from "./AppearanceSettings";

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  // Auto calculate active menu tab
  const getActiveTab = (): string => {
    if (pathname === "/") return "dashboard";
    if (pathname.startsWith("/ledger")) return "ledger";
    if (pathname.startsWith("/market-calendar")) return "market-calendar";
    if (pathname.startsWith("/market")) return "market";
    if (pathname.startsWith("/analysis")) return "analysis";
    if (pathname.startsWith("/deep-analysis")) return "deep-analysis";
    if (pathname.startsWith("/scoring")) return "scoring";
    if (pathname.startsWith("/checklist")) return "checklist";
    if (pathname.startsWith("/holdings")) return "holdings";
    if (pathname.startsWith("/account")) return "account";
    if (pathname.startsWith("/framework")) return "framework";
    return "";
  };

  const active = getActiveTab();

  const mainGroup = [
    { page: "dashboard", href: "/",           icon: BarChart3,     label: "Dashboard" },
    { page: "holdings",  href: "/holdings",   icon: LayoutGrid,    label: "Holdings" },
    { page: "ledger",    href: "/ledger",     icon: BookOpen,      label: "Sổ Cái Tài Sản" },
  ];

  const toolsGroup = [
    { page: "market",          href: "/market",          icon: TrendingUp,    label: "Market" },
    { page: "market-calendar", href: "/market-calendar", icon: CalendarDays,  label: "Lịch thị trường" },
    { page: "analysis",        href: "/analysis",        icon: Bot,           label: "AI Analysis" },
    { page: "deep-analysis",   href: "/deep-analysis",   icon: LineChart,     label: "Phân tích chuyên sâu" },
    { page: "scoring",         href: "/scoring",         icon: ClipboardCheck, label: "Chấm điểm cổ phiếu" },
    { page: "checklist",       href: "/checklist",       icon: ClipboardCheck, label: "Checklist" },
    { page: "account",         href: "/account",         icon: User,          label: "Tài khoản" },
  ];

  function NavItem({
    page, href, icon: Icon, label,
  }: { page: string; href: string; icon: any; label: string }) {
    const isActive = active === page;
    return (
      <button
        onClick={() => router.push(href)}
        className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 text-left group ${
          isActive
            ? "bg-[var(--accent)]/15 text-white shadow-[0_0_12px_rgba(100,120,255,0.05)] border-l-2 border-[var(--accent)]"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
        style={{ color: isActive ? "var(--auto-text)" : "var(--text-color)" }}
      >
        <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-[var(--accent)]" : "text-slate-400 group-hover:text-white"}`} />
        <span className="sidebar-label truncate">{label}</span>
        {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
      </button>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 p-4 flex flex-col bg-[#16131D] border-r border-white/5">
      {/* Sidebar Content */}
      <div className="relative flex h-full flex-col gap-4 overflow-y-auto no-scrollbar">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 pt-2 shrink-0">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide text-white">
              Antigravity
            </h1>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold leading-none mt-0.5">
              Portfolio Console
            </p>
          </div>
        </div>

        {/* Group 1: Navigation */}
        <div className="shrink-0 rounded-xl bg-white/[0.02] border border-white/[0.04] p-1.5">
          <nav className="flex flex-col gap-0.5">
            {mainGroup.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </nav>
        </div>

        {/* Group 2: Tools */}
        <div className="shrink-0 rounded-xl bg-white/[0.02] border border-white/[0.04] p-1.5">
          <nav className="flex flex-col gap-0.5">
            {toolsGroup.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </nav>
        </div>

        {/* Appearance Settings Panel Shortcut */}
        <div className="mt-auto space-y-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-all border border-transparent"
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-400" />
            Cài đặt giao diện
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Đăng xuất
          </button>
        </div>
      </div>

      <AppearanceSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  );
}
