"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Search, ShieldAlert } from "lucide-react";
import {
  getDynamicParameterWeight,
  getIndustryModuleBoosts,
  INVESTMENT_MODULES,
  INVESTMENT_PARAMETER_CATALOG,
  type InvestmentModuleId,
  type InvestmentParameter,
} from "@/lib/investment-parameter-catalog";

type ReviewStatus = "unreviewed" | "evidence" | "watch" | "not-applicable";
type ParameterRecord = { status: ReviewStatus; note?: string; updatedAt: string };
type Context = "analysis" | "review" | "scoring";

const CONTEXT_COPY: Record<Context, { eyebrow: string; title: string; description: string }> = {
  analysis: {
    eyebrow: "Parameter activation · per ticker",
    title: "Hàng đợi tham số đang hoạt động",
    description: "Chọn đúng điều cần kiểm tra cho mã này trước khi đọc biểu đồ. Trọng số thay đổi theo ngành, chất lượng dữ liệu và trạng thái doanh nghiệp.",
  },
  review: {
    eyebrow: "Evidence coverage · per ticker",
    title: "Bản đồ bằng chứng 3.600 tham số",
    description: "Mỗi mục chỉ được xem là đã xác minh khi người phân tích có nguồn và ngày dữ liệu. M11 là cờ loại trừ, không được bù bằng điểm tốt.",
  },
  scoring: {
    eyebrow: "Dynamic weight · per ticker",
    title: "Trọng số trước khi chấm điểm",
    description: "Điểm số chỉ đáng tin khi tham số liên quan đã được kích hoạt, kiểm tra và không có cờ loại trừ chưa xử lý.",
  },
};

function storageKey(symbol: string) {
  return `investment-parameter-workbench:${symbol.trim().toUpperCase() || "draft"}`;
}

function statusLabel(status: ReviewStatus) {
  return status === "evidence" ? "Đã xác minh" : status === "watch" ? "Cần theo dõi" : status === "not-applicable" ? "Không áp dụng" : "Chưa rà";
}

function statusTone(status: ReviewStatus) {
  return status === "evidence"
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
    : status === "watch"
      ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
      : status === "not-applicable"
        ? "border-slate-400/20 bg-slate-400/10 text-slate-300"
        : "border-white/10 bg-white/[0.03] text-slate-400";
}

