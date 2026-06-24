"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Calculator,
    TrendingUp,
    GitMerge,
    CandlestickChart,
    ClipboardCheck,
    ShieldAlert,
    CheckCircle2,
    XCircle,
    Circle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
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
    { pct: "< 3%", rule: "Giao dịch bình thường" },
    { pct: "3% DD", rule: "Giảm 50% khối lượng" },
    { pct: "5% DD", rule: "Chỉ đánh setup A+" },
    { pct: "10% DD", rule: "Dừng — đánh giá lại hệ thống" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Sub-components ───────────────────────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function TradingChecklist() {
    // Calculator state
    const [acc, setAcc] = useState("10000");
    const [riskPct, setRiskPct] = useState("0.5");
    const [entry, setEntry] = useState("100");
    const [sl, setSl] = useState("97");
    const [tp, setTp] = useState("106");

    // Checklist state
    const [trend, setTrend] = useState<Trend>(null);
    const [confluence, setConfluence] = useState<Set<number>>(new Set());
    const [entrySignals, setEntrySignals] = useState<Set<string>>(new Set());
    const [finalAnswers, setFinalAnswers] = useState<FinalVal[]>([null, null, null, null, null]);
    const [ddLevel, setDdLevel] = useState<DrawdownLevel>(null);

    // ── Calc ──
    const result = calcPosition(
        parseFloat(acc) || 0,
        parseFloat(riskPct) || 0,
        parseFloat(entry) || 0,
        parseFloat(sl) || 0,
        parseFloat(tp) || 0,
    );

    // ── Confluence ──
    const toggleConf = useCallback((idx: number) => {
        setConfluence(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    }, []);

    // ── Entry signals ──
    const toggleEntry = useCallback((id: string) => {
        setEntrySignals(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    // ── Final filter ──
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

    // ── R:R color ──
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

    return (
        <div className="space-y-4 p-1">

        {/* ── 1. Position size calculator ── */}
        <SectionCard
            icon={<Calculator className="h-4 w-4 text-blue-400" />}
            title="Position size calculator"
            badge={<Badge className="bg-red-500/15 text-red-300 text-xs">Quan trọng nhất</Badge>}
        >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {
                [
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

{/* ── 2. Trend ── */}
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
                <span className="block text-xs opacity-70 mt-0.5">
                    {t === "up" ? "HH + HL" : t === "down" ? "LH + LL" : "Giảm khối lượng"}
                </span>
            </button>
        ))}
    </div>
</SectionCard>

{/* ── 3. Confluence ── */}
<SectionCard
    icon={<GitMerge className="h-4 w-4 text-yellow-400" />}
    title="Điểm hợp lưu"
    badge={
        <Badge className={`text-xs ${confluence.size >= 3 ? "bg-emerald-500/15 text-emerald-300" : "bg-yellow-500/15 text-yellow-300"}`}>
            {confluence.size} / {CONFLUENCE_ITEMS.length} {confluence.size >= 3 ? "✓" : "- cần ≥ 3"}
        </Badge>
    }
>
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
        <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
            <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{
                    width: `${(confluence.size / CONFLUENCE_ITEMS.length) * 100}%`
                }}
            />
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">
            {confluence.size >= 3 ? "Đủ điều kiện" : `Còn thiếu ${3 - confluence.size}`}
        </span>
    </div>
</SectionCard>

{/* ── 4. Entry confirmation ── */}
<SectionCard
    icon={<CandlestickChart className="h-4 w-4 text-yellow-400" />}
    title="Xác nhận điểm vào"
    badge={
        <Badge className={`text-xs ${entrySignals.size >= 2 ? "bg-emerald-500/15 text-emerald-300" : "bg-yellow-500/15 text-yellow-300"}`}>
            {entrySignals.size} tín hiệu {entrySignals.size >= 2 ? "✓" : "- cần ≥ 2"}
        </Badge>
    }
>
    <div className="divide-y divide-white/5">
        {ENTRY_SIGNALS.map(({ id, label, sub }) => (
            <label
                key={id}
                className="flex cursor-pointer items-start gap-3 py-2.5 hover:text-white transition-colors"
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

{/* ── 5. Final filter ── */}
<SectionCard
    icon={<ClipboardCheck className="h-4 w-4 text-red-400" />}
    title="Bộ lọc cuối - trước khi bấm Buy/Sell"
    badge={
        <Badge className={`text-xs ${passCount === 5 ? "bg-emerald-500/15 text-emerald-300" : noCount > 0 ? "bg-red-500/15 text-red-300" : "bg-slate-500/15 text-slate-400"}`}>
            {passCount} / 5 pass
        </Badge>
    }
>
    <div className="divide-y divide-white/5">
        {FINAL_QUESTIONS.map((q, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-slate-300">{q}</span>
                <div className="flex gap-1.5 shrink-0">
                    <button
                        onClick={() => setFinal(idx, "yes")}
                        className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                            finalAnswers[idx] === "yes"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "border border-white/10 text-slate-500 hover:border-white/20"
                        }`}
                    >
                        Có
                    </button>
                    <button
                        onClick={() => setFinal(idx, "no")}
                        className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                            finalAnswers[idx] === "no"
                                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                : "border border-white/10 text-slate-500 hover:border-white/20"
                        }`}
                    >
                        Không
                    </button>
                </div>
            </div>
        ))}
    </div>

    {/* Verdict */}
    <div className={`mt-3 flex items-center gap-3 rounded-lg p-3 ${
        !allAnswered ? "bg-slate-900/60"
            : noCount === 0 ? "bg-emerald-500/10 border border-emerald-500/20"
            : "bg-red-500/10 border border-red-500/20"
    }`}>
        {!allAnswered
            ? <Circle className="h-5 w-5 text-slate-500 shrink-0" />
            : noCount === 0
                ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                : <XCircle className="h-5 w-5 text-red-400 shrink-0" />
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
            <p className="text-xs text-slate-500 mt-0.5">
                {!allAnswered ? "Trả lời đủ 5 câu để nhận kết quả"
                    : noCount === 0 ? "Tất cả điều kiện đạt. Kiểm tra position size trước khi bấm."
                    : "Trader chuyên nghiệp không vào lệnh khi thiếu bất kỳ điều kiện nào."}
            </p>
        </div>
    </div>
</SectionCard>

{/* ── 6. Drawdown management ── */}
<SectionCard
    icon={<ShieldAlert className="h-4 w-4 text-red-400" />}
    title="Quản lý thua lỗ - chọn mức drawdown hiện tại"
>
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
                }`}>
                    {item.pct}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{item.rule}</p>
            </button>
        ))}
    </div>
</SectionCard>

        </div>
    );
}