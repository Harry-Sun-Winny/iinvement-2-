"use client";

import React from "react";
import { useTranslation } from "@/components/providers/I18nProvider";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();

  return (
    <div
      role="group"
      aria-label={language === "vi" ? "Chọn ngôn ngữ" : "Choose language"}
      className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.035] p-1 text-xs font-bold text-slate-400"
    >
      <button
        type="button"
        onClick={() => setLanguage("vi")}
        aria-pressed={language === "vi"}
        aria-label="Tiếng Việt"
        className={`rounded-lg px-2.5 py-1.5 transition-colors ${
          language === "vi"
            ? "bg-white/[0.08] text-[var(--accent)]"
            : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-200"
        }`}
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        aria-label="English"
        className={`rounded-lg px-2.5 py-1.5 transition-colors ${
          language === "en"
            ? "bg-white/[0.08] text-[var(--accent)]"
            : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-200"
        }`}
      >
        EN
      </button>
    </div>
  );
}
