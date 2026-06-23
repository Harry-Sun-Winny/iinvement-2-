"use client";

import { memo } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import type { AnalysisDerived, PositionSummary, SortDir, SortKey, StockData } from "@/types/analysis";
import { formatNumber, formatPercent, isFiniteNumber } from "@/utils/risk";

interface Props {
  positions: PositionSummary[];
  prices: Record<string, StockData>;
  derived: AnalysisDerived;
  sortKey: SortKey;
  sortDir: SortDir;
  loading: boolean;
  onSort: (key: SortKey) => void;
  onRefresh: () => void;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return direction === "asc" ? <ArrowUp className="h-3 w-3 text-[#54a0ff]" /> : <ArrowDown className="h-3 w-3 text-[#54a0ff]" />;
}

function PositionsTable(props: Props) {
  if (!props.positions.length) return <div className="app-panel p-10 text-center text-slate-400">Portfolio này chưa có giao dịch nào.</div>;
  const headings: { key: SortKey; label: string; align: string }[] = [
    { key: "symbol", label: "MÃ", align: "text-left" }, { key: "value", label: "GIÁ TRỊ", align: "text-right" },
    { key: "pnl", label: "P&L", align: "text-right" }, { key: "pnlPct", label: "LỢI NHUẬN", align: "text-right" },
    { key: "weight", label: "TỶ TRỌNG", align: "text-right" },
  ];
  return (
    <div className="app-panel mb-7 p-5">
      <div className="mb-4 flex items-center justify-between"><h3 className="font-black rainbow-text">Vị thế hiện tại {props.loading && <span className="ml-2 text-xs font-normal text-slate-400">Đang tải giá...</span>}</h3><button onClick={props.onRefresh} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"><RefreshCw className={`h-3.5 w-3.5 ${props.loading ? "animate-spin" : ""}`} />Refresh</button></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700 text-xs text-slate-500">{headings.map(heading => <th key={heading.key} className={`pb-2 ${heading.align}`}><button onClick={() => props.onSort(heading.key)} className="inline-flex items-center gap-1 hover:text-[#54a0ff]">{heading.label}<SortIcon active={props.sortKey === heading.key} direction={props.sortDir} /></button></th>)}</tr></thead>
          <tbody className="divide-y divide-slate-800">
            {props.derived.sortedPositions.map(position => {
              const quote = props.prices[position.symbol];
              const weight = position.priced && props.derived.totalValue ? (position.value / props.derived.totalValue) * 100 : null;
              const positive = position.priced && position.pnlPct >= 0;
              return <tr key={position.symbol} className="group transition-colors hover:bg-slate-800/50">
                <td className="py-3 pr-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-xs font-black text-[#54a0ff]">{position.symbol.slice(0, 2)}</div><div><p className="font-black text-[#54a0ff]">{position.symbol}</p><p className="text-xs text-slate-400">{position.name}</p><p className="text-xs text-slate-500">{position.quantity} cp · TB ${formatNumber(position.avgPrice)}</p></div></div></td>
                <td className="py-3 text-right"><p className="font-bold text-white">{position.priced ? `$${formatNumber(position.value)}` : props.loading ? "Đang tải..." : "N/A"}</p>{quote && <><p className="text-xs text-slate-400">${formatNumber(quote.price)}</p><p className={`text-xs ${quote.change >= 0 ? "text-green-400" : "text-red-400"}`}>{quote.change >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}% hôm nay</p></>}</td>
                <td className={`py-3 text-right font-bold ${positive ? "text-green-400" : "text-red-400"}`}>{position.priced ? `${position.pnl >= 0 ? "+" : ""}${formatNumber(position.pnl)}` : "N/A"}</td>
                <td className="py-3 text-right"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${positive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{position.priced ? formatPercent(position.pnlPct) : "N/A"}</span></td>
                <td className="py-3 pl-4 text-right"><p className="text-xs font-bold text-slate-300">{isFiniteNumber(weight) ? `${weight.toFixed(1)}%` : "N/A"}</p><div className="ml-auto mt-1 h-1 w-full max-w-[80px] rounded-full bg-slate-800"><div className="h-1 rounded-full rainbow-bg" style={{ width: `${weight ?? 0}%` }} /></div></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-700 pt-4"><div className="text-sm text-slate-400">Tổng giá trị</div><div className="font-black rainbow-text">{props.derived.totalValue != null ? `$${formatNumber(props.derived.totalValue)}` : "N/A"}</div><div className="w-full" /><div className="text-sm text-slate-400">Tổng P&L</div><div className={`font-black ${isFiniteNumber(props.derived.totalPnl) && props.derived.totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>{isFiniteNumber(props.derived.totalPnl) ? `${props.derived.totalPnl >= 0 ? "+" : ""}${formatNumber(props.derived.totalPnl)} (${formatPercent(props.derived.totalPnlPct)})` : "N/A"}</div></div>
    </div>
  );
}

export default memo(PositionsTable);
