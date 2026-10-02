"use client";

import { useState, useCallback, useEffect } from "react";
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
import { useTranslation } from "@/components/providers/I18nProvider";


type Trend = "up" | "down" | "side" | null;
type FinalVal = "yes" | "no" | null;
type DrawdownLevel = 0 | 1 | 2 | 3 | null;



const fmt2 = (n: number) => n.toFixed(2);

function calcPosition(acc: number, riskPct: number, entry: number, sl: number, tp: number, trend: Trend) {
  const riskDollar = acc * (riskPct / 100);
  const validLong = trend === "up" && sl < entry && tp > entry;
  const validShort = trend === "down" && sl > entry && tp < entry;
  if (!validLong && !validShort) return null;
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
  const { t, language } = useTranslation();
  const isVi = language === "vi";

  const CONFLUENCE_ITEMS = isVi ? [
    "Xu xu hướng đúng chiều",
    "Hỗ trợ / Kháng cự",
    "Supply / Demand / Order Block",
    "FVG (Fair Value Gap)",
    "Fibonacci OTE 0.5–0.786",
    "EMA 20 / 50 / 200",
  ] : [
    "Trend aligned",
    "Support / Resistance",
    "Supply / Demand / Order Block",
    "FVG (Fair Value Gap)",
    "Fibonacci OTE 0.5–0.786",
    "EMA 20 / 50 / 200",
  ];

  const ENTRY_SIGNALS = isVi ? [
    { id: "pin", label: "Pin Bar", sub: "Bấc dài, thân nhỏ ở vùng hỗ trợ/kháng cự" },
    { id: "eng", label: "Engulfing", sub: "Nến nuốt — xác nhận đảo chiều mạnh" },
    { id: "star", label: "Morning Star / Evening Star", sub: "Mẫu hình 3 nến đảo chiều" },
    { id: "liq", label: "Liquidity Sweep", sub: "Quét đỉnh/đáy trước khi đảo chiều" },
    { id: "vol", label: "Volume tăng mạnh", sub: "Khối lượng xác nhận lực đẩy" },
  ] : [
    { id: "pin", label: "Pin Bar", sub: "Long wick, small body at support/resistance" },
    { id: "eng", label: "Engulfing", sub: "Engulfing candle — strong reversal confirmation" },
    { id: "star", label: "Morning Star / Evening Star", sub: "3-candle reversal pattern" },
    { id: "liq", label: "Liquidity Sweep", sub: "Sweep high/low before reversal" },
    { id: "vol", label: "Volume surge", sub: "Volume confirms push force" },
  ];

  const FINAL_QUESTIONS = isVi ? [
    "Xu hướng đúng chiều?",
    "Có ≥ 3 hợp lưu?",
    "Có tín hiệu xác nhận (≥ 2)?",
    "R:R ≥ 1:2?",
    "Không có tin tức lớn sắp ra?",
  ] : [
    "Trend aligned?",
    "Has ≥ 3 confluences?",
    "Has confirmation signals (≥ 2)?",
    "R:R ≥ 1:2?",
    "No major upcoming news?",
  ];

  const DRAWDOWN_LEVELS = isVi ? [
    { pct: "< 3%", rule: "Giao dịch bình thường" },
    { pct: "3% DD", rule: "Giảm 50% khối lượng" },
    { pct: "5% DD", rule: "Chỉ đánh setup A+" },
    { pct: "10% DD", rule: "Dừng — đánh giá lại hệ thống" },
  ] : [
    { pct: "< 3%", rule: "Normal trading" },
    { pct: "3% DD", rule: "Reduce volume by 50%" },
    { pct: "5% DD", rule: "Trade A+ setups only" },
    { pct: "10% DD", rule: "Stop — review system" },
  ];

  const MINDSET_RULES = isVi ? [
    "Không cố giao dịch mỗi ngày",
    "Không FOMO",
    "Không gồng lỗ",
    "Không dời Stop Loss xa hơn",
    "Không tăng khối lượng để gỡ lỗ",
    "Bảo vệ vốn trước, kiếm tiền sau",
  ] : [
    "Do not force trades every day",
    "No FOMO",
    "Do not hold losses",
    "Do not move Stop Loss further",
    "Do not increase volume to chase losses",
    "Protect capital first, make money second",
  ];

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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("trading-checklist:v1") || "null");
      if (saved) {
        if (typeof saved.acc === "string") setAcc(saved.acc);
        if (typeof saved.riskPct === "string") setRiskPct(saved.riskPct);
        if (typeof saved.entry === "string") setEntry(saved.entry);
        if (typeof saved.sl === "string") setSl(saved.sl);
        if (typeof saved.tp === "string") setTp(saved.tp);
        if (["up", "down", "side", null].includes(saved.trend)) setTrend(saved.trend);
        if (Array.isArray(saved.confluence)) setConfluence(new Set(saved.confluence));
        if (Array.isArray(saved.entrySignals)) setEntrySignals(new Set(saved.entrySignals));
        if (Array.isArray(saved.finalAnswers) && saved.finalAnswers.length === 5) setFinalAnswers(saved.finalAnswers);
        if ([0, 1, 2, 3, null].includes(saved.ddLevel)) setDdLevel(saved.ddLevel);
        if (Number.isInteger(saved.consecutiveLosses)) setConsecutiveLosses(Math.max(0, Math.min(3, saved.consecutiveLosses)));
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("trading-checklist:v1", JSON.stringify({ acc, riskPct, entry, sl, tp, trend, confluence: [...confluence], entrySignals: [...entrySignals], finalAnswers, ddLevel, consecutiveLosses, savedAt: new Date().toISOString() }));
  }, [acc, consecutiveLosses, confluence, ddLevel, entry, entrySignals, finalAnswers, hydrated, riskPct, sl, tp, trend]);

  const result = calcPosition(
    parseFloat(acc) || 0,
    parseFloat(riskPct) || 0,
    parseFloat(entry) || 0,
    parseFloat(sl) || 0,
    parseFloat(tp) || 0,
    trend,
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
    && (parseFloat(riskPct) || 0) > 0
    && (parseFloat(riskPct) || 0) <= 0.5
    && (ddLevel === 0 || ddLevel === 1)
    && consecutiveLosses < 3;

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
    && (parseFloat(riskPct) || 0) > 0
    && (parseFloat(riskPct) || 0) <= 1
    && (ddLevel === 0 || ddLevel === 1 || (ddLevel === 2 && isAplus))
    && entrySignals.has("liq")
    && consecutiveLosses < 3;

  return (
    <>
      <div className="flex flex-1 h-full overflow-hidden">
      <main className="w-[820px] shrink-0 border-r border-white/5 h-full overflow-y-auto p-6 space-y-6">
          <header className="mb-7">
            <p className="text-sm font-medium text-[#54a0ff]">{isVi ? "Giao dịch chuẩn quỹ" : "Institutional Prop Trading"}</p>
            <h2 className="rainbow-text mt-2 text-3xl font-black">Trading Checklist</h2>
            <p className="mt-1 text-sm text-slate-400">
              {isVi ? "Kiểm tra 7 bước trước mỗi lệnh — theo tiêu chuẩn quỹ chuyên nghiệp" : "Check 7 steps before every order — professional fund standard"}
            </p>
          </header>

          {/* A+ Setup Formula */}
          <Card className="mb-6 border-yellow-500/20 bg-yellow-500/[0.03]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-300">A+</span>
                <div>
                  <p className="text-sm font-bold text-white">{isVi ? "Công thức \"A+ Setup\"" : "\"A+ Setup\" Formula"}</p>
                  <pre className="mt-2 text-xs leading-relaxed text-slate-300">
                    {isVi ? `Xu hướng HTF đúng chiều
+ ≥ 3 hợp lưu
+ Liquidity Sweep
+ Nến xác nhận
+ Volume tăng
+ R:R ≥ 1:2 (tốt nhất 1:3)
+ Risk 0.25–0.5%
———————————————
= Được phép vào lệnh` : `HTF Trend Aligned
+ ≥ 3 Confluences
+ Liquidity Sweep
+ Confirmation Candle
+ Volume Increase
+ R:R ≥ 1:2 (optimal 1:3)
+ Risk 0.25–0.5%
———————————————
= Trade Allowed`}
                  </pre>
                  {isAplus && (
                    <div className="mt-2 rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                      {isVi ? "✓ Setup hiện tại đạt chuẩn A+" : "✓ Current setup qualifies as A+"}
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
              title={isVi ? "Quản lý rủi ro" : "Risk Management"}
              badge={<Badge className="bg-red-500/15 text-red-300 text-xs">{isVi ? "Quan trọng nhất" : "Most Important"}</Badge>}
            >
              <p className="mb-3 text-xs text-slate-500">
                {isVi ? "Rủi ro 0.25–0.5% tài khoản (tối đa 1%) • Công thức: Khối lượng = (TK × Risk%) / (Entry − SL)" : "Risk 0.25–0.5% of account (max 1%) • Formula: Volume = (Account × Risk%) / (Entry − SL)"}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: isVi ? "Quy mô tài khoản ($)" : "Account size ($)", val: acc, set: setAcc, prefix: "$" },
                  { label: isVi ? "Rủi ro %" : "Risk %", val: riskPct, set: setRiskPct, suffix: "%" },
                  { label: isVi ? "Giá vào lệnh ($)" : "Entry price ($)", val: entry, set: setEntry, prefix: "$" },
                  { label: isVi ? "Cắt lỗ ($)" : "Stop loss ($)", val: sl, set: setSl, prefix: "$" },
                  { label: isVi ? "Chốt lời ($)" : "Take profit ($)", val: tp, set: setTp, prefix: "$" },
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
                  {isVi ? `R:R = 1:${fmt2(result.rr)} — chưa đạt ngưỡng tối thiểu 1:2` : `R:R = 1:${fmt2(result.rr)} — minimum threshold 1:2 not met`}
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-slate-950/60 p-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">{isVi ? "Khối lượng vị thế" : "Position size"}</p>
                  <p className="mt-1 text-base font-medium text-white">
                    {result ? `${fmt2(result.posSize)} units` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{isVi ? "Tỷ lệ R:R" : "R:R ratio"}</p>
                  <p className={`mt-1 text-base font-medium ${rrColor}`}>
                    {result ? `1 : ${fmt2(result.rr)}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{isVi ? "Mục tiêu lợi nhuận" : "Profit target"}</p>
                  <p className="mt-1 text-base font-medium text-emerald-400">
                    {result ? `$${fmt2(result.profitTarget)}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{isVi ? "Rủi ro mỗi lệnh" : "Risk per trade"}</p>
                  <p className={`mt-1 text-base font-medium ${riskColor}`}>
                    {result ? `$${fmt2(result.riskDollar)} (${riskPct}%)` : "—"}
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* 2. Trend */}
            <SectionCard
              icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
              title={isVi ? "Xu hướng (H4 / D1)" : "Trend (H4 / D1)"}
              badge={
                trend === "up" ? <Badge className="bg-emerald-500/15 text-emerald-300 text-xs">{isVi ? "Uptrend - chỉ Buy" : "Uptrend - Buy only"}</Badge>
                  : trend === "down" ? <Badge className="bg-red-500/15 text-red-300 text-xs">{isVi ? "Downtrend - chỉ Sell" : "Downtrend - Sell only"}</Badge>
                  : trend === "side" ? <Badge className="bg-yellow-500/15 text-yellow-300 text-xs">{isVi ? "Sideway - không vào" : "Sideway - Do not enter"}</Badge>
                  : <Badge variant="outline" className="border-white/10 text-slate-500 text-xs">{isVi ? "Chưa chọn" : "Not Selected"}</Badge>
              }
            >
              <p className="mb-3 text-xs text-slate-500">
                {isVi ? "Xác định xu hướng khung H4 hoặc D1 trước khi tìm điểm vào" : "Confirm H4 or D1 trend before searching for entries"}
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
                      {t === "up" ? "↑ Uptrend" : t === "down" ? "↓ Downtrend" : (isVi ? "→ Đi ngang" : "→ Sideways")}
                    </span>
                    <span className="mt-0.5 block text-xs opacity-70">
                      {t === "up" ? "HH + HL" : t === "down" ? "LH + LL" : (isVi ? "Giảm khối lượng" : "Reduce volume")}
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
                  {confluence.size >= 3 ? (isVi ? "Đủ điều kiện" : "Eligible") : (isVi ? `Còn thiếu ${3 - confluence.size}` : `Missing ${3 - confluence.size}`)}
                </span>
              </div>
            </SectionCard>

            {/* 4. Entry confirmation */}
            <SectionCard
              icon={<CandlestickChart className="h-4 w-4 text-yellow-400" />}
              title={isVi ? "Xác nhận điểm vào" : "Entry Confirmation"}
              badge={
                <Badge className={`text-xs ${entrySignals.size >= 2 ? "bg-emerald-500/15 text-emerald-300" : "bg-yellow-500/15 text-yellow-300"}`}>
                  {isVi ? `${entrySignals.size} tín hiệu ${entrySignals.size >= 2 ? "✓" : "- cần ≥ 2"}` : `${entrySignals.size} signals ${entrySignals.size >= 2 ? "✓" : "- need ≥ 2"}`}
                </Badge>
              }
            >
              <p className="mb-3 text-xs text-slate-500">
                {isVi ? "Không đặt Limit mù quáng — chờ tín hiệu xác nhận (tốt nhất có ≥ 2)" : "Do not place blind Limit orders — wait for confirmation signals (preferably ≥ 2)"}
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
              title={isVi ? "Bộ lọc cuối — trước khi bấm Buy/Sell" : "Final Filter — Before clicking Buy/Sell"}
              badge={
                <Badge className={`text-xs ${passCount === 5 ? "bg-emerald-500/15 text-emerald-300" : noCount > 0 ? "bg-red-500/15 text-red-300" : "bg-slate-500/15 text-slate-400"}`}>
                  {passCount} / 5
                </Badge>
              }
            >
              <p className="mb-3 text-xs text-slate-500">
                {isVi ? "Chỉ cần 1 câu trả lời là \"Không\" → bỏ lệnh" : "Just one \"No\" answer → skip the trade"}
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
                        {isVi ? "Có" : "Yes"}
                      </button>
                      <button
                        onClick={() => setFinal(idx, "no")}
                        className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                          finalAnswers[idx] === "no"
                            ? "border border-red-500/40 bg-red-500/20 text-red-300"
                            : "border border-white/10 text-slate-500 hover:border-white/20"
                        }`}
                      >
                        {isVi ? "Không" : "No"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`mt-3 flex items-center gap-3 rounded-lg p-3 ${
                !allAnswered ? "bg-slate-900/60"
                  : noCount === 0 && canTrade ? "border border-emerald-500/20 bg-emerald-500/10"
                  : "border border-red-500/20 bg-red-500/10"
              }`}>
                {!allAnswered
                  ? <Circle className="h-5 w-5 shrink-0 text-slate-500" />
                  : noCount === 0 && canTrade
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    : <XCircle className="h-5 w-5 shrink-0 text-red-400" />
                }
                <div>
                  <p className={`text-sm font-medium ${
                    !allAnswered ? "text-slate-400"
                      : noCount === 0 && canTrade ? "text-emerald-300"
                      : "text-red-300"
                  }`}>
                    {!allAnswered ? (isVi ? "Chưa đánh giá" : "Not Evaluated")
                      : noCount === 0 && canTrade ? (isVi ? "A+ Setup — Được phép vào lệnh" : "A+ Setup — Trade Allowed")
                      : (isVi ? `Bỏ lệnh - ${noCount} điều kiện chưa đạt` : `Skip trade - ${noCount} conditions not met`)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {!allAnswered ? (isVi ? "Trả lời đủ 5 câu để nhận kết quả" : "Answer all 5 questions to see results")
                      : noCount === 0 && canTrade ? (isVi ? "Tất cả điều kiện đạt. Kiểm tra position size trước khi bấm." : "All conditions met. Check position size before placing.")
                      : noCount === 0 ? (isVi ? "Các câu trả lời đạt nhưng còn cổng giao dịch chưa đạt." : "Final answers pass, but other trade gates are still unmet.")
                      : (isVi ? "Trader chuyên nghiệp không vào lệnh khi thiếu bất kỳ điều kiện nào." : "Professional traders do not enter trades when any condition is missing.")}
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* 6. Consecutive losses + Drawdown */}
            <SectionCard
              icon={<ShieldAlert className="h-4 w-4 text-red-400" />}
              title={isVi ? "Quản lý thua lỗ" : "Loss Management"}
              badge={
                consecutiveLosses >= 3
                  ? <Badge className="bg-red-500/15 text-red-300 text-xs">{isVi ? "Dừng giao dịch hôm nay" : "Stop Trading Today"}</Badge>
                  : <Badge className="bg-yellow-500/15 text-yellow-300 text-xs">{isVi ? `${consecutiveLosses}/3 lệnh thua` : `${consecutiveLosses}/3 loss trades`}</Badge>
              }
            >
              <div className="mb-4">
                <p className="mb-2 text-xs text-slate-500">{isVi ? "Số lệnh thua liên tiếp" : "Consecutive losses"}</p>
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
                      ? (isVi ? "⚠ Nghỉ trong ngày" : "⚠ Stop for today")
                      : (isVi ? `Còn ${3 - consecutiveLosses} lệnh thua trước khi phải dừng` : `${3 - consecutiveLosses} more losses before stop`)}
                  </span>
                </div>
              </div>

              <p className="mb-2 text-xs text-slate-500">{isVi ? "Mức drawdown hiện tại" : "Current drawdown level"}</p>
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
              title={isVi ? "Tư duy quỹ chuyên nghiệp" : "Professional Fund Mindset"}
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
                      <p className="text-lg font-bold text-emerald-300">{isVi ? "✓ Đủ điều kiện vào lệnh" : "✓ Trade Allowed"}</p>
                      <p className="text-sm text-slate-400">
                        {isVi ? `Tất cả 7 bước đều đạt. Kiểm tra lại position size (${riskPct}%) và R:R (1:${result ? fmt2(result.rr) : "?"}) trước khi bấm.` : `All 7 steps met. Double check position size (${riskPct}%) and R:R (1:${result ? fmt2(result.rr) : "?"}) before entering.`}
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
                      <p className="text-lg font-bold text-red-300">{isVi ? "✗ Dừng giao dịch hôm nay" : "✗ Stop Trading Today"}</p>
                      <p className="text-sm text-slate-400">
                        {isVi ? "3 lệnh thua liên tiếp. Nghỉ ngơi, đánh giá lại. Bảo vệ vốn trước, kiếm tiền sau." : "3 consecutive losses. Rest, re-evaluate. Protect capital first, make money second."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        
        {/* Right Analytics Workspace */}
        <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 z-10">
          {/* Position Sizing Calculator Results */}
          <div className="antigravity-panel p-5 space-y-4 bg-transparent">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{isVi ? "Thông số lệnh dự kiến" : "Expected Order Parameters"}</h3>
            </div>
            
            {result ? (
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{isVi ? "Quy mô vị thế (Size):" : "Position size (Size):"}</span>
                  <span className="font-mono font-bold text-white text-sm">{fmt2(result.posSize)} units</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{isVi ? "Tỷ lệ Risk : Reward:" : "Risk : Reward ratio:"}</span>
                  <span className={`font-mono font-bold text-sm ${rrColor}`}>1 : {fmt2(result.rr)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{isVi ? "Mục tiêu lợi nhuận (Target):" : "Profit target (Target):"}</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">${fmt2(result.profitTarget)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{isVi ? "Rủi ro chấp nhận (Risk):" : "Accepted risk (Risk):"}</span>
                  <span className={`font-mono font-bold text-sm ${riskColor}`}>${fmt2(result.riskDollar)} ({riskPct}%)</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2.5">
                  <span className="text-slate-500">{isVi ? "Điểm vào lệnh (Entry):" : "Entry price (Entry):"}</span>
                  <span className="font-mono text-slate-300 font-bold">${entry}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{isVi ? "Điểm cắt lỗ (Stop Loss):" : "Stop loss (Stop Loss):"}</span>
                  <span className="font-mono text-red-400 font-bold">${sl}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{isVi ? "Điểm chốt lời (Take Profit):" : "Take profit (Take Profit):"}</span>
                  <span className="font-mono text-emerald-400 font-bold">${tp}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-550 italic text-center py-4">{isVi ? "Nhập đủ thông số tính toán ở bên trái" : "Enter all parameters on the left to calculate"}</p>
            )}
          </div>

          {/* Capital Protection Rule Card */}
          {consecutiveLosses >= 3 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 space-y-3">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">{isVi ? "⚠ DỪNG GIAO DỊCH NGAY" : "⚠ STOP TRADING NOW"}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isVi ? "Bạn đã chạm giới hạn 3 lệnh thua liên tiếp trong hôm nay. Việc tiếp tục giao dịch có nguy cơ cao dẫn đến trả thù thị trường (revenge trading) và cháy tài khoản. Nghỉ ngơi và quay lại vào ngày mai." : "You have reached the limit of 3 consecutive loss trades today. Continuing to trade carries a high risk of revenge trading and blowing your account. Take a rest and return tomorrow."}
              </p>
            </div>
          )}

          {/* Checklist Setup Badge Alert */}
          {isAplus && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 space-y-1.5">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{isVi ? "A+ SETUP ĐẠT CHUẨN" : "A+ SETUP QUALIFIED"}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isVi ? "Tất cả điều kiện thiết lập giao dịch chất lượng cao đã sẵn sàng. Giao dịch này đáp ứng đầy đủ tiêu chí quản lý vốn của quỹ." : "All conditions for a high-quality trading setup are ready. This trade fully meets institutional capital management criteria."}
              </p>
            </div>
          )}

          {/* Professional Mindset Card */}
          <div className="antigravity-panel p-5 space-y-3 bg-transparent">
            <div className="border-b border-white/5 pb-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{isVi ? "Kỷ luật Trader chuyên nghiệp" : "Professional Trader Discipline"}</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              {MINDSET_RULES.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--accent)] mt-0.5">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
