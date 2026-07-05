"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Calculator,
  CandlestickChart,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  GitMerge,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from "lucide-react";


type Trend = "up" | "down" | "side" | null;
type FinalVal = "yes" | "no" | null;
type DrawdownLevel = 0 | 1 | 2 | 3 | null;

const CONFLUENCE_ITEMS = [
  "Xu hướng đúng chiều",
  "Hỗ trợ / Kháng cự",
  "Supply / Demand / Order Block",
  "FVG (Fair Value Gap)",
  "Fibonacci OTE 0.5–0.786",
  "EMA 20 / 50 / 200",
];

const ENTRY_SIGNALS = [
  { id: "pin", label: "Pin Bar", sub: "Bấc dài, thân nhỏ ở vùng hỗ trợ/kháng cự" },
  { id: "eng", label: "Engulfing", sub: "Nến nuốt — xác nhận đảo chiều mạnh" },
  { id: "star", label: "Morning Star / Evening Star", sub: "Mẫu hình 3 nến đảo chiều" },
  { id: "liq", label: "Liquidity Sweep", sub: "Quét đỉnh/đáy trước khi đảo chiều" },
  { id: "vol", label: "Volume tăng mạnh", sub: "Khối lượng xác nhận lực đẩy" },
];

const FINAL_QUESTIONS = [
  "Xu hướng đúng chiều?",
  "Có ≥ 3 hợp lưu?",
  "Có tín hiệu xác nhận (≥ 2)?",
  "R:R ≥ 1:2?",
  "Không có tin tức lớn sắp ra?",
];

const DRAWDOWN_LEVELS = [
  { pct: "< 3%", rule: "Giao dịch bình thường", color: "emerald" },
  { pct: "3% DD", rule: "Giảm 50% khối lượng", color: "yellow" },
  { pct: "5% DD", rule: "Chỉ đánh setup A+", color: "orange" },
  { pct: "10% DD", rule: "Dừng — đánh giá lại hệ thống", color: "red" },
];

const MINDSET_RULES = [
  "Không cố giao dịch mỗi ngày",
  "Không FOMO",
  "Không gồng lỗ",
  "Không dời Stop Loss xa hơn",
  "Không tăng khối lượng để gỡ lỗ",
  "Bảo vệ vốn trước, kiếm tiền sau",
];

const fmt2 = (n: number) => n.toFixed(2);

function calcPosition(acc: number, riskPct: number, entry: number, sl: number, tp: number) {
  const riskDollar = acc * (riskPct / 100);
  const slDist = Math.abs(entry - sl);
  const tpDist = Math.abs(tp - entry);
  if (slDist <= 0) return null;
  const posSize = riskDollar / slDist;
  const rr = tpDist / slDist;
  const profitTarget = posSize * tpDist;
  return { riskDollar, posSize, rr, profitTarget };
}

