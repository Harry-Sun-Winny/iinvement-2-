"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Building2, CircleDollarSign, Database, LineChart, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import FinancialSection, { FinancialMetric } from "./FinancialSection";
import StockChart, { StockSeriesPoint } from "./StockChart";
import { fetchIncomeStatement, fetchValuationMetrics, FmpIncomeStatement, FmpValuationMetrics } from "@/services/fmpService";

interface AssetLike {
  assetSymbol: string;
  assetName: string;
}

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
}

interface ProfileData {
  logo?: string;
  marketCap?: number;
  name?: string;
  currency?: string;
}

interface HistoryPoint {
  date: string;
  close: number | null;
  adjustedClose: number | null;
  volume: number | null;
}

interface HistoryData {
  currency?: string;
  points?: HistoryPoint[];
  fundamentals?: FundamentalPoint[];
}

interface FundamentalPoint {
  date: string;
  revenue: number | null;
  ebitda: number | null;
  netIncome: number | null;
}

interface StockAnalyticsModalProps {
  item: AssetLike | null;
  quote?: PriceData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function compactMoney(value?: number | null, currency = "USD") {
  if (value == null || !Number.isFinite(value)) return "N/A";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const prefix = currency === "USD" ? "$" : `${currency} `;
  if (abs >= 1_000_000_000_000) return `${sign}${prefix}${(abs / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${sign}${prefix}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${prefix}${abs.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function compactNumber(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) return `${sign}${(abs / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatRatio(value?: number | null, suffix = "") {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(2)}${suffix}`;
}

function movingAverage(values: number[], window: number, index: number) {
  const start = Math.max(0, index - window + 1);
  const slice = values.slice(start, index + 1);
  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}

function buildSeries(history: HistoryPoint[], fundamentals: FundamentalPoint[], marketCap?: number): StockSeriesPoint[] {
  const valid = history.filter(point => point.adjustedClose != null || point.close != null);
  const prices = valid.map(point => point.adjustedClose ?? point.close ?? 0);
  const lastPrice = prices[prices.length - 1] || 0;
  let fundamentalIndex = -1;
  let currentFundamentals: FundamentalPoint | null = null;

  return valid.map((point, index) => {
    const adjustedPrice = prices[index];
    while (fundamentalIndex + 1 < fundamentals.length && fundamentals[fundamentalIndex + 1].date <= point.date) {
      fundamentalIndex += 1;
      currentFundamentals = fundamentals[fundamentalIndex];
    }
    return {
      date: point.date,
      price: adjustedPrice,
      volume: point.volume,
      ma50: movingAverage(prices, 50, index),
      ma200: movingAverage(prices, 200, index),
      revenue: currentFundamentals?.revenue ?? null,
      ebitda: currentFundamentals?.ebitda ?? null,
      netIncome: currentFundamentals?.netIncome ?? null,
      marketCap: marketCap && lastPrice > 0 ? marketCap * (adjustedPrice / lastPrice) : null,
    };
  });
}

function metric(label: string, value: string, trend?: number | null, sublabel?: string): FinancialMetric {
  return { label, value, trend, sublabel };
}

function StockAnalyticsModal({ item, quote, open, onOpenChange }: StockAnalyticsModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [liveQuote, setLiveQuote] = useState<PriceData | undefined>(quote);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [income, setIncome] = useState<FmpIncomeStatement | null>(null);
  const [valuation, setValuation] = useState<FmpValuationMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    const currentItem = item;
    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      setError("");
      try {
        const [priceResult, profileResult, historyResult, incomeResult, valuationResult] = await Promise.allSettled([
          fetch(`/api/stock-price?symbol=${encodeURIComponent(currentItem.assetSymbol)}`).then(res => {
            if (!res.ok) throw new Error("Price request failed");
            return res.json();
          }),
          fetch(`/api/stock-profile?symbol=${encodeURIComponent(currentItem.assetSymbol)}`).then(res => {
            if (!res.ok) throw new Error("Profile request failed");
            return res.json();
          }),
          fetch(`/api/stock-history?symbol=${encodeURIComponent(currentItem.assetSymbol)}&range=Max`).then(res => {
            if (!res.ok) throw new Error("History request failed");
            return res.json();
          }),
          fetchIncomeStatement(currentItem.assetSymbol),
          fetchValuationMetrics(currentItem.assetSymbol),
        ]);

        if (cancelled) return;
        if (priceResult.status === "fulfilled") setLiveQuote(priceResult.value);
        if (profileResult.status === "fulfilled") setProfile(profileResult.value);
        if (historyResult.status === "fulfilled") setHistory(historyResult.value);
        else setHistory(null);
        setIncome(incomeResult.status === "fulfilled" ? incomeResult.value : null);
        setValuation(valuationResult.status === "fulfilled" ? valuationResult.value : null);
        if (incomeResult.status === "rejected" && valuationResult.status === "rejected") {
          const message = incomeResult.reason instanceof Error ? incomeResult.reason.message : "Unable to load FMP fundamentals.";
          setError(message);
        } else if (priceResult.status === "rejected" && profileResult.status === "rejected" && historyResult.status === "rejected") {
          setError("Unable to load stock analytics right now.");
        }
      } catch {
        if (!cancelled) setError("Unable to load stock analytics right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [item, open]);

  useEffect(() => {
    if (quote) setLiveQuote(quote);
  }, [quote]);

  const currency = history?.currency || profile?.currency || "USD";
  const price = liveQuote?.price;
  const marketCap = profile?.marketCap ? profile.marketCap * 1_000_000 : undefined;
  const chartData = useMemo(
    () => buildSeries(history?.points ?? [], history?.fundamentals ?? [], marketCap),
    [history?.fundamentals, history?.points, marketCap],
  );
  const latest = chartData[chartData.length - 1];
  const prior = chartData[Math.max(0, chartData.length - 22)];
  const monthlyTrend = latest?.price && prior?.price ? ((latest.price - prior.price) / prior.price) * 100 : null;

  const sections = useMemo(
    () => [
      {
        title: "Price Metrics",
        description: "Live quote and technical context from existing market data.",
        metrics: [
          metric("Adjusted Close Price", compactMoney(price, currency), liveQuote?.changePercent ?? null, "Current quote"),
          metric("50-Day Moving Average", compactMoney(latest?.ma50, currency), monthlyTrend, "Derived from displayed series"),
          metric("200-Day Moving Average", compactMoney(latest?.ma200, currency), monthlyTrend, "Derived from displayed series"),
          metric("Trading Volume", compactNumber(latest?.volume), null, "Yahoo historical volume"),
        ],
      },
      {
        title: "Dividend Metrics",
        description: "Dividend data requires a fundamentals endpoint.",
        metrics: [
          metric("Dividend Per Share", "N/A", null, "No dividend API connected"),
          metric("Dividend Yield", "N/A", null, "No dividend API connected"),
        ],
      },
      {
        title: "Valuation Metrics",
        description: "Enterprise and multiple analysis from Financial Modeling Prep.",
        metrics: [
          metric("Enterprise Value (TEV)", compactMoney(valuation?.enterpriseValue, currency), null, "FMP key metrics"),
          metric("P/E Ratio", formatRatio(valuation?.peRatio), null, "FMP key metrics"),
          metric("Price/Sales (TTM)", formatRatio(valuation?.priceToSalesRatio), null, "FMP key metrics"),
          metric("Price/Book", formatRatio(valuation?.pbRatio), null, "FMP key metrics"),
          metric("PEG Ratio", formatRatio(valuation?.pegRatio), null, "FMP ratios"),
        ],
      },
      {
        title: "Income Statement",
        description: "Latest revenue quality and profitability from Financial Modeling Prep.",
        metrics: [
          metric("Revenue", compactMoney(income?.revenue, currency), null, "Latest FMP income statement"),
          metric("Gross Profit", compactMoney(income?.grossProfit, currency), null, "Latest FMP income statement"),
          metric("Net Income Available To Common Shareholders", compactMoney(income?.netIncome, currency), null, "Latest FMP income statement"),
          metric("EBITDA", compactMoney(income?.ebitda, currency), null, "Latest FMP income statement"),
        ],
      },
      {
        title: "Cash Flow",
        description: "Operating cash generation and reinvestment.",
        metrics: [
          metric("Capital Expenditure", "N/A", null, "Requires cash-flow API"),
          metric("Cash From Operating Activities", "N/A", null, "Requires cash-flow API"),
        ],
      },
      {
        title: "Balance Sheet",
        description: "Liquidity and leverage checks.",
        metrics: [
          metric("Cash & Short-Term Investments", "N/A", null, "Requires balance-sheet API"),
          metric("Total Debt", "N/A", null, "Requires balance-sheet API"),
          metric("Net Debt", "N/A", null, "Requires balance-sheet API"),
        ],
      },
      {
        title: "Growth Metrics",
        description: "Capitalization and shareholder base.",
        metrics: [
          metric("Net Income Growth", "N/A", null, "Requires historical statements"),
          metric("Shares Outstanding", price && marketCap ? compactNumber(marketCap / price) : "N/A", null, "Derived from market cap / price"),
          metric("Adjusted Market Capitalization", compactMoney(marketCap, currency), liveQuote?.changePercent ?? null, "Profile API"),
        ],
      },
      {
        title: "Market Sentiment",
        description: "Positioning and crowding indicators.",
        metrics: [metric("Short Interest Ratio", formatRatio(null), null, "Requires short interest feed")],
      },
    ],
    [currency, income, latest, liveQuote?.changePercent, marketCap, monthlyTrend, price, valuation],
  );

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#050816] p-0 text-slate-100 sm:max-w-[min(1280px,calc(100vw-2rem))]">
        <div className="sticky top-0 z-20 border-b border-white/10 bg-[#050816]/95 px-5 py-4 backdrop-blur">
          <DialogHeader>
            <div className="flex flex-col gap-3 pr-10 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <DialogTitle className="flex items-center gap-3 text-xl text-white">
                  {profile?.logo ? <img src={profile.logo} alt="" className="h-8 w-8 rounded-full bg-white" /> : <Building2 className="h-7 w-7 text-cyan-300" />}
                  {item.assetSymbol}
                  <Badge variant="outline" className="border-cyan-400/30 text-cyan-300">Analytics</Badge>
                </DialogTitle>
                <DialogDescription className="mt-2 text-slate-400">{profile?.name || item.assetName}</DialogDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={liveQuote?.changePercent != null && liveQuote.changePercent >= 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}>
                  {liveQuote?.changePercent == null ? "N/A" : `${liveQuote.changePercent >= 0 ? "+" : ""}${liveQuote.changePercent.toFixed(2)}%`}
                </Badge>
                <Badge variant="outline" className="border-white/10 text-slate-300">{compactMoney(price, currency)}</Badge>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-5">
          {error && (
            <Card className="border-red-500/20 bg-red-500/10">
              <CardContent className="flex items-center gap-2 p-4 text-sm text-red-300">
                <ShieldAlert className="h-4 w-4" />
                {error}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Last Price", value: compactMoney(price, currency), icon: CircleDollarSign },
              { label: "Market Cap", value: compactMoney(marketCap, currency), icon: BarChart3 },
              { label: "Data Coverage", value: "Quote + Profile", icon: Database },
            ].map((card, index) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                <Card className="border-white/10 bg-white/[0.035]">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                      {loading ? <Skeleton className="mt-3 h-7 w-28 bg-white/10" /> : <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3 text-cyan-300">
                      <card.icon className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <StockChart data={chartData} loading={loading} error={error} />

          <div className="grid gap-5 xl:grid-cols-2">
            {sections.map((section, index) => (
              <motion.div key={section.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                <FinancialSection {...section} loading={loading} />
              </motion.div>
            ))}
          </div>

          <Card className="border-amber-400/20 bg-amber-400/10">
            <CardContent className="flex gap-3 p-4 text-sm text-amber-200">
              <LineChart className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Income statement and valuation metrics are provided by Financial Modeling Prep. Unsupported fields remain N/A.
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default memo(StockAnalyticsModal);
