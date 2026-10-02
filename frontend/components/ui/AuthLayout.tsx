"use client";

import React from "react";
import { Check, TrendingUp } from "lucide-react";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { useTranslation } from "@/components/providers/I18nProvider";
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
  const { language } = useTranslation();
  const isVi = language === "vi";
  const benefits = isVi
    ? [
        "Quản lý danh mục và hiệu suất tập trung",
        "Phân tích thông tin với nguồn tham chiếu",
        "Không thực hiện lệnh mua bán tài sản",
      ]
    : [
        "Centralized portfolio and performance tracking",
        "Analysis with referenced information sources",
        "No asset trading or order execution",
      ];

  return (
    <main
      className="relative min-h-[100dvh] w-full overflow-y-auto bg-[#070b14] text-slate-100"
      style={{ zIndex: DESIGN_TOKENS.zIndex.base }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.035),transparent_38%),radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent_32%)]"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-10 lg:py-7">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <TrendingUp className="h-5 w-5 text-[var(--accent)]" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-[0.14em] text-slate-100">
                ANTIGRAVITY
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                Portfolio workspace
              </p>
            </div>
          </div>
          <LanguageSwitcher />
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.78fr)] lg:gap-16 lg:py-10">
          <section className="hidden max-w-xl lg:block" aria-labelledby="auth-value-heading">
            <p className="text-sm font-semibold text-[var(--accent)]">
              {isVi ? "Không gian quyết định tài chính" : "Financial decision workspace"}
            </p>
            <h1
              id="auth-value-heading"
              className="mt-5 max-w-[13ch] text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] text-slate-50 xl:text-5xl"
            >
              {title}
            </h1>
            <p className="mt-5 max-w-[54ch] text-base leading-7 text-slate-400">
              {subtitle}
            </p>

            <ul className="mt-8 grid gap-3" aria-label={isVi ? "Khả năng của nền tảng" : "Platform capabilities"}>
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[var(--accent)]">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mx-auto w-full max-w-[470px]" aria-labelledby="auth-form-heading">
            <div className="rounded-2xl border border-white/10 bg-[#0c121f]/95 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.42),inset_0_1px_0_rgba(255,255,255,0.045)] sm:p-8">
              <div>
                <h2 id="auth-form-heading" className="text-2xl font-extrabold tracking-[-0.025em] text-slate-50">
                  {formTitle}
                </h2>
                {formSubtitle && (
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {formSubtitle}
                  </p>
                )}
              </div>

              <div className="mt-7">
                {children}
              </div>
            </div>

            <p className="mx-auto mt-5 max-w-sm text-center text-xs leading-5 text-slate-400">
              {isVi
                ? "Nền tảng hỗ trợ quản lý và phân tích danh mục, không thực hiện giao dịch tài sản."
                : "This platform supports portfolio management and analysis. It does not execute asset trades."}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
