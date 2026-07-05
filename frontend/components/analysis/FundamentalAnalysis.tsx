"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from "lucide-react";

/**
 * FundamentalAnalysis
 * -----------------------------------------------------------------------
 * Component for Analyzing Fundamental metrics of the portfolio.
 * Currently uses mock data, but designed to be easily mapped to API responses.
 * -----------------------------------------------------------------------
 */

interface StockAnalysis {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  weight: number;
  pe: number | null;
  peIndustryAvg: number | null;
  pb: number | null;
  pbIndustryAvg: number | null;
  evEbitda: number | null;
  roe: number | null;
  roa: number | null;
  epsGrowthYoY: number | null;
  revenueGrowthYoY: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  currentRatio: number | null;
  fcfYield: number | null;
}

const PORTFOLIO_MOCK: StockAnalysis[] = [
  {
    ticker: "VNM",
    name: "Vinamilk",
    sector: "Hàng tiêu dùng",
    price: 68500,
    weight: 18.2,
    pe: 14.2,
    peIndustryAvg: 18.5,
    pb: 3.8,
    pbIndustryAvg: 4.1,
    evEbitda: 8.9,
    roe: 27.4,
    roa: 19.1,
    epsGrowthYoY: 6.8,
    revenueGrowthYoY: 3.2,
    debtToEquity: 0.21,
    dividendYield: 5.1,
    grossMargin: 41.2,
    netMargin: 16.8,
    currentRatio: 2.4,
    fcfYield: 6.9,
  },
  {
    ticker: "FPT",
    name: "FPT Corporation",
    sector: "Công nghệ",
    price: 142300,
    weight: 24.6,
    pe: 22.1,
    peIndustryAvg: 19.8,
    pb: 6.2,
    pbIndustryAvg: 5.0,
    evEbitda: 14.3,
    roe: 29.8,
    roa: 14.2,
    epsGrowthYoY: 21.4,
    revenueGrowthYoY: 19.7,
    debtToEquity: 0.48,
    dividendYield: 1.4,
    grossMargin: 38.6,
    netMargin: 13.1,
    currentRatio: 1.6,
    fcfYield: 3.2,
  },
  {
    ticker: "HPG",
    name: "Hòa Phát Group",
    sector: "Vật liệu cơ bản",
    price: 27800,
    weight: 15.4,
    pe: 9.8,
    peIndustryAvg: 11.2,
    pb: 1.3,
    pbIndustryAvg: 1.5,
    evEbitda: 6.1,
    roe: 13.9,
    roa: 6.8,
    epsGrowthYoY: -4.2,
    revenueGrowthYoY: 8.1,
    debtToEquity: 0.72,
    dividendYield: 2.8,
    grossMargin: 14.9,
    netMargin: 8.2,
    currentRatio: 1.2,
    fcfYield: 4.5,
  },
  {
    ticker: "VCB",
    name: "Vietcombank",
    sector: "Ngân hàng",
    price: 91200,
    weight: 21.0,
    pe: 13.6,
    peIndustryAvg: 10.4,
    pb: 2.9,
    pbIndustryAvg: 1.9,
    evEbitda: null,
    roe: 21.7,
    roa: 1.9,
    epsGrowthYoY: 9.4,
    revenueGrowthYoY: 11.2,
    debtToEquity: null,
    dividendYield: 0.0,
    grossMargin: null,
    netMargin: 38.4,
    currentRatio: null,
    fcfYield: null,
  },
  {
    ticker: "MWG",
    name: "Thế Giới Di Động",
    sector: "Bán lẻ",
    price: 54100,
    weight: 11.3,
    pe: 31.5,
    peIndustryAvg: 16.7,
    pb: 5.4,
    pbIndustryAvg: 3.2,
    evEbitda: 17.8,
    roe: 17.2,
    roa: 5.9,
    epsGrowthYoY: 142.6,
    revenueGrowthYoY: 12.8,
    debtToEquity: 0.91,
    dividendYield: 0.9,
    grossMargin: 22.4,
    netMargin: 2.6,
    currentRatio: 1.1,
    fcfYield: 1.8,
  },
  {
    ticker: "GAS",
    name: "PV GAS",
    sector: "Năng lượng",
    price: 73400,
    weight: 9.5,
    pe: 16.9,
    peIndustryAvg: 13.1,
    pb: 2.6,
    pbIndustryAvg: 2.0,
    evEbitda: 9.4,
    roe: 15.8,
    roa: 11.6,
    epsGrowthYoY: -11.3,
    revenueGrowthYoY: -6.4,
    debtToEquity: 0.15,
    dividendYield: 4.2,
    grossMargin: 19.8,
    netMargin: 12.3,
    currentRatio: 2.1,
    fcfYield: 5.7,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtNumber(n: number | null | undefined, suffix = "") {
  if (n === null || n === undefined) return "—";
  return `${n.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${suffix}`;
}

function valuationLabel(value: number | null, industryAvg: number | null) {
  if (value === null || industryAvg === null || industryAvg === undefined) {
    return { label: "Chưa đủ dữ liệu", tone: "neutral" };
  }
  const ratio = value / industryAvg;
  if (ratio <= 0.85) return { label: "Định giá rẻ", tone: "good" };
  if (ratio >= 1.2) return { label: "Định giá đắt", tone: "bad" };
  return { label: "Hợp lý", tone: "neutral" };
}

function gaugePosition(value: number | null, industryAvg: number | null) {
  if (value === null || industryAvg === null) return 50;
  const min = industryAvg * 0.5;
  const max = industryAvg * 1.5;
  const pct = ((value - min) / (max - min)) * 100;
  return Math.max(4, Math.min(96, pct));
}

const toneColors = {
  good: { text: "text-emerald-400", bg: "bg-emerald-400", dot: "bg-emerald-400" },
  bad: { text: "text-rose-400", bg: "bg-rose-400", dot: "bg-rose-400" },
  neutral: { text: "text-amber-300", bg: "bg-amber-300", dot: "bg-amber-300" },
};

function GrowthPill({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span className="text-[#5B6478] text-xs">—</span>;
  }
  const positive = value > 0;
  const flat = value === 0;
  const Icon = flat ? Minus : positive ? TrendingUp : TrendingDown;
  const color = flat
    ? "text-[#8A93A6]"
    : positive
    ? "text-emerald-400"
    : "text-rose-400";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon size={13} strokeWidth={2.5} />
      {fmtNumber(Math.abs(value), "%")}
    </span>
  );
}

function ValuationGauge({ value, industryAvg, label }: { value: number | null, industryAvg: number | null, label: string }) {
    const { label: vLabel, tone } = valuationLabel(value, industryAvg);
    const pos = gaugePosition(value, industryAvg);
    const colors = toneColors[tone as keyof typeof toneColors];

  return (
    <div className="flex flex-col gap-1.5 min-w-[150px]">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-[#6B7488] font-medium">
          {label}
        </span>
        <span className={`text-xs font-semibold ${colors.text}`}>{vLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-[#E7E9EE] tabular-nums w-10">
          {fmtNumber(value, "x")}
        </span>
        <div className="relative flex-1 h-1.5 rounded-full bg-gradient-to-r from-emerald-500/30 via-amber-300/30 to-rose-500/30">
          <div
            className="absolute -top-[3px] w-2 h-2 rounded-full ring-2 ring-[#0B0E14]"
            style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
          >
            <div className={`w-full h-full rounded-full ${colors.bg}`} />
          </div>
        </div>
        <span className="font-mono text-[11px] text-[#5B6478] tabular-nums w-10 text-right">
          TB {fmtNumber(industryAvg, "x")}
        </span>
      </div>
    </div>
  );
}

function StatBlock({ label, value, hint }: { label: string, value: React.ReactNode, hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-[#6B7488] font-medium">
        {label}
      </span>
      <span className="font-mono text-[15px] text-[#E7E9EE] tabular-nums">
        {value}
      </span>
      {hint && <span className="text-[11px] text-[#5B6478]">{hint}</span>}
    </div>
  );
}

function ExpandedDetail({ stock }: { stock: StockAnalysis }) {
  return (
    <div className="bg-white/[0.01] border-t border-white/5 px-5 py-5 grid grid-cols-2 md:grid-cols-4 gap-5">
      <ValuationGauge value={stock.pe} industryAvg={stock.peIndustryAvg} label="P/E" />
      <ValuationGauge value={stock.pb} industryAvg={stock.pbIndustryAvg} label="P/B" />
      <StatBlock label="EV/EBITDA" value={fmtNumber(stock.evEbitda, "x")} />
      <StatBlock label="FCF Yield" value={fmtNumber(stock.fcfYield, "%")} />

      <StatBlock label="ROE" value={fmtNumber(stock.roe, "%")} hint="Hiệu quả vốn CSH" />
      <StatBlock label="ROA" value={fmtNumber(stock.roa, "%")} hint="Hiệu quả tài sản" />
      <StatBlock label="Biên LN gộp" value={fmtNumber(stock.grossMargin, "%")} />
      <StatBlock label="Biên LN ròng" value={fmtNumber(stock.netMargin, "%")} />

      <StatBlock label="Tăng trưởng EPS (YoY)" value={<GrowthPill value={stock.epsGrowthYoY} />} />
      <StatBlock label="Tăng trưởng DT (YoY)" value={<GrowthPill value={stock.revenueGrowthYoY} />} />
      <StatBlock label="Nợ/Vốn CSH" value={fmtNumber(stock.debtToEquity, "x")} hint={stock.debtToEquity && stock.debtToEquity > 0.6 ? "Đòn bẩy cao" : "An toàn"} />
      <StatBlock label="Tỷ suất cổ tức" value={fmtNumber(stock.dividendYield, "%")} />
    </div>
  );
}

import type { PositionSummary } from "@/types/analysis";

export default function FundamentalAnalysis({ positions }: { positions: PositionSummary[] }) {
  const dynamicMock = useMemo(() => {
    if (!positions || positions.length === 0) return PORTFOLIO_MOCK;
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0) || 1;
    return positions.map((p) => {
      const mock = PORTFOLIO_MOCK.find((m) => m.ticker === p.symbol);
      const weight = (p.value / totalValue) * 100;
      if (mock) return { ...mock, weight, price: p.currentPrice };

      return {
        ticker: p.symbol,
        name: p.name || p.symbol,
        sector: "Chưa phân loại",
        price: p.currentPrice,
        weight,
        pe: null,
        peIndustryAvg: null,
        pb: null,
        pbIndustryAvg: null,
        evEbitda: null,
        roe: null,
        roa: null,
        epsGrowthYoY: null,
        revenueGrowthYoY: null,
        debtToEquity: null,
        dividendYield: null,
        grossMargin: null,
        netMargin: null,
        currentRatio: null,
        fcfYield: null,
      };
    });
  }, [positions]);

  const [expandedTicker, setExpandedTicker] = useState<string | null>(dynamicMock[0]?.ticker || null);
  const [sortKey, setSortKey] = useState<keyof StockAnalysis>("weight");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...dynamicMock];
    arr.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "desc" ? bv.localeCompare(av) : av.localeCompare(bv);
      }
      
      const numAv = typeof av === "number" ? av : -Infinity;
      const numBv = typeof bv === "number" ? bv : -Infinity;
      
      return sortDir === "desc" ? numBv - numAv : numAv - numBv;
    });
    return arr;
  }, [sortKey, sortDir]);

  const portfolioAvgPE = useMemo(() => {
    const valid = dynamicMock.filter((s) => s.pe !== null);
    const weightedSum = valid.reduce((sum, s) => sum + (s.pe || 0) * s.weight, 0);
    const weightSum = valid.reduce((sum, s) => sum + s.weight, 0);
    return weightSum > 0 ? weightedSum / weightSum : null;
  }, [dynamicMock]);

  const portfolioAvgROE = useMemo(() => {
    const valid = dynamicMock.filter((s) => s.roe !== null);
    const weightedSum = valid.reduce((sum, s) => sum + (s.roe || 0) * s.weight, 0);
    const weightSum = valid.reduce((sum, s) => sum + s.weight, 0);
    return weightSum > 0 ? weightedSum / weightSum : null;
  }, [dynamicMock]);

  function toggleSort(key: keyof StockAnalysis) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const columns: { key: keyof StockAnalysis; label: string }[] = [
    { key: "ticker", label: "Mã" },
    { key: "weight", label: "Tỷ trọng" },
    { key: "pe", label: "P/E" },
    { key: "pb", label: "P/B" },
    { key: "roe", label: "ROE" },
    { key: "epsGrowthYoY", label: "TT EPS" },
    { key: "dividendYield", label: "Cổ tức" },
  ];

  return (
    <div className="w-full text-slate-100">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Phân tích cơ bản
          </h2>
          <p className="text-sm text-[#6B7488] mt-1">
            Sức khỏe tài chính & định giá theo từng mã trong danh mục
          </p>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wide text-[#6B7488] font-medium">
              P/E danh mục (bình quân gia quyền)
            </span>
            <span className="font-mono text-xl text-[#E7E9EE] tabular-nums">
              {fmtNumber(portfolioAvgPE, "x")}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wide text-[#6B7488] font-medium">
              ROE danh mục (bình quân gia quyền)
            </span>
            <span className="font-mono text-xl text-emerald-400 tabular-nums">
              {fmtNumber(portfolioAvgROE, "%")}
            </span>
          </div>
        </div>
      </div>

      <div className="border border-white/5 rounded-lg overflow-hidden bg-white/[0.005]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.015] border-b border-white/5">
                <th className="w-8" />
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#6B7488] font-medium cursor-pointer select-none hover:text-[#E7E9EE] transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        <span className="text-amber-300">
                          {sortDir === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-[#6B7488] font-medium">
                  Định giá
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((stock) => {
                const isExpanded = expandedTicker === stock.ticker;
                const { label, tone } = valuationLabel(stock.pe, stock.peIndustryAvg);
                const colors = toneColors[tone as keyof typeof toneColors];
                return (
                  <React.Fragment key={stock.ticker}>
                    <tr
                      onClick={() =>
                        setExpandedTicker(isExpanded ? null : stock.ticker)
                      }
                      className={`border-b border-white/5 cursor-pointer transition-colors ${
                        isExpanded ? "bg-white/[0.015]" : "hover:bg-white/[0.005]"
                      }`}
                    >
                      <td className="px-2 py-3 text-[#5B6478]">
                        {isExpanded ? (
                          <ChevronDown size={15} />
                        ) : (
                          <ChevronRight size={15} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#E7E9EE]">
                          {stock.ticker}
                        </div>
                        <div className="text-[12px] text-[#6B7488]">
                          {stock.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {fmtNumber(stock.weight, "%")}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {fmtNumber(stock.pe, "x")}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {fmtNumber(stock.pb, "x")}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {fmtNumber(stock.roe, "%")}
                      </td>
                      <td className="px-4 py-3">
                        <GrowthPill value={stock.epsGrowthYoY} />
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {fmtNumber(stock.dividendYield, "%")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${colors.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          {label}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={columns.length + 2} className="p-0">
                          <ExpandedDetail stock={stock} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-2 mt-4 text-[12px] text-[#5B6478]">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <p>
          "Định giá rẻ/đắt" so sánh P/E hiện tại với trung bình ngành — chỉ
          mang tính tham khảo, không phải khuyến nghị đầu tư. Nhấn vào một mã
          để xem đầy đủ chỉ số tài chính.
        </p>
      </div>
    </div>
  );
}
