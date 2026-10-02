"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { BookOpenCheck, ChartNoAxesCombined, Sigma } from "lucide-react";
import AutoSizedChart from "@/components/charts/AutoSizedChart";

type Props = { isVi: boolean; onSummary?: (summary: string) => void };
type ModelId = "valuation" | "macro" | "fx";

export function TheoryScenarioLab({ isVi, onSummary }: Props) {
  const [model, setModel] = useState<ModelId>("valuation");
  const [requiredReturn, setRequiredReturn] = useState(10);
  const [growth, setGrowth] = useState(4);
  const [dividend, setDividend] = useState(5);
  const [rateShock, setRateShock] = useState(100);
  const [fxShock, setFxShock] = useState(-8);

  const valuationData = useMemo(() => [8, 9, 10, 11, 12, 13, 14].map((rate) => ({
    rate: `${rate}%`,
    value: rate <= growth ? null : Number((dividend / ((rate - growth) / 100)).toFixed(1)),
  })), [dividend, growth]);
  const macroData = useMemo(() => [
    { sector: "Bank", impact: Number((rateShock * 0.012).toFixed(1)) },
    { sector: "Property", impact: Number((-rateShock * 0.025).toFixed(1)) },
    { sector: "Technology", impact: Number((-rateShock * 0.018).toFixed(1)) },
    { sector: "Consumer", impact: Number((-rateShock * 0.009).toFixed(1)) },
    { sector: "Exporter", impact: Number((rateShock * 0.004).toFixed(1)) },
  ], [rateShock]);
  const fxData = useMemo(() => [-15, -10, -5, 0, 5, 10, 15].map((shock) => ({
    shock: `${shock}%`,
    vndReturn: Number((((1 + 0.08) * (1 + shock / 100) - 1) * 100).toFixed(1)),
  })), []);

  const intrinsicValue = requiredReturn <= growth ? null : dividend / ((requiredReturn - growth) / 100);
  const summary = model === "valuation"
    ? `DDM: D1=${dividend}, required return=${requiredReturn}%, g=${growth}%, giá trị lý thuyết=${intrinsicValue?.toFixed(1) ?? "không hợp lệ vì r≤g"}.`
    : model === "macro"
      ? `Mô phỏng lãi suất ${rateShock >= 0 ? "+" : ""}${rateShock} bps; tác động minh họa phải hiệu chỉnh theo ngành và dữ liệu lịch sử.`
      : `Mô phỏng tài sản tăng 8% bằng ngoại tệ, tỷ giá thay đổi ${fxShock}%, lợi nhuận quy đổi VND xấp xỉ ${(((1.08) * (1 + fxShock / 100) - 1) * 100).toFixed(1)}%.`;
  const modelGuide = model === "valuation"
    ? ["Lấy D1 từ cổ tức 12 tháng tới hoặc FCF chuẩn hóa", "Ước tính r từ lãi suất phi rủi ro + phần bù rủi ro", "Chọn g dài hạn thấp hơn r và phù hợp tăng trưởng kinh tế", "Chạy ít nhất 3 bộ r/g rồi so với giá thị trường"]
    : model === "macro"
      ? ["Chọn cú sốc, đơn vị bps và thời gian tồn tại", "Ghi trạng thái đầu: nợ, CASA, duration, biên lợi nhuận", "Tính Shock × Exposure × Pass-through × Persistence", "Truyền kết quả vào lợi nhuận, WACC và định giá"]
      : ["Khai báo đồng tiền chức năng, doanh thu, chi phí và nợ", "Tính vị thế ròng theo từng đồng tiền và kỳ hạn", "Mô phỏng spot cùng chênh lệch lãi suất", "Quy đổi dòng tiền, lợi nhuận và giá trị về VND"];

  useEffect(() => onSummary?.(summary), [onSummary, summary]);

  return <section className="antigravity-panel rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.025] p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-white"><ChartNoAxesCombined className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-bold uppercase tracking-[0.2em]">{isVi ? "Phòng mô phỏng lý thuyết 9.0" : "Theory simulation lab 9.0"}</h2></div><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">{isVi ? "Chỉ hiển thị một biểu đồ quyết định tại một thời điểm. Mỗi mô hình kèm cơ chế, ví dụ số và giới hạn để tránh dùng biểu đồ như bằng chứng tuyệt đối." : "Only one decision chart is visible at a time. Every model includes mechanism, numerical example and limitations."}</p></div><div className="flex gap-2">{([{ id: "valuation", label: "Định giá" }, { id: "macro", label: "Sốc vĩ mô" }, { id: "fx", label: "Tỷ giá" }] as const).map((item) => <button key={item.id} type="button" onClick={() => setModel(item.id)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${model === item.id ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-slate-950/50 text-slate-400 hover:text-white"}`}>{item.label}</button>)}</div></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="rounded-xl border border-white/8 bg-slate-950/55 p-4"><div className="h-[300px]"><AutoSizedChart>{model === "valuation" ? <LineChart data={valuationData}><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="rate" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} /><Tooltip /><Line type="monotone" dataKey="value" name="Giá trị DDM" stroke="#22d3ee" strokeWidth={2.2} dot={{ r: 3 }} /></LineChart> : model === "macro" ? <BarChart data={macroData}><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="sector" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} /><Tooltip /><Bar dataKey="impact" name="Tác động minh họa (%)" fill="#22d3ee" radius={[4, 4, 0, 0]} /></BarChart> : <LineChart data={fxData}><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="shock" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} /><Tooltip /><Line type="monotone" dataKey="vndReturn" name="Lợi nhuận VND (%)" stroke="#22d3ee" strokeWidth={2.2} dot={{ r: 3 }} /></LineChart>}</AutoSizedChart></div></div>
      <div className="space-y-3"><div className="rounded-xl border border-white/8 bg-slate-950/55 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-white"><Sigma className="h-4 w-4 text-cyan-300" />{model === "valuation" ? "Dividend Discount Model" : model === "macro" ? "Chuỗi truyền dẫn lãi suất" : "Quy đổi lợi nhuận đa tiền tệ"}</div><p className="mt-3 text-xs leading-5 text-slate-400">{model === "valuation" ? "P₀ = D₁/(r-g). Giá trị tăng khi dòng tiền hoặc g tăng, giảm mạnh khi r tăng. Mô hình rất nhạy khi r-g nhỏ." : model === "macro" ? "Sốc lãi suất truyền qua chi phí vốn, cầu tín dụng, tỷ giá, lợi nhuận ngành rồi mới đi vào định giá." : "R(VND) = (1 + R tài sản) × (1 + ΔFX) - 1. Lợi nhuận tài sản và tỷ giá phải được xét đồng thời."}</p></div>
        <div className="rounded-xl border border-white/8 bg-slate-950/55 p-4">{model === "valuation" ? <div className="grid gap-3"><NumberField label="D1" value={dividend} onChange={setDividend} /><NumberField label="Required return (%)" value={requiredReturn} onChange={setRequiredReturn} /><NumberField label="Growth g (%)" value={growth} onChange={setGrowth} /></div> : model === "macro" ? <NumberField label="Lãi suất thay đổi (bps)" value={rateShock} onChange={setRateShock} /> : <NumberField label="Tỷ giá thay đổi (%)" value={fxShock} onChange={setFxShock} />}</div>
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-amber-100"><BookOpenCheck className="h-4 w-4" />{isVi ? "Diễn giải & giới hạn" : "Interpretation & limits"}</div><p className="mt-2 text-xs leading-5 text-slate-400">{summary} {isVi ? "Đây là mô phỏng nhạy cảm, không phải dự báo chắc chắn. Phải đối chiếu dữ liệu gốc và backtest." : "This is sensitivity analysis, not a certain forecast. Validate against source data and backtests."}</p></div>
      </div>
    </div>
    <div className="mt-4 rounded-xl border border-cyan-300/15 bg-slate-950/45 p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-semibold text-white">{isVi ? "Cách thực hiện cụ thể" : "How to run this model"}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{isVi ? "Làm lần lượt bốn bước. Số chưa có nguồn phải ghi là giả định; kết quả chỉ được chuyển sang nhánh khi có đơn vị, ngày dữ liệu và phép tính kiểm tra lại được." : "Follow four steps. Unsourced values remain assumptions; only auditable calculations feed a decision branch."}</p></div><span className="shrink-0 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200">{model === "valuation" ? "Asset branch" : model === "macro" ? "Macro branch" : "Macro + asset"}</span></div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{modelGuide.map((step, index) => <div key={step} className="rounded-lg border border-white/8 bg-slate-950/60 p-3"><p className="font-mono text-[10px] text-cyan-300">BƯỚC {index + 1}</p><p className="mt-1.5 text-[11px] leading-5 text-slate-300">{step}</p></div>)}</div>
      <div className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.04] px-3 py-2.5 text-[11px] leading-5 text-slate-400"><span className="font-semibold text-amber-100">{isVi ? "Đầu ra cần lưu:" : "Save this output:"}</span> {isVi ? "giả định đầu vào, nguồn + ngày, công thức, kết quả base/bull/bear, ngưỡng đảo luận điểm và hành động. Copy các dòng số liệu vào Sổ bằng chứng, còn diễn giải đưa vào Nhận định nhánh." : "inputs, source/date, formula, base/bull/bear outputs, invalidation threshold and action."}</div>
    </div>
  </section>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block text-[11px] text-slate-400">{label}<input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/35" /></label>;
}