export function InvestmentParameterWorkbench({
  symbol,
  industry,
  context,
}: {
  symbol?: string;
  industry?: string;
  context: Context;
}) {
  const [moduleId, setModuleId] = useState<InvestmentModuleId>("M1");
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Record<string, ParameterRecord>>({});
  const [showAll, setShowAll] = useState(false);
  const copy = CONTEXT_COPY[context];
  const normalizedSymbol = symbol?.trim().toUpperCase() || "";
  const boostedModules = useMemo(() => getIndustryModuleBoosts(industry), [industry]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey(normalizedSymbol));
      setRecords(stored ? JSON.parse(stored) : {});
    } catch {
      setRecords({});
    }
  }, [normalizedSymbol]);

  const updateStatus = (parameter: InvestmentParameter, status: ReviewStatus) => {
    setRecords((current) => {
      const next = {
        ...current,
        [parameter.code]: { status, updatedAt: new Date().toISOString() },
      };
      window.localStorage.setItem(storageKey(normalizedSymbol), JSON.stringify(next));
      return next;
    });
  };

  const counts = useMemo(() => {
    const values = Object.values(records);
    const applicable = INVESTMENT_PARAMETER_CATALOG.length - values.filter((record) => record.status === "not-applicable").length;
    return {
      evidence: values.filter((record) => record.status === "evidence").length,
      watch: values.filter((record) => record.status === "watch").length,
      applicable,
      coverage: applicable ? Math.round((values.filter((record) => record.status === "evidence").length / applicable) * 100) : 0,
    };
  }, [records]);

  const visibleParameters = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("vi");
    return INVESTMENT_PARAMETER_CATALOG
      .filter((parameter) => parameter.moduleId === moduleId)
      .filter((parameter) => !search || [parameter.code, parameter.concept, parameter.lens, parameter.moduleTitle].join(" ").toLocaleLowerCase("vi").includes(search))
      .sort((a, b) => getDynamicParameterWeight(b, { industry }) - getDynamicParameterWeight(a, { industry }))
      .slice(0, showAll ? 30 : 8);
  }, [industry, moduleId, query, showAll]);

  return (
    <section className="antigravity-panel overflow-hidden rounded-[26px] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.8),rgba(8,12,20,0.96))]">
      <div className="border-b border-white/8 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">{copy.eyebrow}</p>
            <h2 className="mt-2 text-xl font-black text-white">{copy.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{copy.description}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2"><p className="text-lg font-black text-emerald-200">{counts.evidence}</p><p className="text-[9px] uppercase tracking-wide text-slate-500">Xác minh</p></div>
            <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2"><p className="text-lg font-black text-amber-200">{counts.watch}</p><p className="text-[9px] uppercase tracking-wide text-slate-500">Theo dõi</p></div>
            <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2"><p className="text-lg font-black text-cyan-100">{counts.coverage}%</p><p className="text-[9px] uppercase tracking-wide text-slate-500">Coverage</p></div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">{normalizedSymbol ? `Mã: ${normalizedSymbol}` : "Nhập mã để lưu hồ sơ riêng"}</span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">12 mô-đun · 720 khái niệm · 3.600 tham số</span>
          {boostedModules.length > 0 && <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-cyan-100">Ưu tiên ngành: {boostedModules.join(" · ")}</span>}
        </div>
      </div>

      <div className="p-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {INVESTMENT_MODULES.map((module) => {
            const active = module.id === moduleId;
            const boosted = boostedModules.includes(module.id);
            return (
              <button key={module.id} type="button" onClick={() => { setModuleId(module.id); setShowAll(false); }} className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition ${active ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-50" : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.06]"}`}>
                <span className="font-black">{module.id}</span>{boosted && <span className="ml-1 text-cyan-300">●</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-white">{INVESTMENT_MODULES.find((module) => module.id === moduleId)?.title}</p><p className="mt-1 text-xs text-slate-500">Mỗi khái niệm được đọc theo mức hiện tại, xu hướng, so sánh ngành, độ bền và kịch bản.</p></div>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-slate-400 focus-within:border-cyan-300/40">
            <Search className="h-4 w-4" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(false); }} placeholder="Tìm mã hoặc tham số" className="w-full min-w-[180px] bg-transparent text-xs text-white outline-none placeholder:text-slate-600" />
          </label>
        </div>

        <div className="mt-4 space-y-2">
          {visibleParameters.map((parameter) => {
            const record = records[parameter.code];
            const status = record?.status ?? "unreviewed";
            const isVeto = parameter.role === "veto";
            return (
              <article key={parameter.code} className={`rounded-2xl border p-3 ${isVeto ? "border-rose-300/15 bg-rose-300/[0.045]" : "border-white/8 bg-slate-950/45"}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-bold text-cyan-300">{parameter.code}</span><span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">{parameter.lens}</span>{isVeto && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-200"><ShieldAlert className="h-3 w-3" /> VETO</span>}</div>
                    <p className="mt-1 text-sm font-semibold text-white">{parameter.concept}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Trọng số động: {getDynamicParameterWeight(parameter, { industry })}× · {parameter.role === "validation" ? "kiểm định dữ liệu" : parameter.role === "filter" ? "lọc kích hoạt" : parameter.role === "veto" ? "cổng loại trừ" : "tín hiệu"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`mr-1 rounded-lg border px-2 py-1 text-[10px] ${statusTone(status)}`}>{statusLabel(status)}</span>
                    <button type="button" onClick={() => updateStatus(parameter, "evidence")} className="rounded-lg border border-emerald-300/20 px-2 py-1 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-300/10">Xác minh</button>
                    <button type="button" onClick={() => updateStatus(parameter, "watch")} className="rounded-lg border border-amber-300/20 px-2 py-1 text-[10px] font-semibold text-amber-100 transition hover:bg-amber-300/10">Theo dõi</button>
                    <button type="button" onClick={() => updateStatus(parameter, "not-applicable")} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-400 transition hover:bg-white/[0.06]">Không áp dụng</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-xs text-slate-500"><CircleAlert className="h-4 w-4 text-amber-300" /> Không áp dụng chỉ dùng khi mã không có cơ chế truyền dẫn; không dùng để che dữ liệu thiếu.</p>
          <button type="button" onClick={() => setShowAll((current) => !current)} className="shrink-0 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/[0.13]">{showAll ? "Thu gọn" : "Xem thêm"}</button>
        </div>
      </div>
    </section>
  );
}
