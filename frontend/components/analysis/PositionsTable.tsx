"use client";

import { memo } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import type { AnalysisDerived, PositionSummary, SortDir, SortKey, StockData } from "@/types/analysis";
import { formatNumber, formatPercent, isFiniteNumber } from "@/utils/risk";
import {
  COUNTRY_LABEL,
  getCountry,
  getIndustry,
  INDUSTRY_LABEL,
} from "@/lib/analysis-framework";

interface Props {
  positions: PositionSummary[];
  prices: Record<string, StockData>;
  derived: AnalysisDerived;
  sortKey: SortKey;
  sortDir: SortDir;
  loading: boolean;
  onSort: (key: SortKey) => void;
  onRefresh: () => void;
  symbolCounts: Record<string, number>;
  onOpenJournal: (symbol: string) => void;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-20" />;
  return direction === "asc"
    ? <ArrowUp className="h-3 w-3 text-cyan-400" />
    : <ArrowDown className="h-3 w-3 text-cyan-400" />;
}

function PositionsTable(props: Props) {
  if (!props.positions.length) {
    return (
      <div className="app-panel relative overflow-hidden rounded-[24px] p-12 text-center text-slate-400 shadow-[0_24px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        Portfolio này chưa có giao dịch nào hoạt động.
      </div>
    );
  }

  const headings: { key: SortKey | "industry" | "country" | "journal"; label: string; align: string }[] = [
    { key: "symbol", label: "MÃ", align: "text-left" },
    { key: "value", label: "GIÁ TRỊ THỊ TRƯỜNG", align: "text-right" },
    { key: "pnl", label: "P&L", align: "text-right" },
    { key: "pnlPct", label: "LỢI NHUẬN", align: "text-right" },
    { key: "weight", label: "TỶ TRỌNG DANH MỤC", align: "text-right" },
    { key: "industry", label: "PHÂN KHÚC NGÀNH", align: "text-left" },
    { key: "country", label: "QUỐC GIA", align: "text-left" },
    { key: "journal", label: "NHẬT KÝ", align: "text-center" },
  ];

  return (
    <div className="app-panel relative overflow-hidden rounded-[24px] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      {/* Subtle top indicator line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Header section with styling and actions */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-white">
            Vị thế hiện tại
          </h3>
          {props.loading && (
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
              Đang làm mới dữ liệu giá thị trường...
            </p>
          )}
        </div>
        <button
          onClick={props.onRefresh}
          disabled={props.loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/60 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition-all duration-300 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${props.loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Modern, high-end table representation */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {headings.map((heading) => (
                <th key={heading.key} className={`px-4 pb-3.5 ${heading.align}`}>
                  <button
                    onClick={() => {
                      if (heading.key !== "industry" && heading.key !== "country" && heading.key !== "journal") {
                        props.onSort(heading.key);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 hover:text-cyan-400 transition-colors disabled:pointer-events-none disabled:hover:text-slate-500"
                    disabled={heading.key === "industry" || heading.key === "country" || heading.key === "journal"}
                  >
                    {heading.label}
                    {heading.key !== "industry" && heading.key !== "country" && heading.key !== "journal" && (
                      <SortIcon active={props.sortKey === heading.key} direction={props.sortDir} />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {props.derived.sortedPositions.map((position) => {
              const quote = props.prices[position.symbol];
              const weight = position.priced && props.derived.totalValue
                ? (position.value / props.derived.totalValue) * 100
                : null;
              const positive = position.priced && position.pnlPct >= 0;
              const industry = getIndustry(position.symbol);
              const country = getCountry(position.symbol);

              return (
                <tr key={position.symbol} className="group transition-all duration-200 odd:bg-white/[0.005] hover:bg-white/[0.02]">
                  {/* Symbol details */}
                  <td className="px-4 py-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950/60 border border-white/5 text-xs font-black text-cyan-400 shadow-inner group-hover:border-cyan-500/20 group-hover:text-cyan-300 transition-all duration-300">
                        {position.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-100 group-hover:text-cyan-300 transition-colors">{position.symbol}</p>
                        <p className="max-w-[140px] truncate text-[10px] font-semibold text-slate-400 mt-0.5">{position.name}</p>
                        <p className="min-w-[140px] text-[10px] text-slate-500 mt-0.5 font-medium">
                          {position.quantity.toLocaleString()} cp · ${formatNumber(position.avgPrice)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Market Value */}
                  <td className="px-4 py-4 text-right">
                    <p className="font-bold text-slate-200">
                      {position.priced ? `$${formatNumber(position.value)}` : props.loading ? "..." : "N/A"}
                    </p>
                    {quote && (
                      <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] font-medium leading-none">
                        <span className="text-slate-500">${formatNumber(quote.price)}</span>
                        <span className={`h-1 w-1 rounded-full ${quote.change >= 0 ? "bg-emerald-500/30" : "bg-rose-500/30"}`} />
                        <span className={quote.change >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          {quote.change >= 0 ? "+" : ""}
                          {quote.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </td>

                  {/* P&L */}
                  <td className={`px-4 py-4 text-right font-semibold transition-all duration-300 ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                    {position.priced ? `${position.pnl >= 0 ? "+" : ""}${formatNumber(position.pnl)}` : "N/A"}
                  </td>

                  {/* Returns Badge */}
                  <td className="px-4 py-4 text-right">
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold border transition-all duration-300 ${
                      positive 
                        ? "bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-400" 
                        : "bg-rose-500/[0.04] border-rose-500/20 text-rose-400"
                    }`}>
                      {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {position.priced ? formatPercent(position.pnlPct) : "N/A"}
                    </span>
                  </td>

                  {/* Portfolio Weight */}
                  <td className="px-4 py-4 text-right">
                    <p className="text-xs font-extrabold text-slate-300">
                      {isFiniteNumber(weight) ? `${weight.toFixed(1)}%` : "N/A"}
                    </p>
                    {isFiniteNumber(weight) && (
                      <div className="ml-auto mt-2 h-1 w-full max-w-[70px] rounded-full bg-slate-950/60 overflow-hidden border border-white/5">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" 
                          style={{ width: `${weight}%` }} 
                        />
                      </div>
                    )}
                  </td>

                  {/* Industry segment */}
                  <td className="px-4 py-4 text-left text-xs font-semibold text-slate-400">
                    {INDUSTRY_LABEL[industry]}
                  </td>

                  {/* Country */}
                  <td className="px-4 py-4 text-left text-xs font-semibold text-slate-400">
                    {COUNTRY_LABEL[country]}
                  </td>

                  {/* Journal notes count link */}
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => props.onOpenJournal(position.symbol)}
                      title="Xem nhật ký"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-slate-950/40 px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-cyan-400 hover:border-cyan-500/20 hover:bg-slate-950 transition-all duration-300"
                    >
                      <span aria-hidden="true">📘</span>{" "}
                      <span className="text-cyan-400/90">{props.symbolCounts[position.symbol] || "0"}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer Panel */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-5 text-sm">
        <div className="rounded-2xl bg-slate-950/30 border border-white/5 p-4 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng giá trị danh mục</span>
          <span className="text-lg font-black text-white">
            {props.derived.totalValue != null ? `$${formatNumber(props.derived.totalValue)}` : "N/A"}
          </span>
        </div>
        <div className="rounded-2xl bg-slate-950/30 border border-white/5 p-4 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng lợi nhuận (P&amp;L)</span>
          <span className={`text-lg font-black ${isFiniteNumber(props.derived.totalPnl) && props.derived.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {isFiniteNumber(props.derived.totalPnl)
              ? `${props.derived.totalPnl >= 0 ? "+" : ""}${formatNumber(props.derived.totalPnl)} (${formatPercent(props.derived.totalPnlPct)})`
              : "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(PositionsTable);
