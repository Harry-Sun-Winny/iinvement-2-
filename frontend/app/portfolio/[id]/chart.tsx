"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Banknote, BriefcaseBusiness, DollarSign, LineChart, Percent, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Transaction } from "../../lib/api";

interface Props {
  transactions: Transaction[];
  currentPrices: Record<string, number>;
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

function formatQuantity(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 20,
  });
}

// Heuristic guess - không chính xác 100%, nên thay bằng field category từ backend.
// Ví dụ: công ty tên chứa "USD" sẽ bị nhận nhầm là CASH.
// TODO: Khi backend Transaction có field category/assetCategory, ưu tiên dùng field đó.
function assetType(symbol: string, name = "", backendCategory?: string): AssetFilter {
  // Ưu tiên dùng category từ backend nếu có
  if (backendCategory) {
    const normalized = backendCategory.toUpperCase().trim();
    const validTypes: AssetFilter[] = ["STOCKS", "ETF", "CRYPTO", "BONDS", "CASH"];
    if (validTypes.includes(normalized as AssetFilter)) return normalized as AssetFilter;
  }
  // Fallback: regex heuristic guess
  const text = `${symbol} ${name}`.toUpperCase();
  if (/(BTC|ETH|SOL|BNB|USDT|USDC|XRP|ADA|DOGE)/.test(text)) return "CRYPTO";
  if (/(ETF|SPY|QQQ|VOO|VTI|IWM|DIA)/.test(text)) return "ETF";
  if (/(BOND|TBILL|TREASURY|NOTE)/.test(text)) return "BONDS";
  if (/(CASH|USD|VND)/.test(text)) return "CASH";
  return "STOCKS";
}

