"use client";

import { useMemo, useState, useEffect } from "react";
import AutoSizedChart from "@/components/charts/AutoSizedChart";
import { useTableTheme } from "../../lib/table-theme";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Cell, Line, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { Banknote, BriefcaseBusiness, DollarSign, LineChart, Percent, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ChartTooltip from "@/components/charts/ChartTooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Transaction } from "../../lib/api";
import { convertCurrency } from "../../lib/finance/currency";

interface Props {
  transactions: Transaction[];
  currentPrices: Record<string, number>;
  currencyRates: Record<string, number>;
  dataReady: boolean;
  historyPricesMap?: Record<string, Array<{ date: string; close: number | null; adjustedClose?: number | null }>>;
  historyPricesLoaded?: boolean;
}

type RangeKey = "1D" | "7D" | "30D" | "3M" | "1Y" | "ALL";
type AssetFilter = "ALL" | "STOCKS" | "ETF" | "CRYPTO" | "BONDS" | "CASH";

interface Position {
  symbol: string;
  name: string;
  type: AssetFilter;
  quantity: number;
  cost: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  realizedPnl: number;
  totalPnl: number;
  returnPct: number;
  totalReturnPct: number;
  weight: number;
  isStalePrice: boolean;
}

interface ChartPoint {
  date: string;
  value: number;
  invested: number;
  pnl: number;
  buyTotal: number;
  sellTotal: number;
  buyAmount: number;
  sellAmount: number;
  buyMarker: number | null;
  sellMarker: number | null;
}

interface HistoricalPointCursor {
  index: number;
  lastPrice: number | null;
  points: Array<{ date: string; price: number }>;
}

function summarizeState(state: Record<string, { quantity: number; cost: number; lastPrice: number }>) {
  return Object.values(state).reduce(
    (totals, item) => {
      const quantity = Math.max(0, item.quantity);
      totals.value += quantity * item.lastPrice;
      totals.invested += item.cost;
      return totals;
    },
    { value: 0, invested: 0 },
  );
}

const RANGES: { key: RangeKey; label: string; days?: number }[] = [
  { key: "1D", label: "1D", days: 1 },
  { key: "7D", label: "7D", days: 7 },
  { key: "30D", label: "30D", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "1Y", label: "1Y", days: 365 },
  { key: "ALL", label: "All" },
];

const ASSET_FILTERS: { key: AssetFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "STOCKS", label: "Stocks" },
  { key: "ETF", label: "ETF" },
  { key: "CRYPTO", label: "Crypto" },
  { key: "BONDS", label: "Bonds" },
  { key: "CASH", label: "Cash" },
];

const PIE_COLORS = ["#38bdf8", "#10b981", "#a78bfa", "#f59e0b", "#94a3b8", "#ef4444"];

function normalizeType(value: string) {
  return value?.toUpperCase().trim();
}

