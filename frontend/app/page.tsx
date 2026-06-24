"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Bot,
  CalendarDays,
  Download,
  Eye,
  FilePlus,
  LogOut,
  Newspaper,
  Plus,
  RefreshCw,
  ShieldAlert,
  Target,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ApiError,
  createGoal,
  createPortfolio,
  createWatchlist,
  deleteGoal,
  deletePortfolio,
  deleteWatchlist,
  getGoals,
  getPortfolios,
  getStockPrice,
  getTransactions,
  getWatchlistItems,
  getWatchlists,
  Goal,
  Portfolio,
  Watchlist,
} from "./lib/api";

type Tab = "portfolios" | "watchlists" | "goals" | "news";
type ModalType = "portfolio" | "watchlist" | "goal" | null;

interface NewsItem {
  symbol: string;
  source: string;
  title: string;
  summary?: string;
  url: string;
  publishedAt: string;
}

interface DashboardPosition {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number | null;
  marketValue: number | null;
  todayPnl: number | null;
  pnl: number | null;
  returnPct: number | null;
  portfolioId: string;
  portfolioName: string;
  assetType: string;
}

interface PortfolioStat {
  id: string;
  value: number | null;
  pnl: number | null;
  returnPct: number | null;
}

interface PerformancePoint {
  label: string;
  value: number;
}

interface DashboardCache {
  portfolios: Portfolio[];
  watchlists: Watchlist[];
  goals: Goal[];
  positions: DashboardPosition[];
  portfolioStats: Record<string, PortfolioStat>;
  performance: PerformancePoint[];
  savedAt: number;
}

const DASHBOARD_CACHE_KEY = "investment-dashboard-cache-v1";

