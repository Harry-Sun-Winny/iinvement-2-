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

interface NewsAssetOption {
  symbol: string;
  name: string;
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

const chartColors = ["#ff6b6b", "#ff9f43", "#feca57", "#0abf53", "#54a0ff", "#5f27cd", "#c44dff"];

const fmtMoney = (value: number | null | undefined) =>
  value == null ? "N/A" : `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const fmtSignedMoney = (value: number | null | undefined) =>
  value == null ? "N/A" : `${value >= 0 ? "+" : ""}${fmtMoney(value)}`;

const fmtPct = (value: number | null | undefined) =>
  value == null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const navItems = [
  { id: "portfolios" as const, label: "Dashboard", Icon: BarChart3 },
  { id: "watchlists" as const, label: "Watchlist", Icon: Eye },
  { id: "goals" as const, label: "Goals", Icon: Target },
  { id: "news" as const, label: "News", Icon: Newspaper },
];

export default function Page() {
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
  const [newsAssets, setNewsAssets] = useState<NewsAssetOption[]>([]);
  const [newsQuery, setNewsQuery] = useState("");
  const [newsLoading, setNewsLoading] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [portfolioForm, setPortfolioForm] = useState({ name: "", currency: "USD", type: "STOCKS" });
  const [watchlistName, setWatchlistName] = useState("");
  const [goalForm, setGoalForm] = useState({ name: "", amount: "", currency: "USD", date: "2030-01-01" });

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      window.location.href = "/login";
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [portfolioData, watchlistData, goalData] = await Promise.all([getPortfolios(), getWatchlists(), getGoals()]);
      setPortfolios(portfolioData);
      setWatchlists(watchlistData);
      setGoals(goalData);
      await loadDashboardData(portfolioData);
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
    const allSymbols = new Set<string>();

    // Instead of sync, we do have to fetch transactions async, but we can do it in parallel.
    const portfolioTxns = await Promise.all(
      portfolioData.map(async portfolio => {
        try {
          const txs = await getTransactions(portfolio.id);
          return { portfolio, txs };
        } catch {
          return { portfolio, txs: [] };
        }
      })
    );

    portfolioTxns.forEach(({ portfolio, txs }) => {
      const holdings: Record<string, { name: string; qty: number; cost: number }> = {};

      txs.forEach((tx: any) => {
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

      const priced = Object.entries(holdings)
        .filter(([, item]) => item.qty > 0)
        .map(([symbol, item]) => {
          allSymbols.add(symbol);
          const avgCost = item.cost / item.qty;
          return {
            symbol,
            name: item.name,
            quantity: item.qty,
            avgCost,
            currentPrice: avgCost, // Instant render using cost basis
            marketValue: item.cost,
            todayPnl: 0,
            pnl: 0,
            returnPct: 0,
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
            assetType: portfolio.type || "OTHER",
          };
        });

      nextPositions.push(...priced);
      const value = priced.reduce((sum, item) => sum + (item.marketValue || 0), 0);
      nextStats[portfolio.id] = { id: portfolio.id, value, pnl: 0, returnPct: 0 };
    });

    let cumulative = 0;
    const points = [...timeline.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, flow]) => {
        cumulative = Math.max(0, cumulative + flow);
        return { label: label.slice(5), value: cumulative };
      });

    // Render immediately
    setPositions(nextPositions);
    setPortfolioStats(nextStats);
    setPerformance(points);

    const symbolsArr = Array.from(allSymbols);
    if (symbolsArr.length === 0) {
      return;
    }

    const quoteEntries = await Promise.all(
      symbolsArr.map(async symbol => [symbol, await getStockPrice(symbol)] as const)
    );

    const quotesBySymbol = new Map(
      quoteEntries.filter(([, quote]) => quote && typeof quote.price === "number")
    );

    if (quotesBySymbol.size === 0) {
      return;
    }

    const resolvedPositions = nextPositions.map(pos => {
      const quote = quotesBySymbol.get(pos.symbol);
      if (!quote) {
        return pos;
      }

      const marketValue = pos.quantity * quote.price;
      const costBasis = pos.quantity * pos.avgCost;
      const pnl = marketValue - costBasis;
      const returnPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      return {
        ...pos,
        currentPrice: quote.price,
        marketValue,
        todayPnl: typeof quote.change === "number" ? pos.quantity * quote.change : 0,
        pnl,
        returnPct,
      };
    });

    const resolvedStats = portfolioData.reduce<Record<string, PortfolioStat>>((acc, portfolio) => {
      const pPositions = resolvedPositions.filter(pos => pos.portfolioId === portfolio.id);
      const value = pPositions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0);
      const totalCostVal = pPositions.reduce((sum, pos) => sum + (pos.quantity * pos.avgCost), 0);
      const pnl = value - totalCostVal;

      acc[portfolio.id] = {
        id: portfolio.id,
        value,
        pnl,
        returnPct: totalCostVal > 0 ? (pnl / totalCostVal) * 100 : 0,
      };
      return acc;
    }, {});

    setPositions(resolvedPositions);
    setPortfolioStats(resolvedStats);
  }

  const pricedPositions = useMemo(() => positions.filter(item => item.marketValue != null), [positions]);
  const portfolioValue = pricedPositions.length ? pricedPositions.reduce((sum, item) => sum + (item.marketValue || 0), 0) : null;
  const totalCost = pricedPositions.reduce((sum, item) => sum + item.quantity * item.avgCost, 0);
  const totalPnl = pricedPositions.length ? pricedPositions.reduce((sum, item) => sum + (item.pnl || 0), 0) : null;
  const todayPnl = pricedPositions.some(item => item.todayPnl != null) ? pricedPositions.reduce((sum, item) => sum + (item.todayPnl || 0), 0) : null;
  const totalReturn = totalPnl == null || totalCost <= 0 ? null : (totalPnl / totalCost) * 100;
  const largestWeight = portfolioValue ? Math.max(0, ...pricedPositions.map(item => ((item.marketValue || 0) / portfolioValue) * 100)) : null;

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
      setPortfolios(next);
      setPortfolioForm({ name: "", currency: "USD", type: "STOCKS" });
      setModal(null);
      await loadDashboardData(next);
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
      setPortfolios(next);
      await loadDashboardData(next);
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

  async function loadNews(queryOverride?: string) {
    setNewsLoading(true);
    const assetDirectory = new Map<string, string>();
    const normalizedQuery = (queryOverride ?? newsQuery).trim().toLowerCase();

    await Promise.all(portfolios.map(async portfolio => {
      try {
        const transactions = await getTransactions(portfolio.id);
        transactions.forEach(tx => {
          const symbol = String(tx.assetSymbol || "").toUpperCase();
          if (!symbol) return;
          assetDirectory.set(symbol, tx.assetName || symbol);
        });
      } catch {}
    }));

    await Promise.all(watchlists.map(async watchlist => {
      try {
        const items = await getWatchlistItems(watchlist.id);
        items.forEach(item => {
          const symbol = String(item.assetSymbol || "").toUpperCase();
          if (!symbol) return;
          assetDirectory.set(symbol, item.assetName || symbol);
        });
      } catch {}
    }));

    const allAssets = [...assetDirectory.entries()]
      .map(([symbol, name]) => ({ symbol, name }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    setNewsAssets(allAssets);

    const targetSymbols = (normalizedQuery
      ? allAssets.filter((asset) => {
          const haystack = `${asset.symbol} ${asset.name}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : allAssets
    )
      .map((asset) => asset.symbol)
      .slice(0, 8);

    if (targetSymbols.length === 0) {
      setNewsItems([]);
      setNewsLoading(false);
      return;
    }

    const fetched: NewsItem[] = [];
    await Promise.all(targetSymbols.map(async symbol => {
      try {
        const res = await fetch(`/api/stock-news?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (Array.isArray(data)) fetched.push(...data);
      } catch {}
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
      setModal("portfolio");
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

  return (
    <div className="min-h-screen text-slate-100 flex antigravity-volumetric">

      <div className="flex flex-1 min-h-screen overflow-hidden">
      <main className="w-full min-w-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl space-y-6">

          {error && (
            <div className="antigravity-panel p-4 text-sm text-red-400 border border-red-500/20 bg-red-500/5 backdrop-blur">
              {error}
            </div>
          )}

          <div className="antigravity-panel antigravity-float-slow overflow-hidden">
            {/* Embedded Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 p-6 gap-4 bg-white/[0.01]">
              <div className="flex items-center gap-6">
                <h2 className="text-xl font-black text-white tracking-widest uppercase">Console</h2>
                
                {/* Horizontal Tab Buttons inside Table Card */}
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                  {(["portfolios", "watchlists", "goals", "news"] as Tab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActive(tab);
                        if (tab === "news" && newsItems.length === 0) loadNews();
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-300 ${
                        active === tab
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab === "portfolios"
                        ? "Holdings"
                        : tab === "watchlists"
                        ? "Watchlist"
                        : tab === "goals"
                        ? "Goals"
                        : "News"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2">
                {active === "portfolios" && (
                  <>
                    <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={openFirstPortfolio}>
                      <Plus className="h-3 w-3 mr-1" /> Add Transaction
                    </Button>
                    <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={importCsv}>
                      <Upload className="h-3 w-3 mr-1" /> Import CSV
                    </Button>
                  </>
                )}
                {active === "watchlists" && (
                  <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => setModal("watchlist")}>
                    <Plus className="h-3 w-5" /> Add Watchlist
                  </Button>
                )}
                {active === "goals" && (
                  <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => setModal("goal")}>
                    <Plus className="h-3 w-5" /> Add Goal
                  </Button>
                )}
                {active === "news" && (
                  <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => loadNews()} disabled={newsLoading}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${newsLoading ? "animate-spin" : ""}`} /> Refresh
                  </Button>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="p-6">
              {loading ? (
                <div className="space-y-3 py-6">
                  <Skeleton className="h-6 w-full bg-white/5" />
                  <Skeleton className="h-10 w-full bg-white/5" />
                  <Skeleton className="h-10 w-full bg-white/5" />
                </div>
              ) : active === "portfolios" ? (
                portfolios.length === 0 && pricedPositions.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500 font-medium">No priced holdings yet.</div>
                ) : (
                  <div>
                    {/* Current Holdings Table */}
                    <div className="overflow-auto max-h-[600px] pr-2 custom-scrollbar">
                      <Table>
                        <TableHeader className="sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-10 shadow-sm shadow-white/5">
                          <TableRow className="border-white/5 hover:bg-transparent">
                            {["Mã", "Tên", "Số lượng", "Giá vốn", "Giá hiện tại", "Giá trị TT", "P/L", "Lợi nhuận", "Tỷ trọng"].map(head => {
                              let stickyClass = "";
                              if (head === "Mã") stickyClass = "sticky left-0 bg-[#0c0c14] z-30 w-[100px] min-w-[100px] max-w-[100px] border-r border-white/5";
                              if (head === "Tên") stickyClass = "sticky left-[100px] bg-[#0c0c14] z-30 w-[150px] min-w-[150px] max-w-[150px] border-r border-white/5";
                              return (
                                <TableHead
                                  key={head}
                                  className={`text-slate-400 font-bold text-xs uppercase tracking-wider py-4 whitespace-normal break-words ${
                                    head === "Mã" || head === "Tên" ? "" : "text-right min-w-[120px]"
                                  } ${stickyClass}`}
                                >
                                  {head}
                                </TableHead>
                              );
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...pricedPositions].sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0)).map(position => {
                            const weight = portfolioValue ? ((position.marketValue || 0) / portfolioValue) * 100 : null;
                            const negative = position.pnl != null && position.pnl < 0;

                            return (
                              <TableRow key={`${position.portfolioId}-${position.symbol}`} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                                <TableCell className="font-semibold text-white py-4 whitespace-normal break-words sticky left-0 bg-[#0a0a0f] group-hover:bg-white/[0.02] z-20 w-[100px] min-w-[100px] max-w-[100px] border-r border-white/5">{position.symbol}</TableCell>
                                <TableCell className="text-slate-300 py-4 whitespace-normal break-words sticky left-[100px] bg-[#0a0a0f] group-hover:bg-white/[0.02] z-20 w-[150px] min-w-[150px] max-w-[150px] border-r border-white/5">{position.name}</TableCell>
                                <TableCell className="text-right text-slate-300 py-4 whitespace-normal min-w-[120px] break-words">{position.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 })}</TableCell>
                                <TableCell className="text-right text-slate-300 py-4 whitespace-normal min-w-[120px] break-words">{fmtMoney(position.avgCost)}</TableCell>
                                <TableCell className="text-right text-slate-300 py-4 whitespace-normal min-w-[120px] break-words">{fmtMoney(position.currentPrice)}</TableCell>
                                <TableCell className="text-right font-medium text-white py-4 whitespace-normal min-w-[120px] break-words">{fmtMoney(position.marketValue)}</TableCell>
                                <TableCell className="text-right py-4 whitespace-normal min-w-[120px] break-words">
                                  <Badge variant={negative ? "destructive" : "default"} className={`font-bold ${negative ? "" : "bg-emerald-500/10 text-emerald-400 border-none"}`}>
                                    {fmtSignedMoney(position.pnl)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right py-4 whitespace-normal min-w-[120px] break-words">
                                  <Badge variant={negative ? "destructive" : "default"} className={`font-bold ${negative ? "" : "bg-emerald-500/10 text-emerald-400 border-none"}`}>
                                    {fmtPct(position.returnPct)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-slate-300 py-4 whitespace-normal min-w-[120px] break-words">{weight == null ? "N/A" : `${weight.toFixed(1)}%`}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Portfolios List */}
                    <div className="mt-8 border-t border-white/5 pt-8">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-white tracking-widest uppercase">Portfolios</h3>
                        <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => setModal("portfolio")}>
                          <Plus className="h-3 w-5" /> Add
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {portfolios.map(portfolio => {
                          const stat = portfolioStats[portfolio.id];
                          const negative = stat?.returnPct != null && stat.returnPct < 0;
                          return (
                            <div key={portfolio.id} className="antigravity-panel p-4 flex items-center justify-between hover:bg-white/[0.01] transition-all bg-transparent">
                              <button onClick={() => (window.location.href = `/portfolio/${portfolio.id}`)} className="text-left">
                                <p className="font-semibold text-white">{portfolio.name}</p>
                                <p className="mt-1 text-xs text-slate-500">{portfolio.type} · {portfolio.baseCurrency} · {fmtMoney(stat?.value)}</p>
                              </button>
                              <div className="flex items-center gap-3">
                                <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => (window.location.href = `/portfolio/${portfolio.id}`)}>
                                  <Eye className="h-3 w-3 mr-1" /> View
                                </Button>
                                <Badge variant={negative ? "destructive" : "default"} className={`font-bold ${negative ? "" : "bg-emerald-500/10 text-emerald-400 border-none"}`}>
                                  {fmtPct(stat?.returnPct)}
                                </Badge>
                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-400 transition-colors bg-transparent border-none" onClick={() => handleDeletePortfolio(portfolio.id)} aria-label="Delete portfolio">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )
              ) : active === "watchlists" ? (
                watchlists.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500 font-medium">No watchlists yet.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {watchlists.map(watchlist => (
                      <div key={watchlist.id} className="antigravity-panel p-4 flex items-center justify-between hover:bg-white/[0.01] transition-all bg-transparent">
                        <p className="font-semibold text-white">{watchlist.name}</p>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => (window.location.href = `/watchlist/${watchlist.id}`)}>View</Button>
                          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-colors" onClick={() => handleDeleteWatchlist(watchlist.id)}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : active === "goals" ? (
                goals.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500 font-medium">No goals yet.</div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {goals.map(goal => {
                      const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
                      return (
                        <div key={goal.id} className="antigravity-panel p-5 flex flex-col hover:bg-white/[0.01] transition-all bg-transparent">
                          <div className="mb-4 flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-white">{goal.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{goal.targetDate} · {goal.status}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-400 transition-colors bg-transparent border-none" onClick={() => handleDeleteGoal(goal.id)}>Delete</Button>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full bg-white/40 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="mt-3 flex justify-between text-xs text-slate-500 font-semibold">
                            <span>{goal.currentAmount.toLocaleString()} {goal.currency}</span>
                            <span>{progress}% / {goal.targetAmount.toLocaleString()} {goal.currency}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">Tin theo tài sản đầu tư</p>
                      <p className="text-xs text-slate-400">
                        Gõ mã hoặc tên công ty như <span className="font-semibold text-slate-200">AAPL</span> hoặc <span className="font-semibold text-slate-200">Apple</span> để lọc đúng news bạn cần.
                      </p>
                    </div>
                    <div className="flex w-full gap-2 md:max-w-xl">
                      <Input
                        value={newsQuery}
                        onChange={(e) => setNewsQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            loadNews(e.currentTarget.value);
                          }
                        }}
                        placeholder="Tìm theo mã hoặc tên tài sản"
                        className="border-white/10 bg-black/30 text-white placeholder:text-slate-500"
                      />
                      <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => loadNews()}>
                        Tìm
                      </Button>
                    </div>
                  </div>

                  {newsAssets.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newsAssets.slice(0, 8).map((asset) => (
                        <button
                          key={asset.symbol}
                          onClick={() => {
                            setNewsQuery(asset.name);
                            loadNews(asset.name);
                          }}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                        >
                          {asset.symbol}
                        </button>
                      ))}
                    </div>
                  )}

                  {newsItems.length === 0 ? (
                    <div className="py-12 text-center text-sm font-medium text-slate-500">
                      {newsQuery.trim() ? "Chưa tìm thấy news cho tài sản này." : "Chưa có tin mới cho danh mục hiện tại."}
                    </div>
                  ) : (
                    <div className="max-h-[600px] space-y-4 overflow-y-auto pr-2">
                    {newsItems.map((item, index) => (
                      <div key={`${item.url}-${index}`} className="antigravity-panel p-5 hover:bg-white/[0.01] transition-all bg-transparent">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
                          <Badge variant="outline" className="border-white/10 text-white/70">{item.symbol}</Badge>
                          <span className="text-slate-500">{item.source}</span>
                          <span className="text-slate-500">{new Date(item.publishedAt).toLocaleDateString("vi-VN")}</span>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-none font-bold">Bullish</Badge>
                          <Badge className="bg-white/5 text-slate-300 border-none font-bold">High Impact</Badge>
                        </div>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:text-slate-300 transition-colors block text-base mt-2 leading-relaxed">{item.title}</a>
                        {item.summary && <p className="mt-2 text-sm text-slate-400 leading-relaxed line-clamp-2">{item.summary}</p>}
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
      <div className="flex-1 h-full overflow-y-auto p-6 bg-transparent" />
    </div>

      <Dialog open={modal !== null} onOpenChange={open => !open && setModal(null)}>
        <DialogContent className="border-white/10 bg-[#0b1020] text-white">
          <DialogHeader>
            <DialogTitle>{modal === "portfolio" ? "Create Portfolio" : modal === "watchlist" ? "Create Watchlist" : "Create Goal"}</DialogTitle>
            <DialogDescription>Keep the setup lean; deeper settings can live inside the detail page.</DialogDescription>
          </DialogHeader>

          {modal === "portfolio" && (
            <div className="space-y-3">
              <Input value={portfolioForm.name} onChange={event => setPortfolioForm(prev => ({ ...prev, name: event.target.value }))} placeholder="Portfolio name" />
              <select
                value={portfolioForm.currency}
                onChange={e => setPortfolioForm(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="USD">USD</option>
                <option value="VND">VND</option>
                <option value="USDT">USDT</option>
              </select>
              <select
                value={portfolioForm.type}
                onChange={e => setPortfolioForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="STOCKS">Stocks</option>
                <option value="CRYPTO">Crypto</option>
                <option value="COMMODITIES">Commodities</option>
                <option value="FUNDS">Funds</option>
              </select>
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
