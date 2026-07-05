import { useState, useEffect } from "react";

export const TABLE_THEMES = [
  { name: "blue", hex: "#3b82f6", textClass: "text-blue-400" },
  { name: "emerald", hex: "#10b981", textClass: "text-emerald-400" },
  { name: "rose", hex: "#f43f5e", textClass: "text-rose-400" },
  { name: "amber", hex: "#f59e0b", textClass: "text-amber-400" },
  { name: "purple", hex: "#a855f7", textClass: "text-purple-400" },
  { name: "red", hex: "#ef4444", textClass: "text-red-400" },
  { name: "orange", hex: "#f97316", textClass: "text-orange-400" },
  { name: "yellow", hex: "#eab308", textClass: "text-yellow-400" },
  { name: "lime", hex: "#84cc16", textClass: "text-lime-400" },
  { name: "green", hex: "#22c55e", textClass: "text-green-400" },
  { name: "teal", hex: "#14b8a6", textClass: "text-teal-400" },
  { name: "cyan", hex: "#06b6d4", textClass: "text-cyan-400" },
  { name: "sky", hex: "#0ea5e9", textClass: "text-sky-400" },
  { name: "indigo", hex: "#6366f1", textClass: "text-indigo-400" },
  { name: "violet", hex: "#8b5cf6", textClass: "text-violet-400" },
  { name: "fuchsia", hex: "#d946ef", textClass: "text-fuchsia-400" },
  { name: "pink", hex: "#ec4899", textClass: "text-pink-400" },
  { name: "slate", hex: "#64748b", textClass: "text-slate-400" },
  { name: "zinc", hex: "#71717a", textClass: "text-zinc-400" },
  { name: "stone", hex: "#78716c", textClass: "text-stone-400" }
];

export function useTableTheme() {
  const [theme, setThemeState] = useState("blue");

  useEffect(() => {
    const saved = localStorage.getItem("table-theme-color");
    if (saved) setThemeState(saved);

    function handleChanged() {
      const current = localStorage.getItem("table-theme-color") || "blue";
      setThemeState(current);
    }

    window.addEventListener("table-theme-changed", handleChanged);
    return () => window.removeEventListener("table-theme-changed", handleChanged);
  }, []);

  const setTheme = (name: string) => {
    localStorage.setItem("table-theme-color", name);
    setThemeState(name);
    window.dispatchEvent(new Event("table-theme-changed"));
  };

  const currentTheme = TABLE_THEMES.find(t => t.name === theme) || TABLE_THEMES[0];

  return {
    theme: currentTheme.name,
    textClass: currentTheme.textClass,
    setTheme,
    themes: TABLE_THEMES
  };
}