function SectionCard({ icon, title, badge, children }: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader className="flex-row items-center gap-2 pb-3">
        {icon}
        <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
        {badge && <div className="ml-auto">{badge}</div>}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export default function ChecklistPage() {
  const [acc, setAcc] = useState("10000");
  const [riskPct, setRiskPct] = useState("0.5");
  const [entry, setEntry] = useState("100");
  const [sl, setSl] = useState("97");
  const [tp, setTp] = useState("106");

  const [trend, setTrend] = useState<Trend>(null);
  const [confluence, setConfluence] = useState<Set<number>>(new Set());
  const [entrySignals, setEntrySignals] = useState<Set<string>>(new Set());
  const [finalAnswers, setFinalAnswers] = useState<FinalVal[]>([null, null, null, null, null]);
  const [ddLevel, setDdLevel] = useState<DrawdownLevel>(null);
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);

  const result = calcPosition(
    parseFloat(acc) || 0,
    parseFloat(riskPct) || 0,
    parseFloat(entry) || 0,
    parseFloat(sl) || 0,
    parseFloat(tp) || 0,
  );

  const toggleConf = useCallback((idx: number) => {
    setConfluence(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }, []);

  const toggleEntry = useCallback((id: string) => {
    setEntrySignals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const setFinal = useCallback((idx: number, val: FinalVal) => {
    setFinalAnswers(prev => {
      const next = [...prev] as FinalVal[];
      next[idx] = val;
      return next;
    });
  }, []);

  const answeredCount = finalAnswers.filter(v => v !== null).length;
  const passCount = finalAnswers.filter(v => v === "yes").length;
  const noCount = finalAnswers.filter(v => v === "no").length;
  const allAnswered = answeredCount === 5;

  const isAplus = (trend === "up" || trend === "down")
    && confluence.size >= 3
    && entrySignals.size >= 2
    && entrySignals.has("liq")
    && passCount === 5
    && result !== null && result.rr >= 2
    && (parseFloat(riskPct) || 0) <= 0.5;

  const rrColor = !result
    ? "text-slate-500"
    : result.rr >= 2
      ? "text-emerald-400"
      : result.rr >= 1.5
        ? "text-yellow-400"
        : "text-red-400";

  const riskColor = (parseFloat(riskPct) || 0) <= 0.5
    ? "text-emerald-400"
    : (parseFloat(riskPct) || 0) <= 1
      ? "text-yellow-400"
      : "text-red-400";

  const canTrade = (trend === "up" || trend === "down")
    && confluence.size >= 3
    && entrySignals.size >= 2
    && noCount === 0
    && allAnswered
    && result !== null && result.rr >= 2
    && consecutiveLosses < 3;

  return (
    <>
      <div className="flex flex-1 h-full overflow-hidden">
      <main className="w-[800px] shrink-0 border-r border-white/5 h-full overflow-y-auto p-6 space-y-6">
          <header className="mb-7">
            <p className="text-sm font-medium text-[#54a0ff]">Giao dịch chuẩn quỹ</p>
            <h2 className="rainbow-text mt-2 text-3xl font-black">Trading Checklist</h2>
            <p className="mt-1 text-sm text-slate-400">
              Kiểm tra 7 bước trước mỗi lệnh — theo tiêu chuẩn quỹ chuyên nghiệp
            </p>
          </header>

          {/* A+ Setup Formula */}
          <Card className="mb-6 border-yellow-500/20 bg-yellow-500/[0.03]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-300">A+</span>
                <div>
                  <p className="text-sm font-bold text-white">Công thức "A+ Setup"</p>
                  <pre className="mt-2 text-xs leading-relaxed text-slate-300">
                    Xu hướng HTF đúng chiều{"\n"}
                    + ≥ 3 hợp lưu{"\n"}
                    + Liquidity Sweep{"\n"}
                    + Nến xác nhận{"\n"}
                    + Volume tăng{"\n"}
                    + R:R ≥ 1:2 (tốt nhất 1:3){"\n"}
                    + Risk 0.25–0.5%{"\n"}
                    ———————————————{"\n"}
                    = Được phép vào lệnh
                  </pre>
                  {isAplus && (
                    <div className="mt-2 rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                      ✓ Setup hiện tại đạt chuẩn A+
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {/* 1. Position size calculator */}
            <SectionCard
              icon={<Calculator className="h-4 w-4 text-blue-400" />}
              title="Quản lý rủi ro"
              badge={<Badge className="bg-red-500/15 text-red-300 text-xs">Quan trọng nhất</Badge>}
            >
              <p className="mb-3 text-xs text-slate-500">
                Rủi ro 0.25–0.5% tài khoản (tối đa 1%) &bull; Công thức: Khối lượng = (TK × Risk%) / (Entry − SL)
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: "Account size ($)", val: acc, set: setAcc, prefix: "$" },
                  { label: "Risk %", val: riskPct, set: setRiskPct, suffix: "%" },
                  { label: "Entry price ($)", val: entry, set: setEntry, prefix: "$" },
                  { label: "Stop loss ($)", val: sl, set: setSl, prefix: "$" },
                  { label: "Take profit ($)", val: tp, set: setTp, prefix: "$" },
                ].map(({ label, val, set, prefix, suffix }) => (
                  <div key={label}>
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">{label}</p>
                    <div className="flex items-center gap-1">
                      {prefix && <span className="text-xs text-slate-500">{prefix}</span>}
                      <Input
                        type="number"
                        value={val}
                        onChange={e => set(e.target.value)}
                        className="h-8 border-white/10 bg-slate-950/60 text-sm text-white"
                      />
                      {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {result && result.rr < 2 && (
                <div className="mt-3 rounded border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-300">
                  R:R = 1:{fmt2(result.rr)} — chưa đạt ngưỡng tối thiểu 1:2
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-slate-950/60 p-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Position size</p>
                  <p className="mt-1 text-base font-medium text-white">
                    {result ? `${fmt2(result.posSize)} units` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">R:R ratio</p>
                  <p className={`mt-1 text-base font-medium ${rrColor}`}>
                    {result ? `1 : ${fmt2(result.rr)}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Profit target</p>
                  <p className="mt-1 text-base font-medium text-emerald-400">
                    {result ? `$${fmt2(result.profitTarget)}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Risk per trade</p>
                  <p className={`mt-1 text-base font-medium ${riskColor}`}>
                    {result ? `$${fmt2(result.riskDollar)} (${riskPct}%)` : "—"}
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* 2. Trend */}
            <SectionCard
              icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
              title="Xu hướng (H4 / D1)"
              badge={
                trend === "up" ? <Badge className="bg-emerald-500/15 text-emerald-300 text-xs">Uptrend - chỉ Buy</Badge>
                  : trend === "down" ? <Badge className="bg-red-500/15 text-red-300 text-xs">Downtrend - chỉ Sell</Badge>
                  : trend === "side" ? <Badge className="bg-yellow-500/15 text-yellow-300 text-xs">Sideway - không vào</Badge>
                  : <Badge variant="outline" className="border-white/10 text-slate-500 text-xs">Chưa chọn</Badge>
              }
            >
              <p className="mb-3 text-xs text-slate-500">
                Xác định xu hướng khung H4 hoặc D1 trước khi tìm điểm vào
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["up", "down", "side"] as Trend[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTrend(t)}
                    className={`rounded-lg border py-2.5 text-center text-sm transition-all ${
                      trend === t
                        ? t === "up" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : t === "down" ? "border-red-500/50 bg-red-500/10 text-red-300"
                        : "border-yellow-500/50 bg-yellow-500/10 text-yellow-300"
                        : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="block font-medium">
                      {t === "up" ? "↑ Uptrend" : t === "down" ? "↓ Downtrend" : "→ Sideway"}
                    </span>
                    <span className="mt-0.5 block text-xs opacity-70">
                      {t === "up" ? "HH + HL" : t === "down" ? "LH + LL" : "Giảm khối lượng"}
                    </span>
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* 3. Confluence */}
            <SectionCard
              icon={<GitMerge className="h-4 w-4 text-yellow-400" />}
              title="Điểm hợp lưu"
              badge={
                <Badge className={`text-xs ${confluence.size >= 3 ? "bg-emerald-500/15 text-emerald-300" : "bg-yellow-500/15 text-yellow-300"}`}>
                  {confluence.size} / {CONFLUENCE_ITEMS.length} {confluence.size >= 3 ? "✓" : "- cần ≥ 3"}
                </Badge>
              }
            >
              <p className="mb-3 text-xs text-slate-500">
                Chọn ít nhất 3 yếu tố hợp lưu — nếu chỉ 1-2 thì bỏ qua lệnh
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CONFLUENCE_ITEMS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleConf(idx)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                      confluence.has(idx)
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]"
                    }`}
                  >
                    {confluence.has(idx) && <span className="mr-1">✓</span>}
                    {item}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(confluence.size / CONFLUENCE_ITEMS.length) * 100}%` }}
                  />
                </div>
                <span className="whitespace-normal min-w-[120px] break-words text-xs text-slate-500">
                  {confluence.size >= 3 ? "Đủ điều kiện" : `Còn thiếu ${3 - confluence.size}`}
                </span>
              </div>
            </SectionCard>

            {/* 4. Entry confirmation */}
            <SectionCard
              icon={<CandlestickChart className="h-4 w-4 text-yellow-400" />}
              title="Xác nhận điểm vào"
              badge={
                <Badge className={`text-xs ${entrySignals.size >= 2 ? "bg-emerald-500/15 text-emerald-300" : "bg-yellow-500/15 text-yellow-300"}`}>
                  {entrySignals.size} tín hiệu {entrySignals.size >= 2 ? "✓" : "- cần ≥ 2"}
                </Badge>
              }
            >
              <p className="mb-3 text-xs text-slate-500">
                Không đặt Limit mù quáng — chờ tín hiệu xác nhận (tốt nhất có ≥ 2)
              </p>
              <div className="divide-y divide-white/5">
                {ENTRY_SIGNALS.map(({ id, label, sub }) => (
                  <label
                    key={id}
                    className="flex cursor-pointer items-start gap-3 py-2.5 transition-colors hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={entrySignals.has(id)}
                      onChange={() => toggleEntry(id)}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <p className="text-sm text-white">{label}</p>
                      <p className="text-xs text-slate-500">{sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </SectionCard>

            {/* 5. Final filter */}
            <SectionCard
              icon={<ClipboardCheck className="h-4 w-4 text-red-400" />}
              title="Bộ lọc cuối — trước khi bấm Buy/Sell"
              badge={
                <Badge className={`text-xs ${passCount === 5 ? "bg-emerald-500/15 text-emerald-300" : noCount > 0 ? "bg-red-500/15 text-red-300" : "bg-slate-500/15 text-slate-400"}`}>
                  {passCount} / 5
                </Badge>
              }
            >
              <p className="mb-3 text-xs text-slate-500">
                Chỉ cần 1 câu trả lời là "Không" → bỏ lệnh
              </p>
              <div className="divide-y divide-white/5">
                {FINAL_QUESTIONS.map((q, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm text-slate-300">{q}</span>
                    <div className="shrink-0 flex gap-1.5">
                      <button
                        onClick={() => setFinal(idx, "yes")}
                        className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                          finalAnswers[idx] === "yes"
                            ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                            : "border border-white/10 text-slate-500 hover:border-white/20"
                        }`}
                      >
                        Có
                      </button>
                      <button
                        onClick={() => setFinal(idx, "no")}
                        className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                          finalAnswers[idx] === "no"
                            ? "border border-red-500/40 bg-red-500/20 text-red-300"
                            : "border border-white/10 text-slate-500 hover:border-white/20"
                        }`}
                      >
                        Không
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`mt-3 flex items-center gap-3 rounded-lg p-3 ${
                !allAnswered ? "bg-slate-900/60"
                  : noCount === 0 ? "border border-emerald-500/20 bg-emerald-500/10"
                  : "border border-red-500/20 bg-red-500/10"
              }`}>
                {!allAnswered
                  ? <Circle className="h-5 w-5 shrink-0 text-slate-500" />
                  : noCount === 0
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    : <XCircle className="h-5 w-5 shrink-0 text-red-400" />
                }
                <div>
                  <p className={`text-sm font-medium ${
                    !allAnswered ? "text-slate-400"
                      : noCount === 0 ? "text-emerald-300"
                      : "text-red-300"
                  }`}>
                    {!allAnswered ? "Chưa đánh giá"
                      : noCount === 0 ? "A+ Setup — Được phép vào lệnh"
                      : `Bỏ lệnh - ${noCount} điều kiện chưa đạt`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {!allAnswered ? "Trả lời đủ 5 câu để nhận kết quả"
                      : noCount === 0 ? "Tất cả điều kiện đạt. Kiểm tra position size trước khi bấm."
                      : "Trader chuyên nghiệp không vào lệnh khi thiếu bất kỳ điều kiện nào."}
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* 6. Consecutive losses + Drawdown */}
            <SectionCard
              icon={<ShieldAlert className="h-4 w-4 text-red-400" />}
              title="Quản lý thua lỗ"
              badge={
                consecutiveLosses >= 3
                  ? <Badge className="bg-red-500/15 text-red-300 text-xs">Dừng giao dịch hôm nay</Badge>
                  : <Badge className="bg-yellow-500/15 text-yellow-300 text-xs">{consecutiveLosses}/3 lệnh thua</Badge>
              }
            >
              <div className="mb-4">
                <p className="mb-2 text-xs text-slate-500">Số lệnh thua liên tiếp</p>
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3].map(n => (
                    <button
                      key={n}
                      onClick={() => setConsecutiveLosses(n)}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                        consecutiveLosses === n
                          ? "border-red-500/40 bg-red-500/10 text-red-300"
                          : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="ml-2 text-xs text-slate-500">
                    {consecutiveLosses >= 3
                      ? "⚠ Nghỉ trong ngày"
                      : `Còn ${3 - consecutiveLosses} lệnh thua trước khi phải dừng`}
                  </span>
                </div>
              </div>

              <p className="mb-2 text-xs text-slate-500">Mức drawdown hiện tại</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DRAWDOWN_LEVELS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setDdLevel(idx as DrawdownLevel)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      ddLevel === idx
                        ? idx === 0 ? "border-emerald-500/40 bg-emerald-500/10"
                        : idx === 3 ? "border-red-500/40 bg-red-500/10"
                        : "border-yellow-500/40 bg-yellow-500/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <p className={`text-sm font-medium ${
                      ddLevel === idx
                        ? idx === 0 ? "text-emerald-300"
                        : idx === 3 ? "text-red-300"
                        : "text-yellow-300"
                        : "text-white"
                    }`}>{item.pct}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.rule}</p>
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* 7. Professional mindset */}
            <SectionCard
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              title="Tư duy quỹ chuyên nghiệp"
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MINDSET_RULES.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                    <span className="text-xs text-emerald-400">✓</span>
                    <span className="text-xs text-slate-300">{rule}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Global verdict */}
            {canTrade && (
              <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    <div>
                      <p className="text-lg font-bold text-emerald-300">✓ Đủ điều kiện vào lệnh</p>
                      <p className="text-sm text-slate-400">
                        Tất cả 7 bước đều đạt. Kiểm tra lại position size ({riskPct}%) và R:R (1:{result ? fmt2(result.rr) : "?"}) trước khi bấm.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {consecutiveLosses >= 3 && (
              <Card className="border-red-500/20 bg-red-500/[0.03]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-red-400" />
                    <div>
                      <p className="text-lg font-bold text-red-300">✗ Dừng giao dịch hôm nay</p>
                      <p className="text-sm text-slate-400">
                        3 lệnh thua liên tiếp. Nghỉ ngơi, đánh giá lại. Bảo vệ vốn trước, kiếm tiền sau.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      <div className="flex-1 h-full overflow-y-auto p-6 bg-transparent" />
    </div>
    </>
  );
}
