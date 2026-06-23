"use client";

import { memo } from "react";
import { AlertTriangle, PieChart, Target, TrendingUp } from "lucide-react";
import type { AnalysisDerived, PositionSummary } from "@/types/analysis";
import { formatNumber, formatPercent, isFiniteNumber } from "@/utils/risk";

function PortfolioSummary({ positions, derived }: { positions: PositionSummary[]; derived: AnalysisDerived }) {
  if (!positions.length) return null;
  const cards = [
    { label: "GIÁ TRỊ DANH MỤC", icon: PieChart, value: derived.totalValue != null ? `$${formatNumber(derived.totalValue)}` : "N/A", detail: `${positions.length} vị thế${derived.missingPriceCount ? ` · ${derived.missingPriceCount} chờ giá` : ""}`, tone: "rainbow-text" },
    { label: "TỔNG P&L", icon: TrendingUp, value: isFiniteNumber(derived.totalPnl) ? `${derived.totalPnl >= 0 ? "+" : ""}${formatNumber(derived.totalPnl)}` : "N/A", detail: formatPercent(derived.totalPnlPct), tone: isFiniteNumber(derived.totalPnl) && derived.totalPnl >= 0 ? "text-green-400" : "text-red-400" },
    { label: "RISK SCORE", icon: AlertTriangle, value: derived.riskScore == null ? "N/A" : `${derived.riskScore}/100`, detail: derived.riskScore == null ? "Chưa có giá thị trường" : `Rủi ro ${derived.risk.label}`, tone: derived.risk.color },
    { label: "BENCHMARK", icon: Target, value: "S&P 500", detail: `Portfolio: ${formatPercent(derived.totalPnlPct)}`, tone: "text-slate-300" },
  ];
  return (
    <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(card => <div key={card.label} className="app-panel p-5"><div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-400"><card.icon className="h-3.5 w-3.5" />{card.label}</div><p className={`text-2xl font-black ${card.tone}`}>{card.value}</p><p className={`mt-1 text-xs ${card.tone}`}>{card.detail}</p>{card.label === "RISK SCORE" && <div className="mt-2 h-1.5 rounded-full bg-slate-800"><div className={`h-1.5 rounded-full ${derived.risk.bg}`} style={{ width: `${derived.riskScore ?? 0}%` }} /></div>}</div>)}
    </div>
  );
}

export default memo(PortfolioSummary);
