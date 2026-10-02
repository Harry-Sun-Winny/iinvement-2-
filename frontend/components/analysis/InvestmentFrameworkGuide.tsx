"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, BadgeCheck, CircleDollarSign, Scale, ShieldCheck, Waves } from "lucide-react";

const branches = [
  { label: "Vĩ mô", weight: 20, detail: "Lãi suất, lạm phát, chu kỳ, tỷ giá" },
  { label: "Tài sản", weight: 25, detail: "Chất lượng, định giá, thanh khoản" },
  { label: "Hành vi", weight: 15, detail: "FOMO, neo giá, phản biện luận điểm" },
  { label: "Cá nhân", weight: 15, detail: "Vốn nhàn rỗi, mục tiêu, sức chịu lỗ" },
  { label: "Thị trường", weight: 15, detail: "Xu hướng, volume, điểm vào và thoát" },
  { label: "Pháp lý", weight: 10, detail: "Quyền sở hữu, thuế, đối tác, hard-stop" },
];

const scenarios = [
  { id: "rates", code: "M1", title: "Lãi suất tăng nhanh", shock: "+150 bps / 2 quý", note: "Kiểm tra nợ đáo hạn, độ nhạy WACC và khả năng trả lãi trước khi kết luận." },
  { id: "liquidity", code: "M8", title: "Khủng hoảng thanh khoản", shock: "Credit spread +300 bps", note: "Ưu tiên lịch đáo hạn, tiền mặt và khả năng thoát vị thế, không chỉ lợi nhuận kế toán." },
  { id: "fx", code: "FX1", title: "USD mạnh toàn cầu", shock: "DXY +10%, USD/VND +5%", note: "Tách doanh thu, chi phí, nợ và hedge theo từng đồng tiền trước khi cộng tác động." },
];

export function InvestmentFrameworkGuide({ compact = false }: { compact?: boolean }) {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  return <section className="antigravity-panel overflow-hidden rounded-2xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(15,23,42,0.32))]">
    <div className="flex flex-col gap-4 border-b border-white/8 p-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2 text-cyan-100"><ShieldCheck className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-bold">Khung quyết định 2.199 yếu tố</h2></div><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">Mỗi kết luận phải đi từ bằng chứng, kịch bản và ngưỡng đảo luận điểm đến hành động. Điểm số là công cụ sắp xếp ưu tiên, không thay thế thẩm định pháp lý hoặc khuyến nghị đầu tư.</p></div><div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2 text-xs text-amber-100"><AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />Hard-stop không được bù trừ bằng điểm cao ở nhánh khác.</div></div>
    <div className={`grid gap-3 p-5 ${compact ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3"}`}>{branches.map((branch) => <article key={branch.label} className="rounded-xl border border-white/8 bg-slate-950/45 p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-white">{branch.label}</p><span className="font-mono text-xs text-cyan-300">{branch.weight}%</span></div><p className="mt-2 text-[11px] leading-5 text-slate-400">{branch.detail}</p></article>)}</div>
    {!compact && <div className="grid border-t border-white/8 lg:grid-cols-[1.1fr_0.9fr]"><div className="p-5"><div className="flex items-center gap-2 text-white"><Waves className="h-4 w-4 text-cyan-300" /><h3 className="text-sm font-semibold">Kịch bản truyền dẫn bắt buộc</h3></div><div className="mt-4 flex flex-wrap gap-2">{scenarios.map((item) => <button key={item.id} type="button" onClick={() => setScenarioId(item.id)} className={`rounded-lg border px-3 py-2 text-left text-xs transition active:translate-y-px ${scenario.id === item.id ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"}`}><span className="font-mono text-[10px] text-cyan-300">{item.code}</span><span className="ml-2 font-semibold">{item.title}</span></button>)}</div><div className="mt-4 rounded-xl border border-white/8 bg-slate-950/55 p-4"><p className="font-mono text-xs text-cyan-300">{scenario.shock}</p><p className="mt-2 text-xs leading-5 text-slate-300">{scenario.note}</p></div></div><div className="border-t border-white/8 bg-slate-950/25 p-5 lg:border-l lg:border-t-0"><div className="flex items-center gap-2 text-white"><CircleDollarSign className="h-4 w-4 text-cyan-300" /><h3 className="text-sm font-semibold">Bản đồ phơi nhiễm đa tiền tệ</h3></div><p className="mt-3 text-xs leading-5 text-slate-400">Vị thế ròng theo tiền tệ = phải thu + tiền mặt + dòng vào dự kiến − phải trả − nợ − dòng ra dự kiến.</p><div className="mt-4 flex items-center gap-2 text-xs text-slate-300"><Scale className="h-4 w-4 text-cyan-300" /><span>Đánh giá riêng 0–3 tháng, 3–12 tháng và trên 12 tháng.</span></div><div className="mt-4 flex items-center gap-2 text-xs font-semibold text-cyan-100"><BadgeCheck className="h-4 w-4" />Spot + lãi suất + chi phí hedge + khả năng rollover</div></div></div>}
    <div className="flex items-center gap-2 border-t border-white/8 bg-white/[0.015] px-5 py-3 text-[11px] text-slate-500"><ArrowRight className="h-3.5 w-3.5 text-cyan-300" />Luồng chuẩn: trạng thái đầu → cú sốc → truyền dẫn → kết quả tài chính → định giá → ngưỡng đảo luận điểm → hành động.</div>
  </section>;
}
