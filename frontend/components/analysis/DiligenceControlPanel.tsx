"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, DatabaseZap, ShieldCheck, SlidersHorizontal } from "lucide-react";

type Props = {
  isVi: boolean;
  connectedFactors?: number;
  totalFactors?: number;
  readiness?: { assetIdentified?: boolean; valuation?: boolean; thesis?: boolean; bearCase?: boolean; invalidation?: boolean; sizing?: boolean; sourceLedger?: boolean };
};

const branchLibrary = [
  { label: "Vĩ mô", weight: 20, scope: "chế độ tiền tệ, lạm phát, tăng trưởng" },
  { label: "Tài sản", weight: 25, scope: "chất lượng, định giá, dòng tiền, thanh khoản" },
  { label: "Hành vi", weight: 15, scope: "FOMO, thiên kiến, kỷ luật" },
  { label: "Cá nhân", weight: 15, scope: "mục tiêu, đòn bẩy, sức chịu rủi ro" },
  { label: "Thị trường", weight: 15, scope: "xu hướng, volume, thời điểm" },
  { label: "Pháp lý & rủi ro", weight: 10, scope: "quyền sở hữu, thuế, tail risk" },
];

export function DiligenceControlPanel({ isVi, connectedFactors = 0, totalFactors = 48, readiness = {} }: Props) {
  const [open, setOpen] = useState(false);
  const checks = useMemo(() => [
    { label: isVi ? "Đã định danh tài sản, thị trường và kỳ hạn" : "Asset, market and horizon identified", done: readiness.assetIdentified },
    { label: isVi ? "Có cơ sở định giá hoặc giá trị nội tại" : "Valuation or intrinsic-value basis exists", done: readiness.valuation },
    { label: isVi ? "Luận điểm đầu tư được viết thành văn bản" : "Investment thesis is written", done: readiness.thesis },
    { label: isVi ? "Có bear case và điều kiện vô hiệu luận điểm" : "Bear case and thesis invalidation are defined", done: readiness.bearCase && readiness.invalidation },
    { label: isVi ? "Có giới hạn tỷ trọng và quy tắc giải ngân" : "Position limit and deployment rule are defined", done: readiness.sizing },
    { label: isVi ? "Nguồn, ngày quan sát và chất lượng dữ liệu được ghi nhận" : "Source, as-of date and data quality are recorded", done: readiness.sourceLedger },
  ], [isVi, readiness]);
  const checked = checks.filter((item) => item.done).length;
  const coverage = totalFactors ? Math.round((connectedFactors / totalFactors) * 100) : 0;

  return <section className="antigravity-panel rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-2 text-cyan-100"><DatabaseZap className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-bold uppercase tracking-[0.2em]">{isVi ? "Kiểm soát hồ sơ phân tích" : "Diligence control ledger"}</h2></div><p className="mt-3 text-sm leading-6 text-slate-300">{isVi ? "Tài liệu 4.0 coi 1.029 yếu tố là thư viện biến, không phải danh sách cộng điểm cơ học. Mỗi quyết định chỉ chọn 20-60 biến liên quan, ghi nguồn, ngày quan sát, độ trễ và tránh đếm trùng." : "The 4.0 framework treats 1,029 factors as a variable library, not a mechanical scorecard. Each decision selects 20-60 relevant variables, records source and as-of date, and avoids double counting."}</p></div><div className="flex min-w-[150px] items-end justify-between rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 lg:block"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{isVi ? "Độ phủ lõi" : "Core coverage"}</p><p className="mt-1 text-2xl font-black text-white">{coverage}%</p><p className="text-xs text-slate-500">{connectedFactors}/{totalFactors} {isVi ? "yếu tố có dữ liệu" : "factors connected"}</p></div></div>
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{branchLibrary.map((branch) => <div key={branch.label} className="rounded-xl border border-white/5 bg-slate-950/55 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-white">{branch.label}</p><span className="font-mono text-sm text-cyan-200">{branch.weight}%</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{branch.scope}</p></div>)}</div>
    <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1.35fr]"><div className="rounded-xl border border-white/5 bg-slate-950/55 p-4"><div className="flex items-center gap-2 text-white"><SlidersHorizontal className="h-4 w-4 text-amber-300" /><p className="text-sm font-semibold">{isVi ? "Chuỗi chấm điểm có thể kiểm định" : "Auditable scoring pipeline"}</p></div><p className="mt-3 text-xs leading-5 text-slate-400">{isVi ? "Điểm thô -2 đến +2 → chuẩn hóa percentile/z-score có winsorize → nhân trọng số ngành, chế độ thị trường, chất lượng dữ liệu và mức liên quan → kiểm định ngoài mẫu." : "Raw score -2 to +2 → percentile/z-score normalization with winsorization → industry, regime, data-quality and relevance weights → out-of-sample validation."}</p></div><div className="rounded-xl border border-white/5 bg-slate-950/55 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-white"><ShieldCheck className="h-4 w-4 text-emerald-300" /><p className="text-sm font-semibold">{isVi ? "Điều kiện khóa quyết định" : "Decision-lock conditions"}</p></div><span className="text-xs text-slate-500">{checked}/{checks.length}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{checks.map((item) => <div key={item.label} className="flex gap-2 text-xs leading-5 text-slate-400">{item.done ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />}{item.label}</div>)}</div></div></div>
    <button type="button" onClick={() => setOpen((value) => !value)} className="mt-4 text-xs font-semibold text-cyan-200 hover:text-white">{open ? (isVi ? "Ẩn nguyên tắc vận hành" : "Hide operating rules") : (isVi ? "Xem nguyên tắc vận hành thư viện 1.029 biến" : "View 1,029-variable library rules")}</button>
    {open && <div className="mt-3 grid gap-3 rounded-xl border border-white/5 bg-slate-950/55 p-4 text-xs leading-5 text-slate-400 md:grid-cols-3"><p>{isVi ? "Không dùng số liệu cũ như trạng thái hiện hành. Mọi biến động cần có ngày quan sát, tần suất và độ trễ công bố." : "Never treat stale observations as current. Record as-of date, frequency and release lag."}</p><p>{isVi ? "Gom các biến cùng nguyên nhân vào cụm để tránh double counting, ví dụ tín dụng, credit-to-GDP gap và debt-service ratio." : "Cluster causally related variables to avoid double counting, for example credit growth, credit-to-GDP gap and debt-service ratio."}</p><p>{isVi ? "Trọng số nội ngành thay đổi theo regime; cờ đỏ pháp lý hoặc rủi ro mất vốn phải chặn quyết định thay vì bị điểm tốt bù trừ." : "Within-industry weights change by regime; legal or permanent-loss red flags must veto a decision rather than be offset by a high score."}</p></div>}
  </section>;
}