function formatCompact(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) return `${sign}$${(abs / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function filterByRange(points: ChartPoint[], range: RangeKey) {
  const days = RANGES.find(r => r.key === range)?.days;
  if (!days || points.length < 2) return points;
  const lastDate = new Date(points[points.length - 1].date).getTime();
  const start = lastDate - days * 24 * 60 * 60 * 1000;
  const filtered = points.filter(p => new Date(p.date).getTime() >= start);
  return filtered.length ? filtered : points.slice(-1);
}

function buildAnalytics(transactions: Transaction[], currentPrices: Record<string, number>, range: RangeKey, filter: AssetFilter) {
  const sorted = [...transactions].sort((a, b) =>
    new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
  );
  const visible = sorted.filter(t => filter === "ALL" || assetType(t.assetSymbol, t.assetName, (t as any).category ?? (t as any).assetCategory) === filter);

  const state: Record<string, { quantity: number; cost: number; lifetimeCost: number; realizedPnl: number; name: string; type: AssetFilter; lastPrice: number; locked?: number }> = {};
  const points: ChartPoint[] = [];
  let totalBuy = 0;
  let totalSell = 0;
  let realizedPnl = 0;
  let runningMarketValueAtLastPrice = 0;
  let runningCostBasis = 0;

  for (const t of visible) {
    const symbol = t.assetSymbol.toUpperCase();
    const entry = state[symbol] ?? {
      quantity: 0,
      cost: 0,
      lifetimeCost: 0,
      realizedPnl: 0,
      name: t.assetName || symbol,
      type: assetType(symbol, t.assetName, (t as any).category ?? (t as any).assetCategory),
      lastPrice: t.price,
    };
    const side = normalizeType(t.type);
    const previousMarketValue = Math.max(0, entry.quantity) * entry.lastPrice;
    const previousCostBasis = entry.cost;
    entry.name = t.assetName || entry.name;
    entry.lastPrice = t.price;

    if (side === "BUY") {
      entry.quantity += t.quantity;
      entry.cost += t.quantity * t.price;
      entry.lifetimeCost += t.quantity * t.price;
      totalBuy += t.quantity * t.price;
    }
    if (side === "SELL") {
      const avgCost = entry.quantity > 0 ? entry.cost / entry.quantity : t.price;
      const soldCost = Math.min(t.quantity, entry.quantity) * avgCost;
      const sellPnl = t.quantity * t.price - soldCost;
      entry.quantity -= t.quantity;
      entry.cost = Math.max(0, entry.cost - soldCost);
      entry.realizedPnl += sellPnl;
      totalSell += t.quantity * t.price;
      realizedPnl += sellPnl;
    }

    if (side === "STAKE") {
      // STAKE locks quantity but does not change holdings or cost basis
      entry.locked = (entry.locked ?? 0) + t.quantity;
      // do not modify entry.quantity or entry.cost
    }

    state[symbol] = entry;

    runningMarketValueAtLastPrice += Math.max(0, entry.quantity) * entry.lastPrice - previousMarketValue;
    runningCostBasis += entry.cost - previousCostBasis;
    const value = runningMarketValueAtLastPrice;
    const invested = runningCostBasis;
    const date = t.transactionDate.slice(0, 10);
    const point = { date, value, invested, pnl: value - invested + realizedPnl };
    const last = points[points.length - 1];
    if (last?.date === date) points[points.length - 1] = point;
    else points.push(point);
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

  const today = new Date().toISOString().slice(0, 10);
  if (points.length && points[points.length - 1].date !== today) {
    points.push({ date: today, value: marketValue, invested: costBasis, pnl: totalPnl });
  }

  const rangedPoints = filterByRange(points, range);
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

  const allocationData = Object.entries(allocation).filter(([, value]) => value > 0).map(([name, value]) => ({ name, value }));
  const winLoss = positions.filter(p => Math.abs(p.returnPct) > 0.01);
  const wins = winLoss.filter(p => p.returnPct > 0);
  const losses = winLoss.filter(p => p.returnPct < 0);
  const positivePnl = wins.reduce((sum, p) => sum + p.pnl, 0);
  const negativePnl = Math.abs(losses.reduce((sum, p) => sum + p.pnl, 0));

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
      netTradingCashFlow,
      trades: visible.length,
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

function KpiCard({ label, value, badge, icon: Icon, hero = false, positive = true, neutral = false, description }: {
  label: string;
  value: string;
  badge?: string;
  icon: typeof DollarSign;
  hero?: boolean;
  positive?: boolean;
  neutral?: boolean;
  description?: string;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <Card className={`border-white/10 bg-white/[0.035] shadow-xl shadow-black/10 ${hero ? "min-h-[164px]" : "min-h-[132px]"}`}>
        <CardHeader className="flex-row items-start justify-between pb-2">
          <div>
            <CardDescription className="text-xs uppercase tracking-wide text-slate-500">{label}</CardDescription>
            <CardTitle className={`${hero ? "mt-4 text-4xl" : "mt-3 text-2xl"} tracking-tight ${neutral ? "text-slate-400" : "text-white"}`}>{value}</CardTitle>
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
          {description && (
            <p className="mt-1.5 text-xs text-slate-500 leading-snug">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PortfolioChart({ transactions, currentPrices }: Props) {
  const [range, setRange] = useState<RangeKey>("ALL");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("ALL");

  const analytics = useMemo(
    () => buildAnalytics(transactions, currentPrices, range, assetFilter),
    [transactions, currentPrices, range, assetFilter]
  );

  if (transactions.length === 0) return null;

  const { metrics, points, allocationData, topMovers } = analytics;
  const totalPositive = metrics.totalPnl >= 0;
  const winners = topMovers.slice(0, 3);
  const losers = topMovers.slice(-3).reverse();

  return (
    <section className="mb-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
        <KpiCard hero label="Portfolio Value" value={formatCompact(metrics.marketValue)} badge={formatPct(metrics.totalReturnPct)} icon={BriefcaseBusiness} positive={totalPositive} neutral={metrics.marketValue === 0} />
        <KpiCard label="Total Return" value={formatCompact(metrics.totalPnl)} badge={formatPct(metrics.totalReturnPct)} icon={Percent} positive={totalPositive} neutral={metrics.totalPnl === 0} description="Unrealized + realized gains" />
        <KpiCard label={`P/L (${range})`} value={`${metrics.todayPnl >= 0 ? "+" : ""}${formatCompact(metrics.todayPnl)}`} icon={metrics.todayPnl >= 0 ? TrendingUp : TrendingDown} positive={metrics.todayPnl >= 0} neutral={metrics.todayPnl === 0} description={`Change in portfolio value over ${range}`} />
        <KpiCard label="Net Trading Cash Flow" value={formatCompact(metrics.netTradingCashFlow)} icon={Banknote} positive={metrics.netTradingCashFlow >= 0} neutral={metrics.netTradingCashFlow === 0} description="Cash spent on buys vs. received from sells. Not profit/loss." />
        <KpiCard label="Total Transactions" value={metrics.trades.toLocaleString("en-US")} icon={Activity} description="Buy, sell, swap & stake orders" />
      </motion.div>

      <Card className="border-white/10 bg-white/[0.035]">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <LineChart className="h-5 w-5 text-cyan-300" />
              Portfolio Value Over Time
            </CardTitle>
            <CardDescription>Equity curve, invested capital and portfolio value in one clean view.</CardDescription>
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

          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
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
                  contentStyle={{ background: "#020617", border: "1px solid rgba(148,163,184,.2)", borderRadius: 12, color: "#e2e8f0" }}
                  formatter={(value, name) => [formatCompact(Number(value ?? 0)), name === "value" ? "Portfolio Value" : name === "invested" ? "Invested" : "P/L"]}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Area type="monotone" dataKey="invested" name="Invested" stroke="#64748b" strokeWidth={1.5} fill="transparent" dot={false} isAnimationActive animationDuration={650} />
                <Area type="monotone" dataKey="value" name="Portfolio Value" stroke="#38bdf8" strokeWidth={2.5} fill="url(#portfolioValueGradient)" dot={false} activeDot={{ r: 5 }} isAnimationActive animationDuration={750} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-300" /> Portfolio Value</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-500" /> Invested Capital</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card className="border-white/10 bg-white/[0.035]">
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Current market value by asset type.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86}>
                    {allocationData.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(148,163,184,.2)", borderRadius: 12 }} formatter={value => formatCompact(Number(value ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 self-center">
              {allocationData.map((item, index) => {
                const pct = metrics.marketValue + metrics.netTradingCashFlow > 0 ? (item.value / (metrics.marketValue + metrics.netTradingCashFlow)) * 100 : 0;
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

        <Card className="border-white/10 bg-white/[0.035]">
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
                <Card key={label as string} className="border-white/10 bg-slate-950/70" size="sm">
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
                <div key={label} className="flex justify-between rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-100">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/[0.035]">
        <CardHeader>
          <CardTitle>Top Winners / Top Losers</CardTitle>
          <CardDescription>Best and worst current positions by return.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[["Top Winners", winners], ["Top Losers", losers]].map(([title, rows]) => (
            <div key={title as string} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
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

      <Card className="border-white/10 bg-white/[0.035]">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Current Holdings</CardTitle>
            <CardDescription>{analytics.positions.length} active assets sorted by market value.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                {["Symbol", "Asset", "Qty", "Avg Cost", "Current", "Market Value", "Weight", "Unrealized", "Realized", "Total P/L", "Total Return"].map(head => (
                  <TableHead key={head} className={head === "Symbol" || head === "Asset" ? "" : "text-right"}>{head}</TableHead>
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
                    <TableCell className="font-semibold text-white">
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
                    <TableCell className="max-w-[220px] truncate text-slate-300">{position.name}</TableCell>
                    <TableCell className="min-w-[150px] whitespace-nowrap text-right font-mono tabular-nums text-slate-300" title={String(position.quantity)}>{formatQuantity(position.quantity)}</TableCell>
                    <TableCell className="text-right text-slate-300">{formatCompact(avgCost)}</TableCell>
                    <TableCell className="text-right text-slate-300">{formatCompact(position.currentPrice)}</TableCell>
                    <TableCell className="text-right font-medium text-white">{formatCompact(position.marketValue)}</TableCell>
                    <TableCell className="text-right text-slate-300">{position.weight.toFixed(1)}%</TableCell>
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