function readDashboardCache(): DashboardCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardCache;
    if (!Array.isArray(parsed.portfolios) || !Array.isArray(parsed.positions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDashboardCache(cache: DashboardCache) {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache quota/private-mode failures; backend remains source of truth.
  }
}

const chartColors = ["#ff6b6b", "#ff9f43", "#feca57", "#0abf53", "#54a0ff", "#5f27cd", "#c44dff"];

const fmtMoney = (value: number | null | undefined) =>
  value == null ? "N/A" : `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const fmtSignedMoney = (value: number | null | undefined) =>
  value == null ? "N/A" : `${value >= 0 ? "+" : ""}${fmtMoney(value)}`;

const fmtPct = (value: number | null | undefined) =>
  value == null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const fmtQuantity = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 20,
  });
};

const navItems = [
  { id: "portfolios" as const, label: "Dashboard", Icon: BarChart3 },
  { id: "watchlists" as const, label: "Watchlist", Icon: Eye },
  { id: "goals" as const, label: "Goals", Icon: Target },
  { id: "news" as const, label: "News", Icon: Newspaper },
];

export default function Page() {
  const [isClient, setIsClient] = useState(false);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [active, setActive] = useState<Tab>("portfolios");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<DashboardPosition[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<Record<string, PortfolioStat>>({});
  const [performance, setPerformance] = useState<PerformancePoint[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [portfolioForm, setPortfolioForm] = useState({ name: "", currency: "USD", type: "STOCKS" });
  const [watchlistName, setWatchlistName] = useState("");
  const [goalForm, setGoalForm] = useState({ name: "", amount: "", currency: "USD", date: "2030-01-01" });

  useEffect(() => {
    setIsClient(true);
    if (!localStorage.getItem("token")) {
      window.location.href = "/login";
      return;
    }

    const cache = readDashboardCache();
    if (cache) {
      setPortfolios(cache.portfolios);
      setWatchlists(cache.watchlists);
      setGoals(cache.goals);
      setPositions(cache.positions);
      setPortfolioStats(cache.portfolioStats);
      setPerformance(cache.performance);
      setLoading(false);
    }

    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [portfolioData, watchlistData, goalData] = await Promise.all([getPortfolios(), getWatchlists(), getGoals()]);
      const existingCache = readDashboardCache();
      if (portfolioData.length === 0 && existingCache?.portfolios?.length) {
        setError("Backend đang trả dữ liệu trống nên dashboard tạm giữ số liệu cache gần nhất.");
        return;
      }
      const dashboardData = await loadDashboardData(portfolioData);
      setPortfolios(portfolioData);
      setWatchlists(watchlistData);
      setGoals(goalData);
      setPositions(dashboardData.positions);
      setPortfolioStats(dashboardData.portfolioStats);
      setPerformance(dashboardData.performance);
      writeDashboardCache({
        portfolios: portfolioData,
        watchlists: watchlistData,
        goals: goalData,
        positions: dashboardData.positions,
        portfolioStats: dashboardData.portfolioStats,
        performance: dashboardData.performance,
        savedAt: Date.now(),
      });
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }
      setError(e.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboardData(portfolioData: Portfolio[]) {
    const nextPositions: DashboardPosition[] = [];
    const nextStats: Record<string, PortfolioStat> = {};
    const timeline = new Map<string, number>();

    await Promise.all(
      portfolioData.map(async portfolio => {
        try {
          const transactions = await getTransactions(portfolio.id);
          const holdings: Record<string, { name: string; qty: number; cost: number }> = {};

          transactions.forEach((tx: any) => {
            const symbol = String(tx.assetSymbol || "").toUpperCase();
            if (!symbol) return;

            const quantity = Number(tx.quantity || 0);
            const price = Number(tx.price || 0);
            const side = String(tx.type || "").toUpperCase();
            const dateKey = String(tx.transactionDate || tx.date || tx.createdAt || "").slice(0, 10);

            if (!holdings[symbol]) holdings[symbol] = { name: tx.assetName || symbol, qty: 0, cost: 0 };
            if (dateKey) timeline.set(dateKey, (timeline.get(dateKey) || 0) + (side === "SELL" ? -quantity * price : quantity * price));

            if (side === "BUY") {
              holdings[symbol].qty += quantity;
              holdings[symbol].cost += quantity * price;
            }

            if (side === "SELL") {
              const avg = holdings[symbol].qty > 0 ? holdings[symbol].cost / holdings[symbol].qty : price;
              holdings[symbol].qty -= quantity;
              holdings[symbol].cost = Math.max(0, holdings[symbol].cost - avg * quantity);
            }
          });

          const priced = await Promise.all(
            Object.entries(holdings)
              .filter(([, item]) => item.qty > 0)
              .map(async ([symbol, item]) => {
                let currentPrice: number | null = null;
                let todayPnl: number | null = null;

                try {
                  const quote = await getStockPrice(symbol);
                  if (typeof quote?.price === "number" && Number.isFinite(quote.price)) currentPrice = quote.price;
                  if (typeof quote?.change === "number" && Number.isFinite(quote.change)) todayPnl = item.qty * quote.change;
                } catch { }

                const avgCost = item.cost / item.qty;
                const displayPrice = currentPrice ?? avgCost;
                const marketValue = item.qty * displayPrice;
                const pnl = currentPrice == null ? 0 : marketValue - item.cost;

                return {
                  symbol,
                  name: item.name,
                  quantity: item.qty,
                  avgCost,
                  currentPrice,
                  marketValue,
                  todayPnl,
                  pnl,
                  returnPct: item.cost <= 0 ? 0 : (pnl / item.cost) * 100,
                  portfolioId: portfolio.id,
                  portfolioName: portfolio.name,
                  assetType: portfolio.type || "OTHER",
                };
              })
          );

          nextPositions.push(...priced);
          const value = priced.length ? priced.reduce((sum, item) => sum + (item.marketValue || 0), 0) : null;
          const pnl = priced.length ? priced.reduce((sum, item) => sum + (item.pnl || 0), 0) : null;
          const cost = priced.reduce((sum, item) => sum + item.quantity * item.avgCost, 0);
          nextStats[portfolio.id] = { id: portfolio.id, value, pnl, returnPct: pnl == null || cost <= 0 ? null : (pnl / cost) * 100 };
        } catch { }
      })
    );

    let cumulative = 0;
    const points = [...timeline.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, flow]) => {
        cumulative = Math.max(0, cumulative + flow);
        return { label: label.slice(5), value: cumulative };
      });

    return { positions: nextPositions, portfolioStats: nextStats, performance: points };
  }

  const pricedPositions = useMemo(() => positions.filter(item => item.marketValue != null), [positions]);
  const portfolioValue = positions.length ? positions.reduce((sum, item) => sum + (item.marketValue || 0), 0) : null;
  const totalCost = positions.reduce((sum, item) => sum + item.quantity * item.avgCost, 0);
  const totalPnl = positions.length ? positions.reduce((sum, item) => sum + (item.pnl || 0), 0) : null;
  const todayPnl = positions.length ? positions.reduce((sum, item) => sum + (item.todayPnl || 0), 0) : null;
  const totalReturn = totalPnl == null || totalCost <= 0 ? null : (totalPnl / totalCost) * 100;
  const largestWeight = portfolioValue ? Math.max(0, ...positions.map(item => ((item.marketValue || 0) / portfolioValue) * 100)) : null;

  const allocation = useMemo(() => {
    if (!portfolioValue) return [];
    const byType = new Map<string, number>();
    pricedPositions.forEach(item => byType.set(item.assetType, (byType.get(item.assetType) || 0) + (item.marketValue || 0)));
    return [...byType.entries()].map(([name, value], index) => ({
      name,
      value,
      weight: (value / portfolioValue) * 100,
      color: chartColors[index % chartColors.length],
    }));
  }, [portfolioValue, pricedPositions]);

  async function submitCreatePortfolio() {
    if (!portfolioForm.name.trim()) return;
    try {
      const created = await createPortfolio(portfolioForm.name.trim(), portfolioForm.currency, portfolioForm.type);
      const next = [...portfolios, created];
      const dashboardData = await loadDashboardData(next);
      setPortfolios(next);
      setPositions(dashboardData.positions);
      setPortfolioStats(dashboardData.portfolioStats);
      setPerformance(dashboardData.performance);
      setPortfolioForm({ name: "", currency: "USD", type: "STOCKS" });
      setModal(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function submitCreateWatchlist() {
    if (!watchlistName.trim()) return;
    try {
      const created = await createWatchlist(watchlistName.trim());
      setWatchlists(prev => [...prev, created]);
      setWatchlistName("");
      setModal(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function submitCreateGoal() {
    if (!goalForm.name.trim()) return;
    try {
      const created = await createGoal(goalForm.name.trim(), Number(goalForm.amount || 0), goalForm.currency, goalForm.date);
      setGoals(prev => [...prev, created]);
      setGoalForm({ name: "", amount: "", currency: "USD", date: "2030-01-01" });
      setModal(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDeletePortfolio(id: string) {
    if (!confirm("Delete this portfolio?")) return;
    try {
      await deletePortfolio(id);
      const next = portfolios.filter(item => item.id !== id);
      const dashboardData = await loadDashboardData(next);
      setPortfolios(next);
      setPositions(dashboardData.positions);
      setPortfolioStats(dashboardData.portfolioStats);
      setPerformance(dashboardData.performance);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDeleteWatchlist(id: string) {
    if (!confirm("Delete this watchlist?")) return;
    try {
      await deleteWatchlist(id);
      setWatchlists(prev => prev.filter(item => item.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDeleteGoal(id: string) {
    if (!confirm("Delete this goal?")) return;
    try {
      await deleteGoal(id);
      setGoals(prev => prev.filter(item => item.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function loadNews() {
    setNewsLoading(true);
    const symbols = new Set<string>();

    await Promise.all(portfolios.map(async portfolio => {
      try {
        const transactions = await getTransactions(portfolio.id);
        transactions.forEach(tx => symbols.add(tx.assetSymbol));
      } catch { }
    }));

    await Promise.all(watchlists.map(async watchlist => {
      try {
        const items = await getWatchlistItems(watchlist.id);
        items.forEach(item => symbols.add(item.assetSymbol));
      } catch { }
    }));

    const fetched: NewsItem[] = [];
    await Promise.all([...symbols].slice(0, 8).map(async symbol => {
      try {
        const res = await fetch(`/api/stock-news?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (Array.isArray(data)) fetched.push(...data);
      } catch { }
    }));

    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    const recentNews = fetched.filter(item => {
      const publishedAt = new Date(item.publishedAt).getTime();
      return Number.isFinite(publishedAt) && publishedAt >= twelveHoursAgo;
    });
    recentNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    setNewsItems(recentNews.slice(0, 20));
    setNewsLoading(false);
  }

  function openFirstPortfolio() {
    if (!portfolios.length) {
      setError("Create a portfolio before adding a transaction.");
      return;
    }
    window.location.href = `/portfolio/${portfolios[0].id}`;
  }

  function importCsv() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = () => {
      if (input.files?.[0]) setError(`Selected ${input.files[0].name}. CSV import API is not wired yet.`);
    };
    input.click();
  }

  if (!isClient) return <div className="min-h-screen bg-[#050816]" />;

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <Tabs orientation="vertical" value={active} onValueChange={value => {
        const tab = value as Tab;
        setActive(tab);
        if (tab === "news" && newsItems.length === 0) loadNews();
      }}>
        <div className="flex">
          <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-[#070b18]/95 p-5 lg:block backdrop-blur-sm">
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg rainbow-bg text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold rainbow-text">Investment</p>
                  <p className="text-xs text-slate-500">Institutional Console</p>
                </div>
              </div>
            </div>

            <TabsList className="grid h-auto w-full gap-2 bg-transparent p-0">
              {navItems.map(({ id, label, Icon }) => (
                <TabsTrigger key={id} value={id} className="h-10 justify-start gap-2 px-3 transition-all duration-200 data-active:bg-[#54a0ff]/10 data-active:text-[#54a0ff] hover:bg-white/5">
                  <Icon className="h-4 w-4" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-6 space-y-2">
              <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-[#0abf53] transition-colors" onClick={() => (window.location.href = "/market")}>
                <TrendingUp className="h-4 w-4" />
                Market
              </Button>
              <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-cyan-300 transition-colors" onClick={() => (window.location.href = "/market-calendar")}>
                <CalendarDays className="h-4 w-4" />
                Market Calendar
              </Button>
              <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-[#c44dff] transition-colors" onClick={() => (window.location.href = "/analysis")}>
                <Bot className="h-4 w-4" />
                AI Analysis
              </Button>
            </div>

            <Button
              variant="ghost"
              className="absolute bottom-5 left-5 right-5 justify-start text-red-300 hover:text-red-200"
              onClick={() => {
                localStorage.removeItem("token");
                window.location.href = "/login";
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </aside>

          <main className="w-full px-4 py-5 lg:ml-64 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <Card className="border-white/10 bg-[radial-gradient(ellipse_at_top_left,rgba(196,77,255,0.12),transparent_38%),radial-gradient(ellipse_at_bottom_right,rgba(84,160,255,0.1),transparent_38%),linear-gradient(135deg,#0f172a,#050816)] overflow-hidden">
                  <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <Badge variant="outline" className="border-[#54a0ff]/30 text-[#54a0ff]">🌈 Rainbow Edition</Badge>
                      <h1 className="mt-4 text-3xl font-semibold tracking-tight lg:text-5xl rainbow-text">Financial Dashboard</h1>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                        Portfolio intelligence, live holdings, allocation, risk, goals and market news in one premium dark workspace.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={openFirstPortfolio}>
                        <FilePlus className="h-4 w-4" />
                        Add Transaction
                      </Button>
                      <Button variant="outline" onClick={() => (window.location.href = "/market")}>
                        <Plus className="h-4 w-4" />
                        Add Asset
                      </Button>
                      <Button variant="outline" onClick={importCsv}>
                        <Upload className="h-4 w-4" />
                        Import CSV
                      </Button>
                      <Button variant="outline" onClick={() => window.print()}>
                        <Download className="h-4 w-4" />
                        Export PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {error && (
                <Card className="border-red-500/20 bg-red-500/10">
                  <CardContent className="flex items-center gap-3 p-4 text-sm text-red-200">
                    <ShieldAlert className="h-4 w-4" />
                    {error}
                  </CardContent>
                </Card>
              )}

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 bg-white/10" />)
                ) : (
                  [
                    { label: "Portfolio Value", value: fmtMoney(portfolioValue), tone: "text-white", border: "border-l-rainbow-blue" },
                    { label: "Today P/L", value: fmtSignedMoney(todayPnl), tone: todayPnl != null && todayPnl < 0 ? "text-[#ff6b6b]" : "text-[#0abf53]", border: "border-l-rainbow-green" },
                    { label: "Total Return", value: fmtPct(totalReturn), tone: totalReturn != null && totalReturn < 0 ? "text-[#ff6b6b]" : "text-[#ff9f43]", border: "border-l-rainbow-orange" },
                    { label: "Cost Basis", value: fmtMoney(totalCost), tone: "text-[#c44dff]", border: "border-l-rainbow-violet" },
                  ].map(item => (
                    <Card key={item.label} className={`border-white/10 bg-white/[0.03] ${item.border} transition-all duration-300 hover:bg-white/[0.05] hover:shadow-lg`}>
                      <CardHeader className="pb-2">
                        <CardDescription>{item.label}</CardDescription>
                        <CardTitle className={`text-2xl ${item.tone}`}>{item.value}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </section>

              <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
                <Card className="border-white/10 bg-white/[0.03]">
                  <CardHeader>
                    <CardTitle>Portfolio Performance</CardTitle>
                    <CardDescription>Invested capital trend from recorded transactions.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {loading ? (
                      <Skeleton className="h-full bg-white/10" />
                    ) : performance.length === 0 ? (
                      <div className="grid h-full place-items-center text-sm text-slate-500">No transaction history yet.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performance}>
                          <defs>
                            <linearGradient id="equityFill" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#c44dff" stopOpacity={0.3} />
                              <stop offset="30%" stopColor="#54a0ff" stopOpacity={0.2} />
                              <stop offset="60%" stopColor="#0abf53" stopOpacity={0.1} />
                              <stop offset="100%" stopColor="#feca57" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="equityStroke" x1="0" x2="1" y1="0" y2="0">
                              <stop offset="0%" stopColor="#54a0ff" />
                              <stop offset="50%" stopColor="#c44dff" />
                              <stop offset="100%" stopColor="#ff6b6b" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#1e293b" strokeDasharray="2 4" vertical={false} />
                          <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={value => `$${Number(value).toLocaleString()}`} />
                          <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 12 }} formatter={value => fmtMoney(Number(value ?? 0))} />
                          <Area type="monotone" dataKey="value" stroke="url(#equityStroke)" strokeWidth={2.5} fill="url(#equityFill)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/[0.03]">
                  <CardHeader>
                    <CardTitle>Asset Allocation</CardTitle>
                    <CardDescription>Current market-value distribution.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loading ? (
                      <Skeleton className="h-64 bg-white/10" />
                    ) : allocation.length === 0 ? (
                      <div className="grid h-64 place-items-center text-sm text-slate-500">No priced holdings yet.</div>
                    ) : (
                      <>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88}>
                                {allocation.map(item => <Cell key={item.name} fill={item.color} />)}
                              </Pie>
                              <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 12 }} formatter={value => fmtMoney(Number(value ?? 0))} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        {allocation.map(item => (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-300">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                              {item.name}
                            </span>
                            <span className="font-medium text-white">{item.weight.toFixed(1)}%</span>
                          </div>
                        ))}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader>
                  <CardTitle>Risk Metrics</CardTitle>
                  <CardDescription>Drawdown, exposure and concentration checks.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                  {[
                    { label: "Drawdown", value: totalReturn == null ? "N/A" : fmtPct(Math.min(totalReturn, 0)), tone: totalReturn != null && totalReturn < 0 ? "text-red-400" : "text-slate-400" },
                    { label: "Exposure", value: portfolioValue == null ? "N/A" : "100%", tone: "text-emerald-400" },
                    { label: "Largest Position", value: largestWeight == null ? "N/A" : `${largestWeight.toFixed(1)}%`, tone: largestWeight != null && largestWeight > 35 ? "text-yellow-400" : "text-emerald-400" },
                    { label: "Sharpe Ratio", value: "N/A", tone: "text-slate-400" },
                  ].map(metric => (
                    <Card key={metric.label} className="border-white/10 bg-slate-950/70" size="sm">
                      <CardHeader>
                        <CardDescription>{metric.label}</CardDescription>
                        <CardTitle className={metric.tone}>{metric.value}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              <TabsContent value="portfolios" className="space-y-6">
                <Card className="border-white/10 bg-white/[0.03]">
                  <CardHeader>
                    <CardTitle>Current Holdings</CardTitle>
                    <CardDescription>Positions sorted by market value.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-72 bg-white/10" />
                    ) : pricedPositions.length === 0 ? (
                      <div className="py-12 text-center text-sm text-slate-500">No priced holdings yet.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10">
                            {["Symbol", "Name", "Qty", "Avg Cost", "Current", "Market Value", "P/L", "Return", "Weight"].map(head => (
                              <TableHead key={head} className={head === "Symbol" || head === "Name" ? "" : "text-right"}>{head}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...pricedPositions].sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0)).map(position => {
                            const weight = portfolioValue ? ((position.marketValue || 0) / portfolioValue) * 100 : null;
                            const negative = position.pnl != null && position.pnl < 0;

                            return (
                              <TableRow key={`${position.portfolioId}-${position.symbol}`} className="border-white/10">
                                <TableCell className="font-semibold text-white">{position.symbol}</TableCell>
                                <TableCell className="text-slate-300">{position.name}</TableCell>
                                <TableCell className="min-w-[150px] whitespace-nowrap text-right font-mono tabular-nums text-slate-300" title={String(position.quantity)}>{fmtQuantity(position.quantity)}</TableCell>
                                <TableCell className="text-right text-slate-300">{fmtMoney(position.avgCost)}</TableCell>
                                <TableCell className="text-right text-slate-300">{fmtMoney(position.currentPrice)}</TableCell>
                                <TableCell className="text-right font-medium text-white">{fmtMoney(position.marketValue)}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={negative ? "destructive" : "default"} className={negative ? "" : "bg-emerald-500/15 text-emerald-300"}>
                                    {fmtSignedMoney(position.pnl)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={negative ? "destructive" : "default"} className={negative ? "" : "bg-emerald-500/15 text-emerald-300"}>
                                    {fmtPct(position.returnPct)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-slate-300">{weight == null ? "N/A" : `${weight.toFixed(1)}%`}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/[0.03]">
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle>Portfolio Ranking</CardTitle>
                      <CardDescription>Ranked by live total return.</CardDescription>
                    </div>
                    <Button onClick={() => setModal("portfolio")}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {portfolios.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No portfolios yet.</div>}
                    {portfolios.map(portfolio => {
                      const stat = portfolioStats[portfolio.id];
                      const negative = stat?.returnPct != null && stat.returnPct < 0;
                      return (
                        <Card key={portfolio.id} className="border-white/10 bg-slate-950/70" size="sm">
                          <CardContent className="flex items-center justify-between p-4">
                            <button onClick={() => (window.location.href = `/portfolio/${portfolio.id}`)} className="text-left">
                              <p className="font-semibold text-white">{portfolio.name}</p>
                              <p className="mt-1 text-xs text-slate-500">{portfolio.type} · {portfolio.baseCurrency} · {fmtMoney(stat?.value)}</p>
                            </button>
                            <div className="flex items-center gap-3">
                              <Badge variant={negative ? "destructive" : "default"} className={negative ? "" : "bg-emerald-500/15 text-emerald-300"}>
                                {fmtPct(stat?.returnPct)}
                              </Badge>
                              <Button variant="ghost" size="icon" onClick={() => handleDeletePortfolio(portfolio.id)} aria-label="Delete portfolio">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="watchlists">
                <Card className="border-white/10 bg-white/[0.03]">
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle>Watchlists</CardTitle>
                      <CardDescription>Symbols tracked outside active holdings.</CardDescription>
                    </div>
                    <Button onClick={() => setModal("watchlist")}><Plus className="h-4 w-4" />Add</Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {watchlists.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No watchlists yet.</div>}
                    {watchlists.map(watchlist => (
                      <Card key={watchlist.id} className="border-white/10 bg-slate-950/70" size="sm">
                        <CardContent className="flex items-center justify-between p-4">
                          <p className="font-semibold text-white">{watchlist.name}</p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => (window.location.href = `/watchlist/${watchlist.id}`)}>View</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteWatchlist(watchlist.id)}>Delete</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="goals">
                <Card className="border-white/10 bg-white/[0.03]">
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle>Goals</CardTitle>
                      <CardDescription>Progress toward target capital milestones.</CardDescription>
                    </div>
                    <Button onClick={() => setModal("goal")}><Plus className="h-4 w-4" />Add</Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {goals.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No goals yet.</div>}
                    {goals.map(goal => {
                      const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
                      return (
                        <Card key={goal.id} className="border-white/10 bg-slate-950/70" size="sm">
                          <CardContent className="p-4">
                            <div className="mb-3 flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-white">{goal.name}</p>
                                <p className="text-xs text-slate-500">{goal.targetDate} · {goal.status}</p>
                              </div>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteGoal(goal.id)}>Delete</Button>
                            </div>
                            <div className="h-2 rounded-full bg-slate-800">
                              <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-slate-500">
                              <span>{goal.currentAmount.toLocaleString()} {goal.currency}</span>
                              <span>{progress}% · {goal.targetAmount.toLocaleString()} {goal.currency}</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="news">
                <Card className="border-white/10 bg-white/[0.03]">
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle>Portfolio News</CardTitle>
                      <CardDescription>AI-ready sentiment and impact labels.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={loadNews}><RefreshCw className="h-4 w-4" />Refresh</Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {newsLoading && Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 bg-white/10" />)}
                    {!newsLoading && newsItems.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No recent portfolio news.</div>}
                    {newsItems.map((item, index) => (
                      <Card key={`${item.url}-${index}`} className="border-white/10 bg-slate-950/70" size="sm">
                        <CardContent className="p-4">
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <Badge variant="outline">{item.symbol}</Badge>
                            <span>{item.source}</span>
                            <span>{new Date(item.publishedAt).toLocaleDateString("vi-VN")}</span>
                            <Badge className="bg-emerald-500/15 text-emerald-300">Bullish</Badge>
                            <Badge className="bg-orange-500/15 text-orange-300">High Impact</Badge>
                          </div>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-white hover:text-cyan-300">{item.title}</a>
                          {item.summary && <p className="mt-2 text-sm text-slate-400">{item.summary}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </main>
        </div>
      </Tabs>

      <Dialog open={modal !== null} onOpenChange={open => !open && setModal(null)}>
        <DialogContent className="border-white/10 bg-[#0b1020] text-white">
          <DialogHeader>
            <DialogTitle>{modal === "portfolio" ? "Create Portfolio" : modal === "watchlist" ? "Create Watchlist" : "Create Goal"}</DialogTitle>
            <DialogDescription>Keep the setup lean; deeper settings can live inside the detail page.</DialogDescription>
          </DialogHeader>

          {modal === "portfolio" && (
            <div className="space-y-3">
              <Input value={portfolioForm.name} onChange={event => setPortfolioForm(prev => ({ ...prev, name: event.target.value }))} placeholder="Portfolio name" />
              <Select value={portfolioForm.currency} onValueChange={value => setPortfolioForm(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Currency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="VND">VND</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
              <Select value={portfolioForm.type} onValueChange={value => setPortfolioForm(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCKS">Stocks</SelectItem>
                  <SelectItem value="CRYPTO">Crypto</SelectItem>
                  <SelectItem value="COMMODITIES">Commodities</SelectItem>
                  <SelectItem value="FUNDS">Funds</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={submitCreatePortfolio}>Create</Button>
            </div>
          )}

          {modal === "watchlist" && (
            <div className="space-y-3">
              <Input value={watchlistName} onChange={event => setWatchlistName(event.target.value)} placeholder="Watchlist name" />
              <Button className="w-full" onClick={submitCreateWatchlist}>Create</Button>
            </div>
          )}

          {modal === "goal" && (
            <div className="space-y-3">
              <Input value={goalForm.name} onChange={event => setGoalForm(prev => ({ ...prev, name: event.target.value }))} placeholder="Goal name" />
              <Input type="number" value={goalForm.amount} onChange={event => setGoalForm(prev => ({ ...prev, amount: event.target.value }))} placeholder="Target amount" />
              <Input value={goalForm.currency} onChange={event => setGoalForm(prev => ({ ...prev, currency: event.target.value }))} placeholder="Currency" />
              <Input type="date" value={goalForm.date} onChange={event => setGoalForm(prev => ({ ...prev, date: event.target.value }))} />
              <Button className="w-full" onClick={submitCreateGoal}>Create</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

