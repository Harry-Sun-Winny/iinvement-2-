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
}

interface Props {
  data: Holding[];
}

type SortKey = "symbol" | "quantity" | "marketValue" | "pnl" | "returnPct" | "weight";
type SortDirection = "asc" | "desc";

function formatNumber(num: number) {
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(num: number) {
  return `$${formatNumber(num)}`;
}

function formatPercent(num: number, digits = 2) {
  return `${num.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

function renderSparkline(points?: number[]) {
  if (!points || points.length < 2) {
    return <span className="text-[10px] text-slate-500">No trend</span>;
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

export function HoldingsTable({ data }: Props) {
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
    const left = sortKey === "symbol" ? a.symbol : a[sortKey];
    const right = sortKey === "symbol" ? b.symbol : b[sortKey];

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
        <span className="min-w-[120px] break-words whitespace-normal text-xs font-bold uppercase tracking-wider text-slate-400">MÃ u chá»§ Ä‘áº¡o cá»§a báº£ng:</span>
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
                  Symbol {sortIcon("symbol")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>Name</TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                <button type="button" onClick={() => toggleSort("quantity")} className="inline-flex items-center gap-1">
                  Qty {sortIcon("quantity")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>Avg Cost</TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>Current</TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                <button type="button" onClick={() => toggleSort("marketValue")} className="inline-flex items-center gap-1">
                  Market Value {sortIcon("marketValue")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                <button type="button" onClick={() => toggleSort("pnl")} className="inline-flex items-center gap-1">
                  P/L {sortIcon("pnl")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                <button type="button" onClick={() => toggleSort("returnPct")} className="inline-flex items-center gap-1">
                  Return {sortIcon("returnPct")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>Trend</TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                <button type="button" onClick={() => toggleSort("weight")} className="inline-flex items-center gap-1">
                  Weight {sortIcon("weight")}
                </button>
              </TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>NgÃ nh</TableHead>
              <TableHead className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>Quá»‘c gia</TableHead>
              <TableHead className={`text-right text-xs font-bold uppercase tracking-wider ${textClass}`}>Score</TableHead>
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
                  <TableCell className={`text-right tabular-nums ${textClass}`}>{formatNumber(h.quantity)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${textClass}`}>{formatCurrency(h.avgCost)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${textClass}`}>{formatCurrency(h.currentPrice)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${idx < 5 ? "font-black text-white" : `font-medium ${textClass}`}`}>{formatCurrency(h.marketValue)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={h.pnl >= 0 ? "default" : "destructive"} className={h.pnl >= 0 ? "bg-emerald-500/10 text-emerald-400" : ""}>
                      {h.pnl >= 0 ? "+" : "-"}{formatCurrency(Math.abs(h.pnl))}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${h.returnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatPercent(h.returnPct)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{renderSparkline(h.trendPoints)}</TableCell>
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
