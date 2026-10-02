import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useTableTheme } from "../../app/lib/table-theme";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  scorePosition,
  weightedScore,
} from "@/lib/analysis-framework";
import { CanonicalClassification } from "@/lib/taxonomy-normalizer";
import { useTranslation } from "@/components/providers/I18nProvider";
import { fmtCompactMoney, fmtQuantity, fmtCompactSignedMoney, fmtMoney } from "../../app/lib/finance/currency";

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  returnPct: number;
  weight: number;
  sector: string;
  country: string;
  canonical?: CanonicalClassification;
  trendPoints?: number[];
  dayChangePct?: number;

  // Display fields
  avgCostDisplay?: number;
  currentPriceDisplay?: number | null;
  marketValueDisplay?: number | null;
  pnlDisplay?: number | null;
}

interface Props {
  data: Holding[];
  currency?: string;
}

type SortKey = "symbol" | "quantity" | "marketValue" | "pnl" | "returnPct" | "weight";
type SortDirection = "asc" | "desc";

function formatPercent(num: number, digits = 2) {
  return `${num.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

function renderSparkline(points?: number[], isVi?: boolean) {
  if (!points || points.length < 2) {
    return <span className="text-[10px] text-slate-500">{isVi ? "Không có xu hướng" : "No trend"}</span>;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - ((point - min) / range) * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const rising = points[points.length - 1] >= points[0];

  return (
    <svg viewBox="0 0 100 100" className="h-8 w-20 overflow-visible">
      <path
        d={path}
        fill="none"
        stroke={rising ? "#34d399" : "#f87171"}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HoldingsTable({ data, currency = "USD" }: Props) {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const numberLocale = isVi ? "vi-VN" : "en-US";
  const { theme, setTheme, themes, textClass } = useTableTheme();
  const [sortKey, setSortKey] = useState<SortKey>("marketValue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedData = useMemo(() => [...data].map((h) => {
    const sector = h.canonical?.sector || "Other";
    const country = h.canonical?.country || "Other";
    const industry = h.canonical?.industry || sector;
    const scores = scorePosition({
      returnPct: h.returnPct,
      totalReturnPct: h.returnPct,
      weight: h.weight,
    });
    const totalScore = weightedScore(scores, sector);

    return {
      ...h,
      sector,
      industry,
      country,
      totalScore,
    };
  }).sort((a, b) => {
    const sortKeyMapped =
      sortKey === "marketValue" ? "marketValueDisplay" :
      sortKey === "pnl" ? "pnlDisplay" :
      sortKey;

    const left = sortKey === "symbol" ? a.symbol : (a as any)[sortKeyMapped] ?? (a as any)[sortKey];
    const right = sortKey === "symbol" ? b.symbol : (b as any)[sortKeyMapped] ?? (b as any)[sortKey];

    const result = typeof left === "string" && typeof right === "string"
      ? left.localeCompare(right)
      : Number(left ?? 0) - Number(right ?? 0);

    if (result === 0) return a.symbol.localeCompare(b.symbol);
    return sortDirection === "asc" ? result : -result;
  }), [data, sortDirection, sortKey]);

  function toggleSort(nextKey: SortKey) {
    setSortDirection(prev => (sortKey === nextKey ? (prev === "asc" ? "desc" : "asc") : "desc"));
    setSortKey(nextKey);
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 text-slate-500" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 text-cyan-300" />
      : <ArrowDown className="h-3 w-3 text-cyan-300" />;
  }

  return (
    <div className="space-y-4">
      <div className="antigravity-panel flex flex-col gap-3 border-white/5 bg-white/[0.01] px-4 py-3 transition-all hover:bg-white/[0.02] md:flex-row md:items-center md:justify-between">
        <span className="min-w-[120px] break-words whitespace-normal text-xs font-bold uppercase tracking-wider text-slate-400">{isVi ? "Màu chủ đạo của bảng:" : "Table Theme:"}</span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {themes.map((t) => (
            <button
              key={t.name}
              onClick={() => setTheme(t.name)}
              className={`h-3.5 w-3.5 rounded-full border-2 transition-all ${
                theme === t.name ? "scale-125 border-white ring-2 ring-white/20" : "border-transparent opacity-60 hover:opacity-100"
              }`}
              style={{ backgroundColor: t.hex }}
              title={t.name}
            />
          ))}
        </div>
      </div>

      <div className="antigravity-panel overflow-hidden border-white/5 bg-white/[0.01] transition-all hover:bg-white/[0.02]">
        <Table>
          <TableHeader className="bg-[var(--table)]/50">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                <button type="button" onClick={() => toggleSort("symbol")} className="inline-flex items-center gap-1">
                  {isVi ? "Mã" : "Symbol"} {sortIcon("symbol")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>{isVi ? "Tên" : "Name"}</TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                <button type="button" onClick={() => toggleSort("quantity")} className="inline-flex items-center gap-1">
                  {isVi ? "SL" : "Qty"} {sortIcon("quantity")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>{isVi ? "Giá vốn" : "Avg Cost"}</TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>{isVi ? "Giá ht" : "Current"}</TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                <button type="button" onClick={() => toggleSort("marketValue")} className="inline-flex items-center gap-1">
                  {isVi ? "Giá trị" : "Market Value"} {sortIcon("marketValue")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                <button type="button" onClick={() => toggleSort("pnl")} className="inline-flex items-center gap-1">
                  {isVi ? "Lãi/Lỗ" : "P/L"} {sortIcon("pnl")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                <button type="button" onClick={() => toggleSort("returnPct")} className="inline-flex items-center gap-1">
                  {isVi ? "Tỷ suất" : "Return"} {sortIcon("returnPct")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>{isVi ? "Xu hướng" : "Trend"}</TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                <button type="button" onClick={() => toggleSort("weight")} className="inline-flex items-center gap-1">
                  {isVi ? "Tỷ trọng" : "Weight"} {sortIcon("weight")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>{isVi ? "Ngành" : "Sector"}</TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>{isVi ? "Quốc gia" : "Country"}</TableHead>
              <TableHead className={`text-right text-xs font-bold uppercase tracking-wider ${textClass}`}>{isVi ? "Điểm" : "Score"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {sortedData.map((h, idx) => (
                <TableRow
                  key={`${h.symbol}-${idx}`}
                  className={`border-white/5 ${idx < 5 ? "bg-cyan-400/[0.03] hover:bg-cyan-400/[0.06]" : "hover:bg-white/5"}`}
                >
                  <TableCell className={`font-mono ${idx < 5 ? "text-[15px] font-black text-white" : `font-bold ${textClass}`}`}>{h.symbol}</TableCell>
                  <TableCell className={idx < 5 ? "font-medium text-white" : textClass}>{h.name}</TableCell>
                  <TableCell className={`text-right tabular-nums ${textClass}`}><span title={fmtQuantity(h.quantity, numberLocale)}>{fmtQuantity(h.quantity, numberLocale)}</span></TableCell>
                  <TableCell className={`text-right tabular-nums ${textClass}`}>{fmtMoney(h.avgCostDisplay ?? h.avgCost, currency)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${textClass}`}>{fmtMoney(h.currentPriceDisplay ?? h.currentPrice, currency)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${idx < 5 ? "font-black text-white" : `font-medium ${textClass}`}`}><span title={fmtMoney(h.marketValueDisplay ?? h.marketValue, currency)}>{fmtCompactMoney(h.marketValueDisplay ?? h.marketValue, currency, numberLocale)}</span></TableCell>
                  <TableCell className="text-right">
                    <Badge variant={(h.pnlDisplay ?? h.pnl) >= 0 ? "default" : "destructive"} className={(h.pnlDisplay ?? h.pnl) >= 0 ? "bg-emerald-500/10 text-emerald-400" : ""}>
                      {fmtCompactSignedMoney(h.pnlDisplay ?? h.pnl, currency, numberLocale)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${h.returnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatPercent(h.returnPct)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{renderSparkline(h.trendPoints, isVi)}</TableCell>
                  <TableCell className="min-w-[120px]">
                    <div className="flex items-center justify-end gap-3">
                      <div className="h-2.5 w-16 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-300"
                          style={{ width: `${Math.min(Math.max(h.weight, 0), 100)}%` }}
                        />
                      </div>
                      <span className={`w-14 text-right tabular-nums ${textClass}`}>{formatPercent(h.weight)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">{h.sector === h.industry ? h.sector : `${h.sector} - ${h.industry}`}</TableCell>
                  <TableCell className="text-xs text-slate-300">{h.country}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={h.totalScore >= 70 ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-300"
                                    : h.totalScore >= 45 ? "border-amber-500/20 bg-amber-500/15 text-amber-300"
                                    : "border-red-500/20 bg-red-500/15 text-red-300"}>
                      {h.totalScore.toFixed(0)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
