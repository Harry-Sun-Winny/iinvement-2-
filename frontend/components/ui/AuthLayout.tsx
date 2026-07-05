"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  formTitle: string;
  formSubtitle?: string;
  children: React.ReactNode;
}

export default function AuthLayout({
  title,
  subtitle,
  formTitle,
  formSubtitle,
  children,
}: AuthLayoutProps) {
  return (
    <main
      className="min-h-screen w-full flex items-center justify-center relative bg-[var(--panel)] p-4 md:p-8"
      style={{ zIndex: DESIGN_TOKENS.zIndex.base }}
    >
      {/* Centered card layout */}
      <div
        className="grid w-full max-w-5xl overflow-hidden rounded-[14px] border md:grid-cols-[1.1fr_1fr]"
        style={{
          backgroundColor: "var(--panel)",
          borderColor: "var(--border)",
          boxShadow: DESIGN_TOKENS.shadow.lg,
        }}
      >
        {/* Left column - Info panel */}
        <section
          className="hidden p-10 md:flex flex-col justify-between border-r text-white relative overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          {/* Logo Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-black tracking-widest uppercase">
                Antigravity
              </p>
            </div>
          </div>

          {/* Slogan */}
          <div className="my-16 space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Hệ thống điều khiển danh mục quỹ chuyên nghiệp.
            </p>
          </div>

          {/* Slogan Footer info */}
          <div className="flex items-center gap-2.5 text-xs font-bold text-[var(--accent)] tracking-wide">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            <span>{subtitle}</span>
          </div>
        </section>

        {/* Right column - Form */}
        <section className="p-8 flex flex-col justify-center bg-[var(--panel)]">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest">
                Workspace Portal
              </p>
              <h2 className="mt-2 text-2xl font-black text-white tracking-wide">
                {formTitle}
              </h2>
              {formSubtitle && (
                <p className="mt-1.5 text-xs text-slate-400 font-medium">
                  {formSubtitle}
                </p>
              )}
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
