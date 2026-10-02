"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, CheckCircle2, ShieldAlert } from "lucide-react";

type Props = { isVi: boolean; onSummary?: (summary: string) => void };

const modules = [
  ["FOMO & áp lực xã hội", "FOMO tự đánh giá trước giao dịch", "Nếu cao: trì hoãn lệnh hoặc yêu cầu phản biện độc lập."],
  ["Ác cảm mất mát", "Giữ lỗ, chốt lời sớm và sunk cost", "Viết điều kiện vô hiệu trước khi đặt lệnh."],
  ["Tự tin thái quá", "Độ chính xác dự báo và tăng size sau chuỗi thắng", "Giảm quy mô khi vượt ngân sách rủi ro."],
  ["Chú ý hữu hạn", "Nhiễu tin tức, quá tải chỉ báo và quyết định mệt mỏi", "Giới hạn số quyết định và ưu tiên dữ liệu sơ cấp."],
  ["Neo giá", "Neo vào giá vốn, đỉnh cũ và mốc tham chiếu", "Định giá lại khi ẩn giá vốn/đỉnh lịch sử."],
  ["Thiên kiến nguồn tin", "Confirmation, authority, narrative và social proof", "Bắt buộc có nguồn phản biện độc lập."],
  ["Ký ức gần", "Recency, availability, gambler’s và hot-hand fallacy", "Đối chiếu base rate, không chỉ nhìn phiên gần nhất."],
  ["Sở hữu & hiện trạng", "Endowment, status quo, home và familiarity bias", "Đánh giá như một quyết định mua mới hôm nay."],
  ["Kỷ luật rủi ro", "Tuân thủ giới hạn tỷ trọng, margin và kế hoạch sau thua lỗ", "Hard-stop khi vượt hạn mức đã viết trước."],
  ["Vệ sinh quyết định", "Pre-mortem, nhật ký dự báo, chất lượng phản biện", "Chỉ giải ngân khi hồ sơ có thể kiểm toán lại."],
] as const;

