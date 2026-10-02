"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Bot, ClipboardCheck, GitBranch, LogOut, User,
  CalendarDays, TrendingUp, BookOpen, LayoutGrid,
  Eye, Target, Newspaper, Settings, LineChart, FileText
} from "lucide-react";
import { useTheme } from "./providers/ThemeProvider";
import AppearanceSettings from "./AppearanceSettings";
import { useTranslation } from "@/components/providers/I18nProvider";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

export default function AppSidebar() {
  const { t } = useTranslation();
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
    if (pathname.startsWith("/research")) return "research";
    if (pathname.startsWith("/deep-analysis/review")) return "deep-analysis-review";
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
    { page: "dashboard", href: "/",           icon: BarChart3,     labelKey: "sidebar.dashboard" },
    { page: "holdings",  href: "/holdings",   icon: LayoutGrid,    labelKey: "sidebar.holdings" },
    { page: "ledger",    href: "/ledger",     icon: BookOpen,      labelKey: "sidebar.ledger" },
  ];

  const toolsGroup = [
    { page: "market",          href: "/market",          icon: TrendingUp,    labelKey: "sidebar.market" },
    { page: "market-calendar", href: "/market-calendar", icon: CalendarDays,  labelKey: "sidebar.calendar" },
    { page: "analysis",        href: "/analysis",        icon: Bot,           labelKey: "sidebar.analysis" },
    { page: "research",        href: "/research",        icon: GitBranch,      labelKey: "Research workspace" },
    { page: "deep-analysis",   href: "/deep-analysis",   icon: LineChart,     labelKey: "sidebar.deepAnalysis" },
    { page: "deep-analysis-review", href: "/deep-analysis/review", icon: FileText, labelKey: "sidebar.review" },
    { page: "scoring",         href: "/scoring",         icon: ClipboardCheck, labelKey: "sidebar.scoring" },
    { page: "checklist",       href: "/checklist",       icon: ClipboardCheck, labelKey: "sidebar.checklist" },
    { page: "account",         href: "/account",         icon: User,          labelKey: "sidebar.account" },
  ];

  function NavItem({
    page, href, icon: Icon, labelKey,
  }: { page: string; href: string; icon: any; labelKey: string }) {
    const isActive = active === page;
    return (
      <button
        onClick={() => router.push(href)}
        className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 text-left group ${
          isActive
            ? "bg-[var(--accent)]/15 text-white shadow-[0_0_12px_rgba(100,120,255,0.05)] border-l-2 border-[var(--accent)]"
            : "opacity-60 hover:bg-white/5 hover:opacity-100"
        }`}
        style={{ color: isActive ? "var(--auto-text)" : "var(--text-color)" }}
      >
        <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-[var(--accent)]" : "opacity-80 group-hover:opacity-100"}`} />
        <span className={`sidebar-label truncate ${isActive ? 'rainbow-text !text-[15px]' : ''}`}>{t(labelKey)}</span>
        {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
      </button>
    );
  }

  return (
    <aside 
      className="fixed inset-y-0 left-0 z-40 w-16 md:w-64 p-2 md:p-4 flex flex-col border-r shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-colors duration-300"
      style={{
        background: "var(--sidebar, var(--panel, #16131D))",
        backdropFilter: "blur(20px) saturate(1.5)",
        WebkitBackdropFilter: "blur(20px) saturate(1.5)",
        borderColor: "var(--border, rgba(255, 255, 255, 0.08))"
      }}
    >
      {/* Sidebar Content */}
      <div className="relative flex h-full flex-col gap-4 overflow-y-auto no-scrollbar">
        {/* Logo */}
        <div className="flex items-center gap-3 px-1 md:px-2 pt-2 shrink-0">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-base font-black tracking-wide text-white">
              Antigravity
            </h1>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold leading-none mt-0.5">
              Portfolio Console
            </p>
          </div>
        </div>

        {/* Group 1: Navigation */}
        <div className="shrink-0 rounded-xl bg-white/[0.02] border border-white/[0.04] p-1 md:p-1.5">
          <nav className="flex flex-col gap-0.5">
            {mainGroup.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </nav>
        </div>

        {/* Group 2: Tools */}
        <div className="shrink-0 rounded-xl bg-white/[0.02] border border-white/[0.04] p-1 md:p-1.5">
          <nav className="flex flex-col gap-0.5">
            {toolsGroup.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </nav>
        </div>

        {/* Appearance Settings Panel Shortcut */}
        <div className="mt-auto space-y-3">
          <div className="flex justify-center py-1">
            <LanguageSwitcher />
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold opacity-60 hover:bg-white/5 hover:opacity-100 transition-all border border-transparent"
            style={{ color: "var(--text-color)" }}
          >
            <Settings className="h-4 w-4 shrink-0 opacity-80" />
            {t("sidebar.settings")}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t("sidebar.logout")}
          </button>
        </div>
      </div>

      <AppearanceSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  );
}




