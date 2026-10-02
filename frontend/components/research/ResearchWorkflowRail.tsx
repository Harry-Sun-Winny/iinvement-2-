"use client";

import Link from "next/link";
import { Check, Database, FileSearch, LockKeyhole, Scale, ShieldCheck } from "lucide-react";

export type ResearchWorkflowStage = "analysis" | "review" | "policy";
export type ResearchWorkflowState = "complete" | "active" | "blocked" | "pending";

type Props = {
  stage: ResearchWorkflowStage;
  states?: Partial<Record<ResearchWorkflowStage, ResearchWorkflowState>>;
  isVi: boolean;
};

const stages = [
  {
    id: "analysis" as const,
    href: "/deep-analysis",
    icon: Database,
    titleVi: "Phân tích chuyên sâu",
    titleEn: "Deep analysis",
    descriptionVi: "Dữ liệu, phép đo, signal và bất định",
    descriptionEn: "Data, measurements, signals and uncertainty",
  },
  {
    id: "review" as const,
    href: "/deep-analysis/review",
    icon: FileSearch,
    titleVi: "Hồ sơ thẩm định",
    titleEn: "Review dossier",
    descriptionVi: "Claim, evidence, phản chứng và thesis contract",
    descriptionEn: "Claims, evidence, falsifiers and thesis contract",
  },
  {
    id: "policy" as const,
    href: "/scoring",
    icon: Scale,
    titleVi: "Policy & chấm điểm",
    titleEn: "Policy and scoring",
    descriptionVi: "Confidence, veto, sizing và hành động",
    descriptionEn: "Confidence, vetoes, sizing and actions",
  },
];

const stateLabel = {
  vi: { complete: "Đã đủ", active: "Đang làm", blocked: "Bị chặn", pending: "Chờ" },
  en: { complete: "Complete", active: "In progress", blocked: "Blocked", pending: "Pending" },
};

export function ResearchWorkflowRail({ stage, states, isVi }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#0a111d]/90 shadow-[0_18px_50px_rgba(2,8,23,0.28)]">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <ShieldCheck className="h-4 w-4 text-cyan-300" />
          <span>{isVi ? "Chuỗi quyết định có thể tái tạo" : "Reproducible decision chain"}</span>
          <span className="rounded-md bg-cyan-300/10 px-2 py-0.5 font-mono text-[10px] text-cyan-200">V3.2</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-medium text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Database className="h-3 w-3" />Point-in-time</span>
          <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3 w-3" />{isVi ? "Veto không bù trừ" : "Non-compensating veto"}</span>
          <span className="inline-flex items-center gap-1.5"><Scale className="h-3 w-3" />{isVi ? "Confidence khác score" : "Confidence is not score"}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3">
        {stages.map((item, index) => {
          const Icon = item.icon;
          const state = states?.[item.id] ?? (item.id === stage ? "active" : "pending");
          const isActive = item.id === stage;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex min-h-24 items-start gap-3 px-4 py-4 transition-colors lg:border-l lg:border-white/[0.06] lg:first:border-l-0 ${
                isActive ? "bg-cyan-300/[0.075]" : "hover:bg-white/[0.035]"
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                state === "complete"
                  ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                  : state === "blocked"
                    ? "border-rose-300/25 bg-rose-300/10 text-rose-200"
                    : isActive
                      ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200"
                      : "border-white/10 bg-white/[0.025] text-slate-500"
              }`}>
                {state === "complete" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-600">0{index + 1}</span>
                  <h2 className={`text-sm font-bold ${isActive ? "text-white" : "text-slate-300"}`}>
                    {isVi ? item.titleVi : item.titleEn}
                  </h2>
                  <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    state === "complete"
                      ? "border-emerald-300/20 text-emerald-300"
                      : state === "blocked"
                        ? "border-rose-300/20 text-rose-300"
                        : state === "active"
                          ? "border-cyan-300/20 text-cyan-300"
                          : "border-white/10 text-slate-600"
                  }`}>
                    {stateLabel[isVi ? "vi" : "en"][state]}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{isVi ? item.descriptionVi : item.descriptionEn}</p>
              </div>
              {isActive && <span className="absolute inset-x-4 bottom-0 h-px bg-cyan-300" />}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