function formatNumber(num: number) {
  return Number(num.toFixed(2)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatQuantity(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return value.toFixed(2).replace(/\.?0+$/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Heuristic guess - không chính xác 100%, nên thay bằng field category từ backend.
// Ví dụ: công ty tên chứa "USD" sẽ bị nhận nhầm là CASH.
// TODO: Khi backend Transaction có field category/assetCategory, ưu tiên dùng field đó.
export function assetType(symbol: string, name = "", backendCategory?: string): AssetFilter {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const text = `${normalizedSymbol} ${name}`.toUpperCase();
  const cryptoSymbols = new Set([
    "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "DOT", "AVAX", "MATIC",
    "POL", "LINK", "LTC", "BCH", "ATOM", "UNI", "AAVE", "NEAR", "APT", "ARB",
    "OP", "SUI", "TON", "TRX", "SHIB", "PEPE", "WIF", "BONK", "ICP", "FIL",
    "HBAR", "XLM", "ETC", "XMR", "USDT", "USDC", "DAI", "FDUSD", "TUSD",
  ]);
  if (
    cryptoSymbols.has(normalizedSymbol) ||
    /\b(BITCOIN|ETHEREUM|SOLANA|BINANCE COIN|RIPPLE|CARDANO|DOGECOIN|POLKADOT|AVALANCHE|CHAINLINK|STABLECOIN)\b/.test(text)
  ) return "CRYPTO";
  // Ưu tiên dùng category từ backend nếu có
  if (backendCategory) {
    const normalized = backendCategory.toUpperCase().trim();
    const categoryAliases: Record<string, AssetFilter> = {
      STOCK: "STOCKS",
      STOCKS: "STOCKS",
      EQUITY: "STOCKS",
      EQUITIES: "STOCKS",
      ETF: "ETF",
      ETFS: "ETF",
      CRYPTO: "CRYPTO",
      CRYPTOCURRENCY: "CRYPTO",
      BOND: "BONDS",
      BONDS: "BONDS",
      FIXED_INCOME: "BONDS",
      CASH: "CASH",
    };
    if (categoryAliases[normalized]) return categoryAliases[normalized];
  }
  // Fallback: regex heuristic guess
  if (/(BTC|ETH|SOL|BNB|USDT|USDC|XRP|ADA|DOGE)/.test(text)) return "CRYPTO";
  if (/(ETF|SPY|QQQ|VOO|VTI|IWM|DIA)/.test(text)) return "ETF";
  if (/(BOND|TBILL|TREASURY|NOTE)/.test(text)) return "BONDS";
  if (/(CASH|USD|VND)/.test(text)) return "CASH";
  return "STOCKS";
}

function formatCompact(value: number) {
  if (!Number.isFinite(value)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(value) >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
    minimumFractionDigits: Math.abs(value) >= 1_000 ? 0 : 2,
  }).format(value);
}

function formatPct(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatRangeLabel(range: RangeKey) {
  const lookup: Record<RangeKey, string> = {
    "1D": "Past 1 day",
    "7D": "Past 7 days",
    "30D": "Past 30 days",
    "3M": "Past 3 months",
    "1Y": "Past 1 year",
    "ALL": "All history",
  };
  return lookup[range];
}

function formatShortDate(date: string | undefined) {
  if (!date) return "--";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Chart values are canonical USD; VND=25,400 therefore converts by division. */
function toUsd(amount: number, currency: string | null | undefined, currencyRates: Record<string, number>) {
  const normalized = currency?.trim().toUpperCase() || "USD";
  if (normalized === "USD" || normalized === "USDT" || normalized === "USDC") return amount;
  return convertCurrency(amount, normalized, "USD", currencyRates);
}

function filterByRange(points: ChartPoint[], range: RangeKey) {
  const days = RANGES.find(r => r.key === range)?.days;
  if (!days || points.length < 2) return points;
  const lastDate = new Date(points[points.length - 1].date).getTime();
  const start = lastDate - days * 24 * 60 * 60 * 1000;
  const filtered = points.filter(p => new Date(p.date).getTime() >= start);
  return filtered.length ? filtered : points.slice(-1);
}

function getRangeStart(points: ChartPoint[], range: RangeKey) {
  const days = RANGES.find(r => r.key === range)?.days;
  if (!days || points.length < 2) return null;
  const lastDate = new Date(points[points.length - 1].date).getTime();
  return lastDate - days * 24 * 60 * 60 * 1000;
}

function buildHistoricalChartPoints(
  transactions: Transaction[],
  currentPrices: Record<string, number>,
  currencyRates: Record<string, number>,
  filter: AssetFilter,
  historyPricesMap?: Record<string, Array<{ date: string; close: number | null; adjustedClose?: number | null }>>,
) {
  if (!historyPricesMap) return [];

  const sorted = [...transactions]
    .filter(t => filter === "ALL" || assetType(t.assetSymbol, t.assetName, (t as any).category ?? (t as any).assetCategory) === filter)
    .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

  if (sorted.length === 0) return [];

  const earliestDate = sorted[0].transactionDate.slice(0, 10);
  const txByDate = new Map<string, Transaction[]>();
  const symbols = new Set<string>();
  const timelineDates = new Set<string>();

  for (const transaction of sorted) {
    const date = transaction.transactionDate.slice(0, 10);
    const symbol = transaction.assetSymbol.toUpperCase();
    symbols.add(symbol);
    timelineDates.add(date);
    const bucket = txByDate.get(date) ?? [];
    bucket.push(transaction);
    txByDate.set(date, bucket);
  }

  const historyCursors: Record<string, HistoricalPointCursor> = {};
  for (const symbol of symbols) {
    const points = (historyPricesMap[symbol] ?? [])
      .map(point => ({
        date: point.date,
        price: point.adjustedClose ?? point.close ?? 0,
      }))
      .filter(point => point.date >= earliestDate && Number.isFinite(point.price) && point.price > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (points.length > 0) {
      historyCursors[symbol] = { points, index: 0, lastPrice: null };
      for (const point of points) timelineDates.add(point.date);
    }
  }

  const timeline = [...timelineDates].sort((a, b) => a.localeCompare(b));
  if (timeline.length === 0) return [];

  const state: Record<string, { quantity: number; cost: number; lastTradePrice: number }> = {};
  const points: ChartPoint[] = [];
  let cumulativeBuy = 0;
  let cumulativeSell = 0;
  let realizedPnl = 0;

  for (const date of timeline) {
    const dayTransactions = txByDate.get(date) ?? [];
    let dailyBuy = 0;
    let dailySell = 0;
    for (const transaction of dayTransactions) {
      const symbol = transaction.assetSymbol.toUpperCase();
      const normalizedTradePrice = toUsd(transaction.price, transaction.currency, currencyRates);
      const side = normalizeType(transaction.type);
      const entry = state[symbol] ?? { quantity: 0, cost: 0, lastTradePrice: normalizedTradePrice };
      entry.lastTradePrice = normalizedTradePrice;

      if (side === "BUY") {
        entry.quantity += transaction.quantity;
        entry.cost += transaction.quantity * normalizedTradePrice;
        const amount = transaction.quantity * normalizedTradePrice;
        cumulativeBuy += amount;
        dailyBuy += amount;
      }
      if (side === "SELL") {
        const avgCost = entry.quantity > 0 ? entry.cost / entry.quantity : normalizedTradePrice;
        const soldQty = Math.min(transaction.quantity, Math.max(entry.quantity, 0));
        const soldCost = soldQty * avgCost;
        const amount = soldQty * normalizedTradePrice;
        cumulativeSell += amount;
        dailySell += amount;
        realizedPnl += amount - soldCost;
        entry.quantity = Math.max(0, entry.quantity - transaction.quantity);
        entry.cost = Math.max(0, entry.cost - soldCost);
      }

      state[symbol] = entry;
    }

    let value = 0;
    // Keep this series consistent with the live-mode chart: it is the cost
    // basis of the holdings that remain, not buy volume minus sell proceeds.
    const invested = Object.values(state).reduce((sum, item) => sum + Math.max(0, item.cost), 0);
    for (const symbol of symbols) {
      const entry = state[symbol];
      if (!entry || entry.quantity <= 0) continue;

      const cursor = historyCursors[symbol];
      if (cursor) {
        while (cursor.index < cursor.points.length && cursor.points[cursor.index].date <= date) {
          cursor.lastPrice = cursor.points[cursor.index].price;
          cursor.index += 1;
        }
      }
      if (cursor?.lastPrice != null) {
        value += entry.quantity * cursor.lastPrice;
      }
    }

    if (value > 0 || invested > 0 || dayTransactions.length > 0) {
      points.push({
        date,
        value,
        invested,
        pnl: value - invested + realizedPnl,
        buyTotal: cumulativeBuy,
        sellTotal: cumulativeSell,
        buyAmount: dailyBuy,
        sellAmount: dailySell,
        buyMarker: dailyBuy > 0 ? value : null,
        sellMarker: dailySell > 0 ? value : null,
      });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const lastPoint = points[points.length - 1];
  if (lastPoint && lastPoint.date !== today) {
    let value = 0;
    const invested = Object.values(state).reduce((sum, item) => sum + Math.max(0, item.cost), 0);
    for (const symbol of symbols) {
      const entry = state[symbol];
      if (!entry || entry.quantity <= 0) continue;
      const price = currentPrices[symbol] ?? historyCursors[symbol]?.lastPrice;
      if (price != null) value += entry.quantity * price;
    }
    points.push({
      date: today,
      value,
      invested,
      pnl: value - invested + realizedPnl,
      buyTotal: cumulativeBuy,
      sellTotal: cumulativeSell,
      buyAmount: 0,
      sellAmount: 0,
      buyMarker: null,
      sellMarker: null,
    });
  }

  return points;
}

function buildAnalytics(
  transactions: Transaction[],
  currentPrices: Record<string, number>,
  currencyRates: Record<string, number>,
  dataReady: boolean,
  range: RangeKey,
  filter: AssetFilter,
  historyPricesMap?: Record<string, Array<{ date: string; close: number | null; adjustedClose?: number | null }>>,
) {
  const sorted = [...transactions].sort((a, b) =>
    new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
  );
  const visible = sorted.filter(t => filter === "ALL" || assetType(t.assetSymbol, t.assetName, (t as any).category ?? (t as any).assetCategory) === filter);

  const state: Record<string, { quantity: number; cost: number; lifetimeCost: number; realizedPnl: number; name: string; type: AssetFilter; lastPrice: number; locked?: number }> = {};
  const points: ChartPoint[] = [];
  let totalBuy = 0;
  let totalSell = 0;
  let realizedPnl = 0;
  const historicalPoints = buildHistoricalChartPoints(transactions, currentPrices, currencyRates, filter, historyPricesMap);
  const historicalModeAvailable = historyPricesMap !== undefined;
  const useHistoricalPoints = historicalModeAvailable;

  for (const t of visible) {
    const symbol = t.assetSymbol.toUpperCase();
    const normalizedTradePrice = toUsd(t.price, t.currency, currencyRates);
    const entry = state[symbol] ?? {
      quantity: 0,
      cost: 0,
      lifetimeCost: 0,
      realizedPnl: 0,
      name: t.assetName || symbol,
      type: assetType(symbol, t.assetName, (t as any).category ?? (t as any).assetCategory),
      lastPrice: normalizedTradePrice,
    };
    const side = normalizeType(t.type);
    let executedSellQty = 0;
    entry.name = t.assetName || entry.name;
    entry.lastPrice = normalizedTradePrice;

    if (side === "BUY") {
      entry.quantity += t.quantity;
      entry.cost += t.quantity * normalizedTradePrice;
      entry.lifetimeCost += t.quantity * normalizedTradePrice;
      totalBuy += t.quantity * normalizedTradePrice;
    }
    if (side === "SELL") {
      const avgCost = entry.quantity > 0 ? entry.cost / entry.quantity : normalizedTradePrice;
      const soldQty = Math.min(t.quantity, entry.quantity);
      executedSellQty = soldQty;
      const soldCost = soldQty * avgCost;
      const sellPnl = soldQty * normalizedTradePrice - soldCost;
      entry.quantity -= soldQty;
      entry.cost = Math.max(0, entry.cost - soldCost);
      entry.realizedPnl += sellPnl;
      totalSell += soldQty * normalizedTradePrice;
      realizedPnl += sellPnl;
    }

    if (side === "STAKE") {
      // STAKE locks quantity but does not change holdings or cost basis
      entry.locked = (entry.locked ?? 0) + t.quantity;
      // do not modify entry.quantity or entry.cost
    }

    state[symbol] = entry;

    if (!useHistoricalPoints) {
      const { value, invested } = summarizeState(state);
      const date = t.transactionDate.slice(0, 10);
      const point = { date, value, invested, pnl: value - invested + realizedPnl, buyTotal: totalBuy, sellTotal: totalSell, buyAmount: side === 'BUY' ? t.quantity * normalizedTradePrice : 0, sellAmount: side === 'SELL' ? executedSellQty * normalizedTradePrice : 0, buyMarker: side === 'BUY' ? value : null, sellMarker: side === 'SELL' ? value : null };
      const last = points[points.length - 1];
      if (last?.date === date) points[points.length - 1] = point;
      else points.push(point);
    }
  }

  if (useHistoricalPoints) {
    points.push(...historicalPoints);
  }

  let positions: Position[] = Object.entries(state)
    .map(([symbol, item]) => {
      const quantity = Math.max(0, item.quantity);
      const hasRealtimePrice = symbol in currentPrices;
      const price = currentPrices[symbol] ?? item.lastPrice;
      const marketValue = quantity * price;
      const pnl = marketValue - item.cost;
      const totalPnl = pnl + item.realizedPnl;
      return {
        symbol,
        name: item.name,
        type: item.type,
        quantity,
        cost: item.cost,
        currentPrice: price,
        marketValue,
        pnl,
        realizedPnl: item.realizedPnl,
        totalPnl,
        returnPct: item.cost > 0 ? (pnl / item.cost) * 100 : 0,
        totalReturnPct: item.lifetimeCost > 0 ? (totalPnl / item.lifetimeCost) * 100 : 0,
        weight: 0,
        isStalePrice: !hasRealtimePrice,
      };
    });

  const marketValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
  positions = positions.map(position => ({
    ...position,
    weight: marketValue > 0 ? (position.marketValue / marketValue) * 100 : 0,
  }));
  const costBasis = positions.reduce((sum, p) => sum + p.cost, 0);
  const totalPnl = marketValue - costBasis + realizedPnl;
  // netTradingCashFlow represents net cash flow from trading (sell - buy).
  // NOTE: This is NOT the actual cash balance — integrate backend cash balance when available.
  const netTradingCashFlow = totalSell - totalBuy;

  if (dataReady && points.length > 0 && !useHistoricalPoints) {
    const today = new Date().toISOString().slice(0, 10);
    const currentPoint = { date: today, value: marketValue, invested: costBasis, pnl: totalPnl, buyTotal: totalBuy, sellTotal: totalSell, buyAmount: 0, sellAmount: 0, buyMarker: null, sellMarker: null };
    const lastPoint = points[points.length - 1];

    if (lastPoint.date === today) {
      points[points.length - 1] = currentPoint;
    } else if (lastPoint.value !== currentPoint.value || lastPoint.invested !== currentPoint.invested) {
      points.push(currentPoint);
    }
  }

  const rangeStart = getRangeStart(points, range);
  const firstVisibleIndex = rangeStart == null
    ? 0
    : points.findIndex(point => new Date(point.date).getTime() >= rangeStart);
  const basePoint = firstVisibleIndex > 0 ? points[firstVisibleIndex - 1] : null;
  const rangedPoints = filterByRange(points, range).map(point => ({
    ...point,
    buyTotal: Math.max(0, point.buyTotal - (basePoint?.buyTotal ?? 0)),
    sellTotal: Math.max(0, point.sellTotal - (basePoint?.sellTotal ?? 0)),
  }));
  const rangedTransactions = rangeStart == null
    ? visible
    : visible.filter(transaction => new Date(transaction.transactionDate).getTime() >= rangeStart);
  const todayPnl = rangedPoints.length > 1
    ? rangedPoints[rangedPoints.length - 1].value - rangedPoints[rangedPoints.length - 2].value
    : 0;

  // drawdown should be calculated on the ranged points visible to the user
  let peak = 0;
  let drawdown = 0;
  for (const point of rangedPoints) {
    peak = Math.max(peak, point.value);
    if (peak > 0) drawdown = Math.min(drawdown, ((point.value - peak) / peak) * 100);
  }

  const largestPosition = marketValue > 0 ? Math.max(0, ...positions.map(p => (p.marketValue / marketValue) * 100)) : 0;
  const exposure = marketValue + netTradingCashFlow > 0 ? (marketValue / (marketValue + netTradingCashFlow)) * 100 : 0;
  const allocation = positions.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + p.marketValue;
    return acc;
  }, {});
  if (netTradingCashFlow > 0) allocation.CASH = (allocation.CASH ?? 0) + netTradingCashFlow;

  const allocationData = Object.entries(allocation)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const winLoss = positions.filter(p => Math.abs(p.returnPct) > 0.01);
  const wins = winLoss.filter(p => p.returnPct > 0);
  const losses = winLoss.filter(p => p.returnPct < 0);
  const positivePnl = wins.reduce((sum, p) => sum + p.pnl, 0);
  const negativePnl = Math.abs(losses.reduce((sum, p) => sum + p.pnl, 0));

  const rangedTotalBuy = rangedTransactions.reduce((sum, transaction) => {
    if (normalizeType(transaction.type) !== "BUY") return sum;
    return sum + toUsd(transaction.quantity * transaction.price, transaction.currency, currencyRates);
  }, 0);
  const rangedTotalSell = rangedTransactions.reduce((sum, transaction) => {
    if (normalizeType(transaction.type) !== "SELL") return sum;
    return sum + toUsd(transaction.quantity * transaction.price, transaction.currency, currencyRates);
  }, 0);

  return {
    points: rangedPoints,
    positions,
    allocationData,
    topMovers: [...positions].sort((a, b) => b.returnPct - a.returnPct),
    metrics: {
      marketValue,
      todayPnl,
      totalPnl,
      totalReturnPct: costBasis > 0 ? (totalPnl / costBasis) * 100 : 0,
      totalBuy: rangedTotalBuy,
      totalSell: rangedTotalSell,
      netTradingCashFlow: rangedTotalSell - rangedTotalBuy,
      trades: rangedTransactions.length,
      winRate: winLoss.length ? (wins.length / winLoss.length) * 100 : 0,
      avgWin: wins.length ? wins.reduce((sum, p) => sum + p.returnPct, 0) / wins.length : 0,
      avgLoss: losses.length ? losses.reduce((sum, p) => sum + p.returnPct, 0) / losses.length : 0,
      profitFactor: negativePnl > 0 ? positivePnl / negativePnl : positivePnl > 0 ? positivePnl : 0,
      drawdown,
      exposure,
      largestPosition,
    },
  };
}

function KpiCard({ label, value, badge, icon: Icon, hero = false, positive = true, neutral = false, description, metricBar, className = "" }: {
  label: string;
  value: string;
  badge?: string;
  icon: typeof DollarSign;
  hero?: boolean;
  positive?: boolean;
  neutral?: boolean;
  description?: string;
  className?: string;
  metricBar?: {
    leftLabel: string;
    rightLabel: string;
    leftValue: number;
    rightValue: number;
  };
}) {
  const totalBarValue = (metricBar?.leftValue ?? 0) + (metricBar?.rightValue ?? 0);
  const leftPct = totalBarValue > 0 ? ((metricBar?.leftValue ?? 0) / totalBarValue) * 100 : 0;

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }} className={className}>
      <Card className={`h-full antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all shadow-xl ${hero ? "min-h-[150px]" : "min-h-[150px]"}`}>
        <CardHeader className="flex-row items-start justify-between pb-2">
          <div>
            <CardDescription className="text-xs uppercase tracking-wide text-slate-500">{label}</CardDescription>
            <CardTitle className={`${hero ? "mt-4 text-4xl" : "mt-3 text-2xl"} tracking-tight ${neutral ? "text-slate-400" : label === "Portfolio Value" ? "text-blue-400" : "text-white"}`}>{value}</CardTitle>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-950/80 p-2 text-cyan-300">
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {badge && (
            <Badge variant={neutral ? "secondary" : positive ? "default" : "destructive"} className={neutral ? "bg-slate-500/15 text-slate-400" : positive ? "bg-emerald-500/15 text-emerald-300" : ""}>
              {badge}
            </Badge>
          )}
          {metricBar && (
            <div className="mt-3 space-y-2">
              <div className="h-3 overflow-hidden rounded-full border border-white/5 bg-slate-950/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 transition-all"
                  style={{ width: `${leftPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                <span>{metricBar.leftLabel}</span>
                <span>{metricBar.rightLabel}</span>
              </div>
            </div>
          )}
          {description && (
            <p className="mt-1.5 text-xs text-slate-500 leading-snug">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PortfolioChart({
  transactions,
  currentPrices,
  currencyRates,
  dataReady,
  historyPricesMap,
  historyPricesLoaded = false,
}: Props) {
  const { theme, setTheme, themes, textClass } = useTableTheme();
  const [range, setRange] = useState<RangeKey>("ALL");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("ALL");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const analytics = useMemo(
    () => buildAnalytics(transactions, currentPrices, currencyRates, dataReady, range, assetFilter, historyPricesMap),
    [transactions, currentPrices, currencyRates, dataReady, range, assetFilter, historyPricesMap]
  );

  if (transactions.length === 0) return null;

  const { metrics, points, allocationData, topMovers } = analytics;
  const totalPositive = metrics.totalPnl >= 0;
  const winners = topMovers.slice(0, 3);
  const losers = topMovers.slice(-3).reverse();
  const visibleStart = points[0]?.date;
  const visibleEnd = points[points.length - 1]?.date;
  const assetFilterLabel = ASSET_FILTERS.find((item) => item.key === assetFilter)?.label ?? "All";
  const allocationTotal = allocationData.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="mb-8 space-y-6">
      <Card className="antigravity-panel overflow-hidden border-white/5 bg-white/[0.02] shadow-2xl">
        <CardHeader className="border-b border-white/5 bg-white/[0.015] pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-white">Portfolio Snapshot</CardTitle>
            <CardDescription>A compact read on value, performance and trading flow.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/10 bg-white/5 text-slate-200">{formatRangeLabel(range)}</Badge>
            <Badge className="border-white/10 bg-white/5 text-slate-200">{assetFilterLabel}</Badge>
            <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200">{metrics.trades.toLocaleString("en-US")} trades</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
            <KpiCard className="xl:col-span-4" hero label="Portfolio Value" value={formatCompact(metrics.marketValue)} badge={formatPct(metrics.totalReturnPct)} icon={BriefcaseBusiness} positive={totalPositive} neutral={metrics.marketValue === 0} />
            <KpiCard className="xl:col-span-4" label="Total Return" value={formatCompact(metrics.totalPnl)} badge={formatPct(metrics.totalReturnPct)} icon={Percent} positive={totalPositive} neutral={metrics.totalPnl === 0} description="Unrealized plus realized performance." />
            <KpiCard className="xl:col-span-4" label="Period Change" value={`${metrics.todayPnl >= 0 ? "+" : ""}${formatCompact(metrics.todayPnl)}`} icon={metrics.todayPnl >= 0 ? TrendingUp : TrendingDown} positive={metrics.todayPnl >= 0} neutral={metrics.todayPnl === 0} description={`${formatRangeLabel(range)} move in portfolio value.`} />
            <KpiCard
              className="xl:col-span-6"
              label="Net Trading Cash Flow"
              value={formatCompact(metrics.netTradingCashFlow)}
              icon={Banknote}
              positive={metrics.netTradingCashFlow >= 0}
              neutral={metrics.netTradingCashFlow === 0}
              metricBar={{
                leftLabel: `Buy ${formatCompact(metrics.totalBuy)}`,
                rightLabel: `Sell ${formatCompact(metrics.totalSell)}`,
                leftValue: Math.abs(metrics.totalBuy),
                rightValue: Math.abs(metrics.totalSell),
              }}
              description="Sell proceeds minus buy spend. Cash movement only, not profit."
            />
            <KpiCard className="xl:col-span-3" label="Gross Buy Volume" value={formatCompact(metrics.totalBuy)} icon={TrendingDown} positive={false} neutral={metrics.totalBuy === 0} description="Total cash deployed into buys." />
            <KpiCard className="xl:col-span-3" label="Gross Sell Volume" value={formatCompact(metrics.totalSell)} icon={TrendingUp} positive={true} neutral={metrics.totalSell === 0} description="Total cash recovered from sells." />
          </motion.div>
        </CardContent>
      </Card>

      <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <LineChart className="h-5 w-5 text-cyan-300" />
              Portfolio Curve
            </CardTitle>
              <CardDescription>Market value, P&L, cost basis, and buy/sell activity.</CardDescription>
          </div>
          <Tabs value={range} onValueChange={value => setRange(value as RangeKey)}>
            <TabsList className="bg-slate-950/80">
              {RANGES.map(item => <TabsTrigger key={item.key} value={item.key}>{item.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={assetFilter} onValueChange={value => setAssetFilter(value as AssetFilter)}>
            <TabsList className="flex h-auto flex-wrap bg-slate-950/80">
              {ASSET_FILTERS.map(item => <TabsTrigger key={item.key} value={item.key}>{item.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Badge className="border-white/10 bg-white/[0.03] text-slate-200">
              Window {formatShortDate(visibleStart)} - {formatShortDate(visibleEnd)}
            </Badge>
            <Badge className="border-white/10 bg-white/[0.03] text-slate-200">
              Filter {assetFilterLabel}
            </Badge>
          </div>

          <div className="h-[360px]">
            {!dataReady ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-white/5 bg-slate-950/40 text-sm text-slate-400">
                Loading the live portfolio curve...
              </div>
            ) : range === "ALL" && assetFilter === "ALL" && historyPricesLoaded && Object.values(historyPricesMap ?? {}).every(points => !points || points.length === 0) ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-amber-400/10 bg-amber-500/5 px-6 text-center text-sm text-amber-200">
                Historical price data is unavailable, so this curve cannot be rebuilt for the full portfolio view.
              </div>
            ) : mounted && (
              <AutoSizedChart>
                <AreaChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portfolioValueGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="2 6" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={72} tickFormatter={value => formatCompact(Number(value))} />
                  <Tooltip
                    cursor={{ stroke: "#38bdf8", strokeOpacity: 0.35 }}
                    content={<ChartTooltip labelFormatter={formatShortDate} valueFormatter={(value) => formatCompact(Number(value ?? 0))} />}
                  />
                  <Area type="linear" dataKey="invested" name="Cost Basis" stroke="#64748b" strokeWidth={1.5} fill="transparent" dot={false} isAnimationActive animationDuration={650} />
                  <Line type="linear" dataKey="buyTotal" name="Cumulative Buy" stroke="#f97316" strokeWidth={1.5} strokeDasharray="5 5" dot={false} isAnimationActive animationDuration={650} />
                  <Line type="linear" dataKey="sellTotal" name="Cumulative Sell" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 5" dot={false} isAnimationActive animationDuration={650} />
                  <Line type="linear" dataKey="pnl" name="Profit / Loss" stroke="#a78bfa" strokeWidth={1.75} dot={false} isAnimationActive animationDuration={650} />
                  <Area type="linear" dataKey="value" name="Portfolio Value" stroke="#38bdf8" strokeWidth={2.5} fill="url(#portfolioValueGradient)" dot={false} activeDot={{ r: 5 }} isAnimationActive animationDuration={750} />
                  <Line type="linear" dataKey="buyMarker" name="Buy marker" stroke="transparent" dot={{ r: 4, fill: '#10b981', stroke: '#052e16', strokeWidth: 1.5 }} activeDot={false} connectNulls={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="sellMarker" name="Sell marker" stroke="transparent" dot={{ r: 4, fill: '#fb7185', stroke: '#4c0519', strokeWidth: 1.5 }} activeDot={false} connectNulls={false} isAnimationActive={false} />
                </AreaChart>
              </AutoSizedChart>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-300" /> Portfolio Value</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-500" /> Cost Basis</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-400" /> Cumulative Buy</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Cumulative Sell</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-400" /> Profit / Loss</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Buy marker</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-400" /> Sell marker</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Current market value by asset type.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="h-[220px]">
              {mounted && (
                <AutoSizedChart>
                  <PieChart>
                    <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86}>
                      {allocationData.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip valueFormatter={(value) => formatCompact(Number(value ?? 0))} />} />
                  </PieChart>
                </AutoSizedChart>
              )}
            </div>
            <div className="space-y-3 self-center">
              {allocationData.map((item, index) => {
                const pct = allocationTotal > 0 ? (item.value / allocationTotal) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      {item.name}
                    </span>
                    <span className="font-medium text-white">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
          <CardHeader>
            <CardTitle>Risk & Trade Quality</CardTitle>
            <CardDescription>Concentration, drawdown and execution stats.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Drawdown", formatPct(metrics.drawdown), metrics.drawdown < -10],
                ["Exposure", `${metrics.exposure.toFixed(1)}%`, metrics.exposure > 85],
                ["Largest", `${metrics.largestPosition.toFixed(1)}%`, metrics.largestPosition > 30],
              ].map(([label, value, risk]) => (
                <Card key={label as string} className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all" size="sm">
                  <CardHeader>
                    <CardDescription>{label as string}</CardDescription>
                    <CardTitle className={risk ? "text-red-300" : "text-emerald-300"}>{value as string}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["Win Rate", `${metrics.winRate.toFixed(1)}%`],
                ["Avg Win", formatPct(metrics.avgWin)],
                ["Avg Loss", formatPct(metrics.avgLoss)],
                ["Profit Factor", metrics.profitFactor.toFixed(2)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-100">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
        <CardHeader>
          <CardTitle>Top Winners / Top Losers</CardTitle>
          <CardDescription>Best and worst current positions by return.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[["Top Winners", winners], ["Top Losers", losers]].map(([title, rows]) => (
            <div key={title as string} className="antigravity-panel p-4 border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{title as string}</p>
              {(rows as Position[]).length === 0 ? (
                <p className="text-sm text-slate-500">Not enough data.</p>
              ) : (
                <div className="space-y-3">
                  {(rows as Position[]).map(row => (
                    <div key={`${title}-${row.symbol}`} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{row.symbol}</p>
                        <p className="text-xs text-slate-500">{row.name}</p>
                      </div>
                      <Badge variant={row.returnPct >= 0 ? "default" : "destructive"} className={row.returnPct >= 0 ? "bg-emerald-500/15 text-emerald-300" : ""}>
                        {formatPct(row.returnPct)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#0B0F19]">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              Current Holdings
              <Badge className="text-blue-400 bg-blue-500/10 border-blue-500/20">{analytics.positions.length}</Badge>
            </CardTitle>
            <CardDescription>Active assets sorted by market value.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Table Accent Color Picker */}
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/40 px-4 py-3 rounded-xl border border-white/5 gap-3 mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-normal min-w-[120px] break-words">Màu chủ đạo của bảng:</span>
            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              {themes.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setTheme(t.name)}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    theme === t.name ? "scale-125 border-white ring-2 ring-white/20" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: t.hex }}
                  title={t.name}
                />
              ))}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                {["Symbol", "Asset", "Qty", "Avg Cost", "Current", "Market Value", "Weight", "Unrealized", "Realized", "Total P/L", "Total Return"].map(head => (
                  <TableHead key={head} className={`${textClass} font-bold ${head === "Symbol" || head === "Asset" ? "" : "text-right"}`}>{head}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...analytics.positions].sort((a, b) => b.marketValue - a.marketValue).map(position => {
                const avgCost = position.quantity > 0 ? position.cost / position.quantity : 0;
                const negative = position.pnl < 0;
                const realizedNegative = position.realizedPnl < 0;
                const totalNegative = position.totalPnl < 0;
                return (
                  <TableRow key={position.symbol} className="border-white/10 hover:bg-white/[0.04]">
                    <TableCell className={`font-semibold ${textClass}`}>
                      <span className="flex items-center gap-1.5">
                        {position.symbol}
                        {position.isStalePrice && (
                          <span
                            title="Không lấy được giá thị trường real-time, đang dùng giá giao dịch gần nhất"
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 cursor-help"
                          >
                            Giá cũ
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className={`max-w-[220px] truncate ${textClass}`}>{position.name}</TableCell>
                    <TableCell className={`min-w-[150px] whitespace-normal min-w-[120px] break-words text-right font-mono tabular-nums ${textClass}`} title={String(position.quantity)}>{formatQuantity(position.quantity)}</TableCell>
                    <TableCell className={`text-right ${textClass}`}>{formatCompact(avgCost)}</TableCell>
                    <TableCell className={`text-right ${textClass}`}>{formatCompact(position.currentPrice)}</TableCell>
                    <TableCell className={`text-right font-medium ${textClass}`}>{formatCompact(position.marketValue)}</TableCell>
                    <TableCell className={`text-right ${textClass}`}>{position.weight.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={negative ? "destructive" : "default"} className={negative ? "" : "bg-emerald-500/15 text-emerald-300"}>
                        {position.pnl >= 0 ? "+" : ""}{formatCompact(position.pnl)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={realizedNegative ? "destructive" : "default"} className={realizedNegative ? "" : "bg-emerald-500/15 text-emerald-300"}>
                        {position.realizedPnl >= 0 ? "+" : ""}{formatCompact(position.realizedPnl)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={totalNegative ? "destructive" : "default"} className={totalNegative ? "" : "bg-emerald-500/15 text-emerald-300"}>
                        {position.totalPnl >= 0 ? "+" : ""}{formatCompact(position.totalPnl)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={position.totalReturnPct < 0 ? "destructive" : "default"} className={position.totalReturnPct < 0 ? "" : "bg-emerald-500/15 text-emerald-300"}>
                        {formatPct(position.totalReturnPct)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