export function PsychologyWorkbench({ isVi, onSummary }: Props) {
  const [scores, setScores] = useState<number[]>(Array(10).fill(0));
  const [sleep, setSleep] = useState("7");
  const [energy, setEnergy] = useState("4");
  const [confidence, setConfidence] = useState("60");
  const [positionChange, setPositionChange] = useState("0");
  const [evidenceQuality, setEvidenceQuality] = useState("0.75");
  const [contextFactor, setContextFactor] = useState("1");
  const [industryFactor, setIndustryFactor] = useState("1");

  const result = useMemo(() => {
    const average = scores.reduce((total, score) => total + score, 0) / scores.length;
    const gates: string[] = [];
    if (Number(sleep) < 6 || Number(energy) <= 2) gates.push("Trạng thái thể chất không đạt: hoãn mở vị thế mới.");
    if (Number(confidence) > 85 && scores[2] >= 3) gates.push("Tự tin cao đi kèm tín hiệu quá tự tin: cần phản biện độc lập.");
    if (Math.abs(Number(positionChange)) > 25 && (scores[0] >= 3 || scores[2] >= 3)) gates.push("Thay đổi tỷ trọng lớn trong trạng thái thiên kiến cao: không giải ngân ngay.");
    if (scores[8] >= 3) gates.push("Kỷ luật ngân sách rủi ro có cờ đỏ: áp dụng hard-stop.");
    const rawRisk = (average / 4) * 100;
    const adjustedRisk = Math.min(100, rawRisk * Number(evidenceQuality) * Number(contextFactor) * Number(industryFactor));
    return { risk: Math.round(adjustedRisk), rawRisk: Math.round(rawRisk), gates };
  }, [confidence, contextFactor, energy, evidenceQuality, industryFactor, positionChange, scores, sleep]);

  useEffect(() => {
    onSummary?.(`PsyScore điều chỉnh ${result.risk}/100 (điểm thô ${result.rawRisk}). E=${evidenceQuality}, C=${contextFactor}, I=${industryFactor}. Ngủ ${sleep} giờ, năng lượng ${energy}/5, tự tin ${confidence}%, thay đổi tỷ trọng ${positionChange}%. ${result.gates.length ? `Cổng tâm lý: ${result.gates.join(" ")}` : "Chưa kích hoạt cổng tâm lý tự động."}`);
  }, [confidence, contextFactor, energy, evidenceQuality, industryFactor, onSummary, positionChange, result.gates, result.rawRisk, result.risk, sleep]);

  return <section className="antigravity-panel rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.035] p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-fuchsia-100"><BrainCircuit className="h-4 w-4 text-fuchsia-300" /><h2 className="text-sm font-bold uppercase tracking-[0.2em]">PsyScore 5.0 · {isVi ? "Tâm lý trước quyết định" : "Pre-decision psychology"}</h2></div><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">{isVi ? "500 yếu tố được tổ chức thành 10 mô-đun, mỗi mô-đun 20 yếu tố. Chỉ chấm theo dấu vết hành vi, checklist trước lệnh và nhật ký, không chấm theo cảm giác sau khi thị trường đã chạy." : "500 factors are organized into 10 modules of 20. Score observable behavior, pre-trade checklists and decision journals, not hindsight."}</p></div><div className={`rounded-xl border px-4 py-3 ${result.risk >= 60 ? "border-rose-400/25 bg-rose-400/10 text-rose-100" : result.risk >= 35 ? "border-amber-400/25 bg-amber-400/10 text-amber-100" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"}`}><p className="text-[10px] font-bold uppercase tracking-[0.16em]">{isVi ? "Rủi ro thiên kiến" : "Bias risk"}</p><p className="mt-1 text-2xl font-black">{result.risk}/100</p></div></div>
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{modules.map(([name, signal, action], index) => <label key={name} className="rounded-xl border border-white/7 bg-slate-950/55 p-3"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-white">{name}</p><span className="font-mono text-xs text-fuchsia-200">20</span></div><p className="mt-2 text-[11px] leading-4 text-slate-500">{signal}</p><select value={scores[index]} onChange={(event) => setScores((current) => current.map((score, itemIndex) => itemIndex === index ? Number(event.target.value) : score))} className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white"><option value="0">0 - Không thấy</option><option value="1">1 - Nhẹ</option><option value="2">2 - Cần theo dõi</option><option value="3">3 - Cao</option><option value="4">4 - Cờ đỏ</option></select><p className="mt-2 text-[10px] leading-4 text-slate-500">{action}</p></label>)}</div>
    <div className="mt-5 grid gap-3 lg:grid-cols-4"><label className="text-xs text-slate-400">{isVi ? "Ngủ đêm trước lệnh" : "Sleep before trade"}<input value={sleep} onChange={(event) => setSleep(event.target.value)} type="number" min="0" max="16" className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" /></label><label className="text-xs text-slate-400">{isVi ? "Năng lượng 1-5" : "Energy 1-5"}<input value={energy} onChange={(event) => setEnergy(event.target.value)} type="number" min="1" max="5" className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" /></label><label className="text-xs text-slate-400">{isVi ? "Tự tin vào luận điểm (%)" : "Thesis confidence (%)"}<input value={confidence} onChange={(event) => setConfidence(event.target.value)} type="number" min="0" max="100" className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" /></label><label className="text-xs text-slate-400">{isVi ? "Thay đổi tỷ trọng dự kiến (%)" : "Planned position change (%)"}<input value={positionChange} onChange={(event) => setPositionChange(event.target.value)} type="number" min="-100" max="100" className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" /></label></div>
    <div className="mt-4 rounded-xl border border-fuchsia-300/15 bg-slate-950/45 p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-semibold text-white">{isVi ? "Hiệu chỉnh theo chuẩn tài liệu 9.0" : "Evidence-adjusted PsyScore"}</p><p className="mt-1 max-w-3xl text-[11px] leading-5 text-slate-500">{isVi ? "Công thức: điểm thô × chất lượng bằng chứng E × bối cảnh C × độ nhạy ngành I. Ưu tiên dữ liệu lệnh/nhật ký (45%), tình huống chuẩn hóa (30%), rồi mới đến tự báo cáo (25%). Cờ đỏ vẫn có quyền phủ quyết điểm trung bình." : "Formula: raw score × evidence E × context C × industry sensitivity I. Behavioral records outrank self-report, and red flags veto the average."}</p></div><p className="shrink-0 font-mono text-xs text-fuchsia-200">{result.rawRisk} × {evidenceQuality} × {contextFactor} × {industryFactor} = {result.risk}</p></div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <SelectFactor label={isVi ? "E · Chất lượng bằng chứng" : "Evidence quality"} value={evidenceQuality} onChange={setEvidenceQuality} options={[["0.50", "Tự báo cáo"], ["0.75", "Nhật ký + tự báo cáo"], ["1.00", "Dữ liệu hành vi đa kỳ"]]} />
        <SelectFactor label={isVi ? "C · Hệ số bối cảnh" : "Context factor"} value={contextFactor} onChange={setContextFactor} options={[["0.75", "Bình tĩnh / ít áp lực"], ["1", "Bình thường"], ["1.25", "Biến động / áp lực"], ["1.50", "Stress / đòn bẩy cao"]]} />
        <SelectFactor label={isVi ? "I · Độ nhạy tài sản" : "Asset sensitivity"} value={industryFactor} onChange={setIndustryFactor} options={[["0.75", "Thấp"], ["1", "Cơ sở"], ["1.35", "BĐS / công nghệ"], ["1.75", "Crypto / IPO / small-cap"]]} />
      </div>
    </div>
    <div className="mt-5 rounded-xl border border-white/8 bg-slate-950/60 p-4">{result.gates.length ? <div className="space-y-2 text-xs leading-5 text-rose-100"><div className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4 text-rose-300" />{isVi ? "Cổng tâm lý đang chặn quyết định" : "Psychology gates are blocking the decision"}</div>{result.gates.map((gate) => <p key={gate}>{gate}</p>)}</div> : <div className="flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" />{isVi ? "Chưa có cổng tâm lý tự động bị kích hoạt. Vẫn cần đối chiếu bằng chứng và bear case." : "No automatic psychology gate is active. Evidence and bear case still require review."}</div>}</div>
  </section>;
}

function SelectFactor({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="text-[11px] text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionValue} · {optionLabel}</option>)}</select></label>;
}
