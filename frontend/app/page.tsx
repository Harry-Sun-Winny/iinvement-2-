"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  ComposedChart,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Eye,
  Newspaper,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AutoSizedChart from "@/components/charts/AutoSizedChart";
import { DailySessionSummary } from "@/components/dashboard/DailySessionSummary";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FiveSessionPriceSparkline } from "@/components/dashboard/FiveSessionPriceSparkline";
import { AssetLogo } from "@/components/AssetLogo";
import { useTranslation } from "@/components/providers/I18nProvider";
import {
  ApiError,
  commitTransactionImport,
  createGoal,
  createPortfolio,
  createWatchlist,
  deleteGoal,
  deletePortfolio,
  deleteWatchlist,
  getGoals,
  getPortfolios,
  getStockPrices,
  getTransactions,
  getWatchlistItems,
  getWatchlists,
  Goal,
  Portfolio,
  previewTransactionImport,
  TransactionImportPreview,
  Watchlist,
  Transaction,
  transferPortfolioPosition,
  getFxRate,
} from "./lib/api";
import { parseTransactionCsv } from "@/lib/transaction-import";

import {
  convertCurrency,
  fmtMoney as financeFmtMoney,
  fmtSignedMoney as financeFmtSignedMoney,
  fmtCompactMoney,
  fmtCompactNumber,
  fmtCompactSignedMoney,
  getValueTone,
  isPositive,
  fmtPct,
} from "./lib/finance/currency";

import {
  buildHoldingsFromTransactions,
  buildPositionsFromHoldings,
  applyLivePrices,
  buildDisplayPositions,
  computeDisplayPortfolioStats,
  StockQuote,
  FinancialCalculationError,
  DashboardPosition,
  DisplayPosition,
  PortfolioStat,
} from "./lib/finance/calculations";

import { valuePortfolioSets } from "./lib/finance/valuation";
import { buildPerformanceTimeline } from "./lib/finance/performance";
import { summarizeDailySession } from "./lib/finance/daily-session";

type Tab = "portfolios" | "watchlists" | "goals" | "news" | "transactions";
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

interface VolatilityAlert {
  symbol: string;
  name: string;
  period: "day" | "week" | "month";
  changePct: number;
  threshold: number;
}

interface DividendEvent {
  id?: string;
  symbol: string;
  recordDate: string;
  paymentDate: string;
  dividendRate: number;
  type: "CASH" | "STOCK";
}

interface MonthlyHistoryPoint {
  date: string;
  close: number;
}

interface AssetTrendPoint {
  date: string;
  portfolioValue: number;
  valueChange: number;
  changePercent: number;
}

const chartColors = ["#ff6b6b", "#ff9f43", "#feca57", "#0abf53", "#54a0ff", "#5f27cd", "#c44dff"];

export default function Page() {
  const { t, language } = useTranslation();
  const isVi = language === "vi";
  const numberLocale = isVi ? "vi-VN" : "en-US";
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [active, setActive] = useState<Tab>("portfolios");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<DashboardPosition[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [moverNews, setMoverNews] = useState<Record<string, NewsItem[]>>({});
  const [moverNewsLoading, setMoverNewsLoading] = useState(false);
  const [volatilityAlerts, setVolatilityAlerts] = useState<VolatilityAlert[]>([]);
  const [newsAssets, setNewsAssets] = useState<NewsAssetOption[]>([]);
  const [newsQuery, setNewsQuery] = useState("");
  const [newsLoading, setNewsLoading] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [portfolioForm, setPortfolioForm] = useState({ name: "", currency: "USD", type: "STOCKS" });
  const [watchlistName, setWatchlistName] = useState("");
  const [goalForm, setGoalForm] = useState({ name: "", amount: "", currency: "USD", date: "2030-01-01" });
  const [showIncomeBreakdown, setShowIncomeBreakdown] = useState(false);
  const [showTodayBreakdown, setShowTodayBreakdown] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [realizedMethod, setRealizedMethod] = useState<"AVERAGE" | "FIFO" | "LIFO">("AVERAGE");
  const [dividendEvents, setDividendEvents] = useState<DividendEvent[]>([]);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvPortfolioId, setCsvPortfolioId] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvPreview, setCsvPreview] = useState<TransactionImportPreview | null>(null);
  const [csvImportBusy, setCsvImportBusy] = useState(false);
  const [csvImportError, setCsvImportError] = useState("");
  const [csvImportedCount, setCsvImportedCount] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ type: "portfolio" | "watchlist" | "goal"; id: string; name?: string } | null>(null);

  const [baseCurrency, setBaseCurrency] = useState<"USD" | "VND">("USD");
  const [fxRates, setFxRates] = useState<Record<string, number>>({ USD: 1, USDT: 1, USDC: 1, VND: 25400 });
  const [fxStatus, setFxStatus] = useState<"live" | "fallback" | "error">("live");
  const [fxMetadata, setFxMetadata] = useState<{ updatedAt?: string; source?: string }>({});
  const [calculationErrors, setCalculationErrors] = useState<FinancialCalculationError[]>([]);
  const [allPortfolioTxns, setAllPortfolioTxns] = useState<Array<{ portfolio: Portfolio; txs: Transaction[] }>>([]);
  const [quotesMap, setQuotesMap] = useState<Map<string, StockQuote>>(new Map());
  const [monthlyHistoryBySymbol, setMonthlyHistoryBySymbol] = useState<Record<string, MonthlyHistoryPoint[]>>({});

  const activeEffectRef = useRef<boolean>(true);
  const activeNewsRef = useRef<boolean>(true);
  const newsRequestRef = useRef(0);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    activeEffectRef.current = true;
    if (!localStorage.getItem("token")) {
      window.location.href = "/login";
      return;
    }
    loadData();
    return () => {
      activeEffectRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchVndRate() {
      try {
        const data = await getFxRate("VND");
        if (!active) return;
        setFxRates(data.rates);
        setFxStatus(data.fallback ? "fallback" : "live");
        setFxMetadata({ updatedAt: data.updatedAt, source: data.source });
      } catch (err) {
        if (!active) return;
        setFxStatus("error");
        setFxMetadata({ source: "Yahoo Finance (Offline)" });
      }
    }
    fetchVndRate();
    return () => {
      active = false;
    };
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [portfolioData, watchlistData, goalData] = await Promise.all([getPortfolios(), getWatchlists(), getGoals()]);
      if (!activeEffectRef.current) return;
      setPortfolios(portfolioData);
      setWatchlists(watchlistData);
      setGoals(goalData);
      await loadDashboardData(portfolioData);
    } catch (e: any) {
      if (!activeEffectRef.current) return;
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }
      setError(e.message || "Unable to load dashboard data.");
    } finally {
      if (activeEffectRef.current) setLoading(false);
    }
  }

  async function loadDashboardData(portfolioData: Portfolio[]) {
    const portfolioTxns = await Promise.all(
      portfolioData.map(async portfolio => {
        try {
          const txs = await getTransactions(portfolio.id);
          return { portfolio, txs };
        } catch (err: any) {
          console.error(`Failed to fetch transactions for portfolio ${portfolio.id}:`, err);
          return { portfolio, txs: [] };
        }
      })
    );

    if (!activeEffectRef.current) return;

    setAllPortfolioTxns(portfolioTxns);

    const initialValuation = valuePortfolioSets(portfolioTxns, new Map(), baseCurrency, fxRates);
    const allPositions = initialValuation.positions;

    setPositions(allPositions);
    setCalculationErrors(initialValuation.errors);

    if (active === "news" && newsItems.length === 0) {
      loadNews("", allPositions);
    }

    const allSymbols = new Set(allPositions.map(p => p.symbol));
    const symbolsArr = Array.from(allSymbols);
    if (symbolsArr.length === 0) {
      setMonthlyHistoryBySymbol({});
      setVolatilityAlerts([]);
      return;
    }

    const batchedQuotes = await getStockPrices(symbolsArr);
    const quoteEntries = symbolsArr.map(
      (symbol) => {
        const clean = symbol.trim().toUpperCase().replace(/[\s.,]+$/, "");
        return [symbol, batchedQuotes[symbol.toUpperCase()] ?? batchedQuotes[clean] ?? null] as const;
      },
    );

    if (!activeEffectRef.current) return;

    const quotesBySymbol = new Map<string, StockQuote>();
    quoteEntries.forEach(([symbol, quote]) => {
      if (quote && typeof quote.price === "number") {
        const quoteObj: StockQuote = {
          price: quote.price,
          previousClose: typeof quote.previousClose === "number" ? quote.previousClose : quote.price - quote.change,
          dayHigh: typeof quote.dayHigh === "number" ? quote.dayHigh : null,
          dayLow: typeof quote.dayLow === "number" ? quote.dayLow : null,
          changeAmount: quote.change,
          changePercent: quote.changePercent,
          // /api/stock-price returns a price in this currency (USD by default).
          currency: String(quote.currency || "USD").toUpperCase(),
          tradingDate: quote.tradingDate ?? null,
        };
        quotesBySymbol.set(symbol, quoteObj);
        const clean = symbol.trim().toUpperCase().replace(/[\s.,]+$/, "");
        if (clean !== symbol) {
          quotesBySymbol.set(clean, quoteObj);
        }
      }
    });

    setQuotesMap(quotesBySymbol);

    if (quotesBySymbol.size === 0) return;

    const resolvedPositions = valuePortfolioSets(portfolioTxns, quotesBySymbol, baseCurrency, fxRates).positions;
    setPositions(resolvedPositions);

    void Promise.all(symbolsArr.map(async (symbol) => {
      const clean = symbol.trim().toUpperCase().replace(/[\s.,]+$/, "");
      const quote = quotesBySymbol.get(symbol) ?? quotesBySymbol.get(clean);
      const position = resolvedPositions.find((item) => {
        const itemClean = item.symbol.toUpperCase().replace(/[\s.,]+$/, "");
        return item.symbol.toUpperCase() === symbol.toUpperCase() || itemClean === clean;
      });
      if (!quote || !position) return { symbol, clean, alerts: [] as VolatilityAlert[], points: [] as MonthlyHistoryPoint[] };

      const alerts: VolatilityAlert[] = [];
      let monthlyPoints: MonthlyHistoryPoint[] = [];
      if (Math.abs(quote.changePercent ?? 0) >= 4) {
        alerts.push({ symbol, name: position.name, period: "day", changePct: quote.changePercent ?? 0, threshold: 4 });
      }

      try {
        const historySymbol = clean || symbol;
        const response = await fetch(`/api/stock-history?symbol=${encodeURIComponent(historySymbol)}&range=1M`);
        const history = await response.json();
        const points = (Array.isArray(history?.points) ? history.points : []).filter(
          (point: { date?: string; close?: number | null }) => Boolean(point.date) && typeof point.close === "number" && point.close > 0,
        );
        monthlyPoints = points.map((point: { date: string; close: number }) => ({ date: point.date, close: point.close }));
        const current = quote.price;
        const weeklyBase = points[Math.max(0, points.length - 6)]?.close;
        const monthlyBase = points[0]?.close;
        const weeklyChange = weeklyBase ? ((current - weeklyBase) / weeklyBase) * 100 : null;
        const monthlyChange = monthlyBase ? ((current - monthlyBase) / monthlyBase) * 100 : null;
        if (weeklyChange != null && Math.abs(weeklyChange) >= 10) alerts.push({ symbol, name: position.name, period: "week", changePct: weeklyChange, threshold: 10 });
        if (monthlyChange != null && Math.abs(monthlyChange) >= 20) alerts.push({ symbol, name: position.name, period: "month", changePct: monthlyChange, threshold: 20 });
      } catch {}
      return { symbol, clean, alerts, points: monthlyPoints };
    })).then((results) => {
      if (!activeEffectRef.current) return;
      // Keep every qualified alert: the badge and cards must represent the same
      // complete set of symbols, not an arbitrary top-eight subset.
      setVolatilityAlerts(results.flatMap(result => result.alerts).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)));
      const historyMap: Record<string, MonthlyHistoryPoint[]> = {};
      results.forEach(result => {
        historyMap[result.symbol.toUpperCase()] = result.points;
        if (result.clean) {
          historyMap[result.clean.toUpperCase()] = result.points;
        }
      });
      setMonthlyHistoryBySymbol(historyMap);
    });
  }

  // 1. Build derived DisplayPosition objects
  const displayPositions = useMemo(() => {
    return buildDisplayPositions(positions, baseCurrency, fxRates);
  }, [positions, baseCurrency, fxRates]);

  const fiveSessionHistoryBySymbol = useMemo<Record<string, MonthlyHistoryPoint[]>>(() => {
    return Object.fromEntries(
      Object.entries(monthlyHistoryBySymbol).map(([symbol, points]) => [
        symbol,
        points.map((point) => {
          try {
            return { ...point, close: convertCurrency(point.close, "USD", baseCurrency, fxRates) };
          } catch {
            return point;
          }
        }),
      ]),
    );
  }, [baseCurrency, fxRates, monthlyHistoryBySymbol]);

  // 2. Compute display stats for each portfolio
  const portfolioStats = useMemo(() => {
    return computeDisplayPortfolioStats(displayPositions, portfolios);
  }, [displayPositions, portfolios]);

  // 3. Build performance timeline points and collect errors
  const performanceResult = useMemo(() => {
    return buildPerformanceTimeline(allPortfolioTxns, quotesMap, baseCurrency, fxRates);
  }, [allPortfolioTxns, quotesMap, baseCurrency, fxRates]);

  // 4. Merge calculations errors and timeline errors, and deduplicate by transactionId/symbol
  const mergedErrors = useMemo(() => {
    const combined = [...calculationErrors, ...performanceResult.errors];
    const seen = new Set<string>();
    return combined.filter(err => {
      const key = `${err.type}:${err.transactionId || ""}:${err.symbol || ""}:${err.date || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [calculationErrors, performanceResult.errors]);

  // Combined KPI calculation memo block
  const kpiSummary = useMemo(() => {
    const pricedPos = displayPositions.filter(item => item.marketValueDisplay != null);
    const portfolioValue = pricedPos.length ? pricedPos.reduce((sum, item) => sum + (item.marketValueDisplay || 0), 0) : null;
    const totalCost = pricedPos.reduce((sum, item) => sum + item.quantity * item.avgCostDisplay, 0);
    const totalPnl = pricedPos.length ? pricedPos.reduce((sum, item) => sum + (item.pnlDisplay || 0), 0) : null;
    const todayPnl = pricedPos.some(item => item.todayPnlDisplay != null) ? pricedPos.reduce((sum, item) => sum + (item.todayPnlDisplay || 0), 0) : null;
    const todayBase = portfolioValue != null && todayPnl != null ? portfolioValue - todayPnl : null;
    const todayReturn = todayBase != null && todayBase !== 0 && todayPnl != null ? (todayPnl / todayBase) * 100 : null;
    const totalReturn = totalPnl == null || totalCost <= 0 ? null : (totalPnl / totalCost) * 100;
    const largestWeight = portfolioValue ? Math.max(0, ...pricedPos.map(item => ((item.marketValueDisplay || 0) / portfolioValue) * 100)) : null;

    return {
      pricedPositions: pricedPos,
      portfolioValue,
      totalCost,
      totalPnl,
      todayPnl,
      todayReturn,
      totalReturn,
      largestWeight
    };
  }, [displayPositions]);

  const todayMovers = useMemo(() => {
    const totalTodayPnl = kpiSummary.todayPnl ?? 0;

    return [...kpiSummary.pricedPositions]
      .filter((position) => position.todayPnlDisplay != null && position.todayPnlDisplay !== 0)
      .map((position) => {
        const todayPnl = position.todayPnlDisplay ?? 0;
        const previousValue = (position.marketValueDisplay ?? 0) - todayPnl;
        const changePct = previousValue !== 0 ? (todayPnl / previousValue) * 100 : 0;
        return {
          ...position,
          todayPnl,
          changePct,
          contributionPct: totalTodayPnl !== 0 ? (todayPnl / totalTodayPnl) * 100 : 0,
        };
      })
      .sort((a, b) => Math.abs(b.todayPnl) - Math.abs(a.todayPnl))
      .slice(0, 10);
  }, [kpiSummary]);

  const dailySession = useMemo(() => {
    const toDisplayPrice = (value: number | null | undefined, currency: string) => {
      if (value == null) return null;
      try {
        return convertCurrency(value, currency, baseCurrency, fxRates);
      } catch {
        return value;
      }
    };

    return summarizeDailySession(displayPositions.map(position => {
      const quote = quotesMap.get(position.symbol.toUpperCase());
      return {
        symbol: position.symbol,
        portfolioId: position.portfolioId,
        portfolioName: position.portfolioName,
        quantity: position.quantity,
        currentPrice: position.currentPriceDisplay,
        previousClose: position.currentPriceDisplay != null && position.todayPnlDisplay != null && position.quantity > 0
          ? position.currentPriceDisplay - position.todayPnlDisplay / position.quantity
          : null,
        sessionHigh: toDisplayPrice(quote?.dayHigh, quote?.currency ?? "USD"),
        sessionLow: toDisplayPrice(quote?.dayLow, quote?.currency ?? "USD"),
        valueChange: position.todayPnlDisplay,
      };
    }));
  }, [baseCurrency, displayPositions, fxRates, quotesMap]);
  const dailySessionTradingDate = useMemo(
    () => Array.from(quotesMap.values())
      .map(quote => quote.tradingDate)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null,
    [quotesMap],
  );

  const monthlyTrend = useMemo(() => {
    const dates = [...new Set(Object.values(monthlyHistoryBySymbol).flatMap(points => points.map(point => point.date)))].sort();
    if (dates.length < 2) return [];
    const coveredPositions = displayPositions.filter(
      position => (monthlyHistoryBySymbol[position.symbol.toUpperCase()]?.length ?? 0) > 0,
    );
    if (coveredPositions.length === 0) return [];

    const closeAtOrBefore = (points: MonthlyHistoryPoint[], date: string) => {
      for (let index = points.length - 1; index >= 0; index -= 1) {
        if (points[index].date <= date) return points[index].close;
      }
      return null;
    };

    const values = dates.map(date => {
      let value = 0;
      let coveredCount = 0;
      coveredPositions.forEach(position => {
        const history = monthlyHistoryBySymbol[position.symbol.toUpperCase()] ?? [];
        const closeUsd = closeAtOrBefore(history, date);
        if (closeUsd == null) return;
        try {
          value += position.quantity * convertCurrency(closeUsd, "USD", baseCurrency, fxRates);
          coveredCount += 1;
        } catch {}
      });
      return coveredCount === coveredPositions.length ? { date, value } : null;
    }).filter((point): point is { date: string; value: number } => point != null);

    const baseline = values[0]?.value ?? 0;
    if (baseline <= 0) return [];
    return values.map(point => ({
      ...point,
      valueChange: point.value - baseline,
      changePercent: ((point.value - baseline) / baseline) * 100,
    }));
  }, [baseCurrency, displayPositions, fxRates, monthlyHistoryBySymbol]);

  const marketHistoryReady = useMemo(() => {
    const symbols = [...new Set(displayPositions.map(position => position.symbol.toUpperCase()))];
    return symbols.length > 0 && symbols.every(symbol => Object.prototype.hasOwnProperty.call(monthlyHistoryBySymbol, symbol));
  }, [displayPositions, monthlyHistoryBySymbol]);

  const assetTrend = useMemo<AssetTrendPoint[]>(() => monthlyTrend.map(point => ({
    date: point.date,
    portfolioValue: point.value,
    valueChange: point.valueChange,
    changePercent: point.changePercent,
  })), [monthlyTrend]);

  const transactionSummary = useMemo(() => {
    const transactions = allPortfolioTxns.flatMap(({ portfolio, txs }) =>
      txs.map(tx => ({ ...tx, portfolioName: portfolio.name }))
    );
    const toBase = (tx: Transaction) => {
      try { return convertCurrency(tx.quantity * tx.price, tx.currency, baseCurrency, fxRates); }
      catch { return tx.quantity * tx.price; }
    };
    const side = (tx: Transaction) => String(tx.type).toUpperCase().includes("SELL") ? "SELL" : "BUY";
    const buyTotal = transactions.filter(tx => side(tx) === "BUY").reduce((sum, tx) => sum + toBase(tx), 0);
    const sellTotal = transactions.filter(tx => side(tx) === "SELL").reduce((sum, tx) => sum + toBase(tx), 0);
    const filteredAll = transactions
      .filter(tx => transactionFilter === "ALL" || side(tx) === transactionFilter)
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
    const filtered = showAllTransactions ? filteredAll : filteredAll.slice(0, 8);
    return { count: transactions.length, filteredCount: filteredAll.length, buyTotal, sellTotal, filtered, toBase, side };
  }, [allPortfolioTxns, baseCurrency, fxRates, transactionFilter, showAllTransactions]);

  useEffect(() => {
    if (loading) return;
    const transactions = allPortfolioTxns.flatMap(({ txs }) => txs);
    const firstBuyBySymbol = transactions.reduce<Record<string, string>>((result, tx) => {
      if (String(tx.type).toUpperCase() !== "BUY") return result;
      const symbol = String(tx.assetSymbol || "").toUpperCase();
      const date = String(tx.transactionDate || "").slice(0, 10);
      if (symbol && date && (!result[symbol] || date < result[symbol])) result[symbol] = date;
      return result;
    }, {});
    const symbols = Object.entries(firstBuyBySymbol);
    if (symbols.length === 0) { setDividendEvents([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      Promise.all(symbols.slice(0, 24).map(async ([symbol, startDate]) => {
        try {
          const response = await fetch(`/api/stock-dividends?symbol=${encodeURIComponent(symbol)}&startDate=${startDate}`);
          return response.ok ? await response.json() : [];
        } catch { return []; }
      })).then((groups) => {
        if (!cancelled) setDividendEvents(groups.flat().filter((event): event is DividendEvent => Boolean(event?.symbol && event?.recordDate && event?.paymentDate)));
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [allPortfolioTxns, loading]);

  const earningsSummary = useMemo(() => {
    type Lot = { quantity: number; unitCost: number };
    const transactions = allPortfolioTxns.flatMap(({ txs }) => txs).sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
    const convert = (value: number, currency: string) => { try { return convertCurrency(value, currency, baseCurrency, fxRates); } catch { return value; } };
    const realizedGain = (method: "AVERAGE" | "FIFO" | "LIFO") => {
      const lots = new Map<string, Lot[]>(); let result = 0;
      transactions.forEach(tx => {
        const symbol = String(tx.assetSymbol || "").toUpperCase(); const quantity = Math.max(0, Number(tx.quantity || 0)); const side = String(tx.type || "").toUpperCase();
        if (!symbol || !quantity || (side !== "BUY" && side !== "SELL")) return;
        const symbolLots = lots.get(symbol) ?? []; const unitPrice = convert(Number(tx.price || 0), tx.currency); const fee = convert(Math.max(0, Number(tx.fee || 0)), tx.currency);
        if (side === "BUY") { symbolLots.push({ quantity, unitCost: unitPrice + fee / quantity }); lots.set(symbol, symbolLots); return; }
        const held = symbolLots.reduce((sum, lot) => sum + lot.quantity, 0); let remaining = Math.min(quantity, held); let cost = 0;
        if (method === "AVERAGE") {
          const average = held ? symbolLots.reduce((sum, lot) => sum + lot.quantity * lot.unitCost, 0) / held : 0;
          cost = remaining * average;
          let reduce = remaining; symbolLots.forEach(lot => { const used = Math.min(lot.quantity, reduce); lot.quantity -= used; reduce -= used; });
        } else while (remaining > 0) {
          const index = method === "FIFO" ? 0 : symbolLots.length - 1; const lot = symbolLots[index]; const used = Math.min(lot.quantity, remaining);
          cost += used * lot.unitCost; lot.quantity -= used; remaining -= used; if (lot.quantity === 0) symbolLots.splice(index, 1);
        }
        const sold = Math.min(quantity, held); result += sold * unitPrice - fee - cost;
      });
      return result;
    };
    const realized = { AVERAGE: realizedGain("AVERAGE"), FIFO: realizedGain("FIFO"), LIFO: realizedGain("LIFO") };
    const dividendIncome = dividendEvents.reduce((sum, event) => {
      if (event.type !== "CASH" || new Date(event.paymentDate).getTime() > Date.now()) return sum;
      const held = transactions.filter(tx => String(tx.assetSymbol).toUpperCase() === event.symbol.toUpperCase() && new Date(tx.transactionDate).getTime() <= new Date(event.recordDate).getTime()).reduce((quantity, tx) => quantity + (String(tx.type).toUpperCase() === "BUY" ? Number(tx.quantity) : String(tx.type).toUpperCase() === "SELL" ? -Number(tx.quantity) : 0), 0);
      const currency = transactions.find(tx => String(tx.assetSymbol).toUpperCase() === event.symbol.toUpperCase())?.currency ?? baseCurrency;
      return sum + Math.max(0, held) * convert(Number(event.dividendRate || 0), currency);
    }, 0);
    const stockGain = Math.max(0, kpiSummary.totalPnl ?? 0);
    const saleGain = Math.max(0, realized[realizedMethod]);
    return { stockGain, saleGain, dividendIncome, realized, total: stockGain + saleGain + dividendIncome };
  }, [allPortfolioTxns, baseCurrency, dividendEvents, fxRates, kpiSummary.totalPnl, realizedMethod]);

  useEffect(() => {
    if (!showTodayBreakdown || todayMovers.length === 0) return;

    let cancelled = false;
    setMoverNewsLoading(true);
    Promise.all(todayMovers.map(async (mover) => {
      try {
        const response = await fetch(`/api/stock-news?symbol=${encodeURIComponent(mover.symbol)}&compact=1`);
        const data = await response.json();
        const recent = (Array.isArray(data) ? data : [])
          .filter((item: NewsItem) => {
            const published = new Date(item.publishedAt).getTime();
            return Number.isFinite(published) && Date.now() - published <= 48 * 60 * 60 * 1000;
          })
          .sort((a: NewsItem, b: NewsItem) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, 1);
        return [mover.symbol, recent] as const;
      } catch {
        return [mover.symbol, []] as const;
      }
    })).then((entries) => {
      if (!cancelled) setMoverNews(Object.fromEntries(entries));
    }).finally(() => {
      if (!cancelled) setMoverNewsLoading(false);
    });

    return () => { cancelled = true; };
  }, [showTodayBreakdown, todayMovers]);

  const allocation = useMemo(() => {
    const { portfolioValue, pricedPositions } = kpiSummary;
    if (!portfolioValue) return [];
    const byType = new Map<string, number>();
    pricedPositions.forEach(item => byType.set(item.assetType, (byType.get(item.assetType) || 0) + (item.marketValue || 0)));
    return [...byType.entries()].map(([name, value], index) => ({
      name,
      value,
      weight: (value / portfolioValue) * 100,
      color: chartColors[index % chartColors.length],
    }));
  }, [kpiSummary]);

  async function submitCreatePortfolio() {
    if (!portfolioForm.name.trim()) return;
    try {
      const created = await createPortfolio(portfolioForm.name.trim(), portfolioForm.currency, portfolioForm.type);
      const next = [...portfolios, created];
      setPortfolios(next);
      setPortfolioForm({ name: "", currency: "USD", type: "STOCKS" });
      setModal(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleTransferPosition(sourcePortfolioId: string, targetPortfolioId: string, symbol: string) {
    setError("");
    try {
      const result = await transferPortfolioPosition(sourcePortfolioId, targetPortfolioId, symbol);
      await loadDashboardData(portfolios);
      return result;
    } catch (e: any) {
      setError(e.message || (isVi ? "Không thể chuyển cổ phiếu sang danh mục đích." : "Could not move the position."));
      throw e;
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
    try {
      await deletePortfolio(id);
      const next = portfolios.filter(item => item.id !== id);
      setPortfolios(next);
      
      // Update state without full API re-fetch:
      setPositions(prev => prev.filter(pos => pos.portfolioId !== id));
      setDeleteTarget(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDeleteWatchlist(id: string) {
    try {
      await deleteWatchlist(id);
      setWatchlists(prev => prev.filter(item => item.id !== id));
      setDeleteTarget(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDeleteGoal(id: string) {
    try {
      await deleteGoal(id);
      setGoals(prev => prev.filter(item => item.id !== id));
      setDeleteTarget(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function loadNews(queryOverride?: string, currentPositions?: DashboardPosition[]) {
    activeNewsRef.current = true;
    const requestId = ++newsRequestRef.current;
    setNewsLoading(true);
    const assetDirectory = new Map<string, string>();
    const normalizedQuery = (queryOverride ?? newsQuery).trim().toLowerCase();

    // Use current positions or state positions to avoid transaction N+1 queries
    const activePositions = currentPositions ?? positions;
    activePositions.forEach(pos => {
      const symbol = pos.symbol.toUpperCase();
      assetDirectory.set(symbol, pos.name || symbol);
    });
    
    // We fetch watchlist items in parallel
    await Promise.all(watchlists.map(async watchlist => {
      try {
        const items = await getWatchlistItems(watchlist.id);
        if (!activeNewsRef.current || requestId !== newsRequestRef.current) return;
        items.forEach(item => {
          const symbol = String(item.assetSymbol || "").toUpperCase();
          if (!symbol) return;
          assetDirectory.set(symbol, item.assetName || symbol);
        });
      } catch {}
    }));

    if (!activeNewsRef.current || requestId !== newsRequestRef.current) return;

    const allAssets = [...assetDirectory.entries()]
      .map(([symbol, name]) => ({ symbol, name }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    setNewsAssets(allAssets);

    let targetSymbols = (normalizedQuery
      ? allAssets.filter((asset) => {
          const haystack = `${asset.symbol} ${asset.name}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : allAssets
    )
      .map((asset) => asset.symbol);

    if (normalizedQuery && targetSymbols.length === 0) {
      try {
        const searchResponse = await fetch(`/api/stock-search?q=${encodeURIComponent(queryOverride ?? newsQuery)}`);
        const searchResults = await searchResponse.json();
        targetSymbols = (Array.isArray(searchResults) ? searchResults : searchResults?.quotes ?? [])
          .map((item: any) => String(item.symbol ?? "").toUpperCase())
          .filter(Boolean)
          .slice(0, 3);
      } catch {}
    }

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
        if (!activeNewsRef.current || requestId !== newsRequestRef.current) return;
        if (Array.isArray(data)) fetched.push(...data);
      } catch {}
    }));

    if (!activeNewsRef.current || requestId !== newsRequestRef.current) return;

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentNews = fetched.filter(item => {
      const publishedAt = new Date(item.publishedAt).getTime();
      return Number.isFinite(publishedAt) && publishedAt >= sevenDaysAgo;
    });
    recentNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    setNewsItems([...new Map(recentNews.map((item) => [item.url.replace(/[?#].*$/, ""), item])).values()].slice(0, 20));
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

  function openCsvImporter() {
    if (!portfolios.length) {
      setError(isVi ? "Hãy tạo danh mục trước khi nhập giao dịch." : "Create a portfolio before importing transactions.");
      setModal("portfolio");
      return;
    }
    setCsvPortfolioId(current => portfolios.some(portfolio => portfolio.id === current) ? current : portfolios[0].id);
    setCsvFileName("");
    setCsvPreview(null);
    setCsvImportError("");
    setCsvImportedCount(null);
    setCsvImportOpen(true);
  }

  function closeCsvImporter() {
    if (csvImportBusy) return;
    setCsvImportOpen(false);
    setCsvFileName("");
    setCsvPreview(null);
    setCsvImportError("");
    setCsvImportedCount(null);
    if (csvFileInputRef.current) csvFileInputRef.current.value = "";
  }

  async function handleCsvFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !csvPortfolioId) return;

    setCsvImportBusy(true);
    setCsvImportError("");
    setCsvImportedCount(null);
    setCsvPreview(null);
    setCsvFileName(file.name);

    try {
      const rows = parseTransactionCsv(await file.text());
      setCsvPreview(await previewTransactionImport(csvPortfolioId, rows));
    } catch (cause) {
      setCsvImportError(cause instanceof Error ? cause.message : (isVi ? "Không thể đọc tệp CSV." : "Could not read the CSV file."));
    } finally {
      setCsvImportBusy(false);
      event.target.value = "";
    }
  }

  async function confirmCsvImport() {
    if (!csvPreview?.readyToImport || !csvPortfolioId) return;

    setCsvImportBusy(true);
    setCsvImportError("");
    try {
      const imported = await commitTransactionImport(csvPortfolioId, csvPreview.rows);
      setCsvImportedCount(imported.length);
      setCsvPreview(null);
    } catch (cause) {
      setCsvImportError(cause instanceof Error ? cause.message : (isVi ? "Không thể nhập giao dịch." : "Could not import transactions."));
      setCsvImportBusy(false);
      return;
    }

    try {
      await loadDashboardData(portfolios);
    } catch {
      setCsvImportError(
        isVi
          ? "Giao dịch đã được nhập, nhưng Dashboard chưa tải lại được. Hãy làm mới trang."
          : "Transactions were imported, but the Dashboard could not refresh. Reload the page.",
      );
    } finally {
      setCsvImportBusy(false);
    }
  }

  const currencyControls = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-0.5 rounded-xl border border-white/5 bg-zinc-950/60 p-1">
        {(["USD", "VND"] as const).map((curr) => (
          <button
            key={curr}
            type="button"
            aria-pressed={baseCurrency === curr}
            onClick={() => setBaseCurrency(curr)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${baseCurrency === curr ? "bg-white/[0.08] text-white" : "text-slate-400 hover:text-white"}`}
          >
            {curr}
          </button>
        ))}
      </div>
      {fxStatus === "fallback" && (
        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-400" title={fxMetadata.source}>
          <AlertTriangle className="mr-1 h-3 w-3" /> FX FALLBACK
        </Badge>
      )}
    </div>
  );

  const workspace = (
        <div className="min-w-0 space-y-5">

          {error && (
            <div className="antigravity-panel p-4 text-sm text-red-400 border border-red-500/20 bg-red-500/5 backdrop-blur">
              {error}
            </div>
          )}

          {mergedErrors.map((err, idx) => (
            <div key={idx} className="antigravity-panel p-4 text-xs text-amber-400 border border-amber-500/20 bg-amber-500/5 backdrop-blur flex flex-col gap-1">
              <span className="font-bold">⚠️ {err.type}: {err.symbol}</span>
              <span>{err.message}</span>
            </div>
          ))}

          <div className="antigravity-panel overflow-hidden">
            {/* Embedded Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-white/[0.01] p-4 sm:p-5">
              <div className="min-w-0 max-w-full">
                <h2 className="sr-only">{isVi ? "Không gian quản lý" : "Management workspace"}</h2>
                
                {/* Horizontal Tab Buttons inside Table Card */}
                <div className="flex max-w-full gap-0.5 overflow-x-auto rounded-xl border border-white/5 bg-zinc-950/60 p-1" aria-label={isVi ? "Nội dung dashboard" : "Dashboard sections"}>
                  {(["portfolios", "watchlists", "goals", "news", "transactions"] as Tab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      aria-pressed={active === tab}
                      onClick={() => {
                        setActive(tab);
                        if (tab === "news" && newsItems.length === 0) loadNews();
                      }}
                      className={`shrink-0 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                        active === tab
                          ? "bg-white/[0.08] text-white shadow-sm"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                      }`}
                    >
                      {tab === "portfolios"
                        ? t("sidebar.holdings")
                        : tab === "watchlists"
                        ? t("sidebar.watchlist")
                        : tab === "goals"
                        ? t("dashboard.goals")
                        : tab === "news"
                        ? t("dashboard.news")
                        : (isVi ? "Lịch giao dịch" : "Transactions")}
                    </button>
                  ))}
                </div>


              </div>

              {/* Action Buttons in Header */}
              <div className="flex flex-wrap items-center gap-2">
                {(active === "portfolios" || active === "transactions") && (
                  <>
                    <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={openFirstPortfolio}>
                      <Plus className="h-3 w-3 mr-1" /> {t("dashboard.addTransaction")}
                    </Button>
                    <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={openCsvImporter}>
                      <Upload className="h-3 w-3 mr-1" /> {t("dashboard.importCsv")}
                    </Button>
                  </>
                )}
                {active === "watchlists" && (
                  <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => setModal("watchlist")}>
                    <Plus className="h-3 w-5" /> {t("dashboard.addWatchlist")}
                  </Button>
                )}
                {active === "goals" && (
                  <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => setModal("goal")}>
                    <Plus className="h-3 w-5" /> {t("dashboard.addGoal")}
                  </Button>
                )}
                {active === "news" && (
                  <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => loadNews()} disabled={newsLoading}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${newsLoading ? "animate-spin" : ""}`} /> {t("common.refresh")}
                  </Button>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="p-4 sm:p-5">
              {loading ? (
                <div className="rainbow-border p-6 rounded-xl space-y-3 bg-white/[0.01]">
                  <Skeleton className="h-6 w-full bg-white/5" />
                  <Skeleton className="h-10 w-full bg-white/5" />
                  <Skeleton className="h-10 w-full bg-white/5" />
                </div>
              ) : active === "portfolios" ? (
                portfolios.length === 0 && kpiSummary.pricedPositions.length === 0 ? (
                  <div className="space-y-4 py-10 text-center">
                    <p className="text-sm text-slate-400">{t("dashboard.noHoldings")}</p>
                    <Button className="antigravity-btn" onClick={() => setModal("portfolio")}>
                      <Plus className="mr-1.5 h-4 w-4" /> {t("dashboard.createPortfolio")}
                    </Button>
                  </div>
                ) : (
                  <div>
                    {/* Current Holdings Table */}
                    <div className="custom-scrollbar">
                      <Table aria-label={t("sidebar.holdings")}>
                        <TableHeader className="sticky top-0 bg-[var(--table)]/90 backdrop-blur-md z-10 shadow-sm shadow-white/5">
                          <TableRow className="border-[var(--border)] hover:bg-transparent">
                            {["symbol", "name", "quantity", "avgCost", "currentPrice", "fiveSessions", "marketValue", "pnl", "return", "weight"].map(key => {
                              const label = key === "symbol" ? t("portfolio.assetSymbol")
                                          : key === "name" ? t("portfolio.assetName")
                                          : key === "quantity" ? t("common.quantity")
                                          : key === "avgCost" ? t("portfolio.avgPrice")
                                          : key === "currentPrice" ? t("portfolio.currentPrice")
                                          : key === "fiveSessions" ? (isVi ? "Giá 5 phiên" : "5 sessions")
                                          : key === "marketValue" ? t("portfolio.marketValue")
                                          : key === "pnl" ? "P/L"
                                          : key === "return" ? t("dashboard.totalReturn")
                                          : t("portfolio.weight");

                              let stickyClass = "";
                              if (key === "symbol") stickyClass = "sticky left-0 bg-[var(--table)] z-30 w-[128px] min-w-[128px] max-w-[128px] border-r border-[var(--border)]";
                              if (key === "name") stickyClass = "sticky left-[128px] bg-[var(--table)] z-30 w-[150px] min-w-[150px] max-w-[150px] border-r border-[var(--border)]";
                              return (
                                <TableHead
                                  key={key}
                                  className={`text-slate-400 font-bold text-xs uppercase tracking-wider py-4 whitespace-normal break-words ${
                                    key === "symbol" || key === "name" ? "" : key === "fiveSessions" ? "min-w-[132px] text-center" : "text-right min-w-[120px]"
                                  } ${stickyClass}`}
                                >
                                  {label}
                                </TableHead>
                              );
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...kpiSummary.pricedPositions].sort((a, b) => (b.marketValueDisplay || 0) - (a.marketValueDisplay || 0)).map(position => {
                             const weight = kpiSummary.portfolioValue ? ((position.marketValueDisplay || 0) / kpiSummary.portfolioValue) * 100 : null;
                             const negative = position.pnlDisplay != null && position.pnlDisplay < 0;

                             return (
                               <TableRow key={`${position.portfolioId}-${position.symbol}`} className="border-[var(--border)] hover:bg-[var(--accent)]/10 transition-colors group">
                                 <TableCell className="font-semibold text-white py-4 sticky left-0 bg-[var(--table)] group-hover:bg-[var(--table)] group-hover:brightness-125 z-20 w-[128px] min-w-[128px] max-w-[128px] border-r border-[var(--border)]">
                                   <div className="flex min-w-0 items-center gap-2">
                                     <AssetLogo symbol={position.symbol} name={position.name} className="h-8 w-8" />
                                     <span className="min-w-0 break-words leading-tight">{position.symbol}</span>
                                   </div>
                                 </TableCell>
                                 <TableCell className="text-slate-300 py-4 whitespace-normal break-words sticky left-[128px] bg-[var(--table)] group-hover:bg-[var(--table)] group-hover:brightness-125 z-20 w-[150px] min-w-[150px] max-w-[150px] border-r border-[var(--border)]">
                                   <span className="block">{position.name}</span>
                                   <span className="mt-1 block text-[10px] font-semibold text-cyan-300/80">
                                     {isVi ? "Danh mục" : "Portfolio"}: {position.portfolioName}
                                   </span>
                                 </TableCell>
                                 <TableCell className="text-right text-slate-300 py-4 whitespace-normal min-w-[120px] break-words"><span title={position.quantity.toLocaleString(numberLocale, { maximumFractionDigits: 6 })}>{fmtCompactNumber(position.quantity, numberLocale)}</span></TableCell>
                                 <TableCell className="text-right text-slate-300 py-4 whitespace-normal min-w-[120px] break-words">{financeFmtMoney(position.avgCostDisplay, baseCurrency)}</TableCell>
                                 <TableCell className="text-right text-slate-300 py-4 whitespace-normal min-w-[120px] break-words">{financeFmtMoney(position.currentPriceDisplay, baseCurrency)}</TableCell>
                                 <TableCell className="min-w-[132px] py-2 text-center">
                                   <FiveSessionPriceSparkline
                                     symbol={position.symbol}
                                     points={fiveSessionHistoryBySymbol[position.symbol.toUpperCase()]}
                                     currency={baseCurrency}
                                     locale={numberLocale}
                                   />
                                 </TableCell>
                                 <TableCell className="text-right font-medium text-white py-4 whitespace-normal min-w-[120px] break-words"><span title={financeFmtMoney(position.marketValueDisplay, baseCurrency)}>{fmtCompactMoney(position.marketValueDisplay, baseCurrency, numberLocale)}</span></TableCell>
                                 <TableCell className="text-right py-4 whitespace-normal min-w-[120px] break-words">
                                   <Badge variant={negative ? "destructive" : "default"} className={`font-bold ${negative ? "" : "bg-emerald-500/10 text-emerald-400 border-none"}`}>
                                     <span title={financeFmtSignedMoney(position.pnlDisplay, baseCurrency)}>{fmtCompactSignedMoney(position.pnlDisplay, baseCurrency, numberLocale)}</span>
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
                    <div className="mt-5 border-t border-white/5 pt-5">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-white tracking-widest uppercase">{t("dashboard.portfolios")}</h3>
                        <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => setModal("portfolio")}>
                          <Plus className="h-3 w-5" /> {t("common.add")}
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {portfolios.map(portfolio => {
                          const stat = portfolioStats[portfolio.id];
                          const negative = stat?.returnPct != null && stat.returnPct < 0;
                          return (
                            <div key={portfolio.id} className="antigravity-panel flex min-w-0 flex-wrap items-center justify-between gap-3 bg-transparent p-4 transition-colors hover:bg-white/[0.01]">
                              <button onClick={() => (window.location.href = `/portfolio/${portfolio.id}`)} className="min-w-0 flex-1 break-words text-left">
                                <p className="font-semibold text-white">{portfolio.name}</p>
                                <p className="mt-1 text-xs text-slate-500">{portfolio.type} · {portfolio.baseCurrency} · <span title={financeFmtMoney(stat?.value, baseCurrency)}>{fmtCompactMoney(stat?.value, baseCurrency, numberLocale)}</span></p>
                              </button>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => (window.location.href = `/portfolio/${portfolio.id}`)}>
                                  <Eye className="h-3 w-3 mr-1" /> {t("dashboard.view")}
                                </Button>
                                <Badge variant={negative ? "destructive" : "default"} className={`font-bold ${negative ? "" : "bg-emerald-500/10 text-emerald-400 border-none"}`}>
                                  {fmtPct(stat?.returnPct)}
                                </Badge>
                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-400 transition-colors bg-transparent border-none" onClick={() => setDeleteTarget({ type: "portfolio", id: portfolio.id, name: portfolio.name })} aria-label="Delete portfolio">
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
                  <div className="py-12 text-center text-sm text-slate-500 font-medium">{t("dashboard.noWatchlists")}</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {watchlists.map(watchlist => (
                      <div key={watchlist.id} className="antigravity-panel flex min-w-0 flex-wrap items-center justify-between gap-3 bg-transparent p-4 transition-colors hover:bg-white/[0.01]">
                        <p className="min-w-0 flex-1 break-words font-semibold text-white">{watchlist.name}</p>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => (window.location.href = `/watchlist/${watchlist.id}`)}>{t("dashboard.view")}</Button>
                          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-colors" onClick={() => setDeleteTarget({ type: "watchlist", id: watchlist.id, name: watchlist.name })}>{t("dashboard.delete")}</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : active === "goals" ? (
                goals.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500 font-medium">{t("dashboard.noGoals")}</div>
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
                            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-400 transition-colors bg-transparent border-none" onClick={() => setDeleteTarget({ type: "goal", id: goal.id, name: goal.name })}>{t("dashboard.delete")}</Button>
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
              ) : active === "transactions" ? (
                renderTransactionLog()
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{t("dashboard.filterNews")}</p>
                      <p className="text-xs text-slate-400">{t("dashboard.filterNewsDesc")}</p>
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
                        placeholder={t("dashboard.searchNewsPlaceholder")}
                        className="border-white/10 bg-black/30 text-white placeholder:text-slate-500"
                      />
                      <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => loadNews()}>
                        {t("dashboard.searchButton")}
                      </Button>
                    </div>
                  </div>

                  {newsAssets.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newsAssets.map((asset) => (
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
                      {newsQuery.trim() ? t("dashboard.noNewsAsset") : t("dashboard.noNewsDefault")}
                    </div>
                  ) : (
                    <div className="max-h-[600px] space-y-4 overflow-y-auto pr-2">
                    {newsItems.map((item, index) => (
                      <div key={`${item.url}-${index}`} className="antigravity-panel p-5 hover:bg-white/[0.01] transition-all bg-transparent">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
                          <Badge variant="outline" className="border-white/10 text-white/70">{item.symbol}</Badge>
                          <span className="text-slate-500">{item.source}</span>
                          <span className="text-slate-500">{new Date(item.publishedAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}</span>
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
  );

  const allocationPanel = allocation.length > 0 ? (
            <div className="antigravity-panel space-y-4 bg-transparent p-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">{t("dashboard.distribution")}</h3>
                <Badge variant="outline" className="border-white/10 text-slate-400">{t("portfolio.weight")} %</Badge>
              </div>
              <div className="relative h-[220px]">
                <AutoSizedChart>
                  <PieChart>
                    <Pie data={allocation} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                      {allocation.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="space-y-1 rounded-lg border border-white/10 bg-slate-950/95 p-2.5 text-xs shadow-xl backdrop-blur">
                          <p className="font-bold uppercase text-white">{data.name}</p>
                          <p className="text-slate-300">{t("portfolio.marketValue")}: {fmtCompactMoney(data.value, baseCurrency, numberLocale)}</p>
                          <p className="font-semibold text-cyan-400">{t("portfolio.weight")}: {data.weight.toFixed(2)}%</p>
                        </div>
                      );
                    }} />
                  </PieChart>
                </AutoSizedChart>
                <div className="pointer-events-none absolute inset-0 z-0 flex select-none flex-col items-center justify-center">
                  <p className="text-[13px] font-black text-white" title={financeFmtMoney(kpiSummary.portfolioValue, baseCurrency)}>{fmtCompactMoney(kpiSummary.portfolioValue, baseCurrency, numberLocale)}</p>
                  <p className={`mt-0.5 text-[10px] font-bold ${getValueTone(kpiSummary.totalReturn) === "positive" ? "text-emerald-400" : getValueTone(kpiSummary.totalReturn) === "negative" ? "text-red-400" : "text-slate-400"}`}>{fmtPct(kpiSummary.totalReturn)}</p>
                  <p className="mt-0.5 text-[8px] uppercase tracking-wider text-slate-500">{kpiSummary.pricedPositions.length} {kpiSummary.pricedPositions.length === 1 ? "Holding" : "Holdings"}</p>
                  {kpiSummary.largestWeight && kpiSummary.largestWeight > 40 && <p className="mt-0.5 text-[7.5px] text-amber-400">⚠ {kpiSummary.largestWeight.toFixed(0)}% top asset</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                {allocation.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-slate-400">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="ml-auto font-mono font-bold text-white">{item.weight.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
  ) : null;

  const metrics = (
        <>
          <div data-dashboard-metric className="antigravity-panel flex flex-col p-4 hover:bg-white/[0.01] transition-all bg-transparent">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("dashboard.totalAssets")}</p>
            <p className="text-xl font-black text-white mt-2" title={financeFmtMoney(kpiSummary.portfolioValue, baseCurrency)}>
              {fmtCompactMoney(kpiSummary.portfolioValue, baseCurrency, numberLocale)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {kpiSummary.todayPnl != null ? `${fmtCompactSignedMoney(kpiSummary.todayPnl, baseCurrency, numberLocale)} ${isVi ? "hôm nay" : "today"} · ${fmtPct(kpiSummary.todayReturn)}` : t("dashboard.totalValue")}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">{isVi ? "Vốn đầu tư" : "Invested"}: {fmtCompactMoney(kpiSummary.totalCost, baseCurrency, numberLocale)}</p>
          </div>
          <div data-dashboard-metric className="antigravity-panel flex flex-col p-4 hover:bg-white/[0.01] transition-all bg-transparent">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("dashboard.totalCost")}</p>
            <p className="text-xl font-black text-white mt-2" title={financeFmtMoney(kpiSummary.totalCost, baseCurrency)}>{fmtCompactMoney(kpiSummary.totalCost, baseCurrency, numberLocale)}</p>
            <p className="text-[10px] text-slate-400 mt-1">{t("dashboard.totalCostNote")}</p>
          </div>
          <div data-dashboard-metric className="antigravity-panel flex flex-col p-4 hover:bg-white/[0.01] transition-all bg-transparent">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("dashboard.netGain")}</p>
              <button
                type="button"
                onClick={() => {
                  setShowIncomeBreakdown((value) => !value);
                  setShowTodayBreakdown(false);
                }}
                aria-expanded={showIncomeBreakdown}
                aria-controls="dashboard-income-details"
                className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
              >
                {showIncomeBreakdown ? (isVi ? "Thu gọn" : "Collapse") : (isVi ? "Chi tiết" : "Details")}
              </button>
            </div>
            <p className={`text-xl font-black mt-2 ${getValueTone(kpiSummary.totalPnl) === "positive" ? "text-emerald-400" : getValueTone(kpiSummary.totalPnl) === "negative" ? "text-red-400" : "text-slate-400"}`} title={financeFmtSignedMoney(kpiSummary.totalPnl, baseCurrency)}>
              {fmtCompactSignedMoney(kpiSummary.totalPnl, baseCurrency, numberLocale)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              <span className="font-bold">{fmtPct(kpiSummary.totalReturn)}</span> {isVi ? "toàn thời gian" : "all time"}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">{isVi ? "Theo giá hiện tại · từ vốn đầu tư" : "Current mark · from invested cost"}</p>
          </div>
          <div data-dashboard-metric className="antigravity-panel flex min-w-0 flex-col p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("dashboard.todayPnl")}</p>
            <p className={`text-xl font-black mt-2 ${getValueTone(kpiSummary.todayPnl) === "positive" ? "text-emerald-400" : getValueTone(kpiSummary.todayPnl) === "negative" ? "text-red-400" : "text-slate-400"}`}>
              {fmtCompactSignedMoney(kpiSummary.todayPnl, baseCurrency, numberLocale)}
            </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTodayBreakdown((value) => !value);
                  setShowIncomeBreakdown(false);
                }}
                aria-expanded={showTodayBreakdown}
                aria-controls="dashboard-today-movers"
                className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
              >
                {showTodayBreakdown ? (isVi ? "Thu gọn" : "Collapse") : (isVi ? "Xem mã" : "View stocks")}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t("dashboard.todayPnlNote")}</p>
          </div>
            {showIncomeBreakdown && (
              <section
                id="dashboard-income-details"
                data-dashboard-detail
                aria-label={isVi ? "Chi tiết thu nhập" : "Income details"}
                className="antigravity-panel col-span-full p-4"
              >
                <div className="grid gap-4 sm:grid-cols-[minmax(140px,0.75fr)_minmax(0,1.35fr)_minmax(190px,1fr)] sm:items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{isVi ? "Tổng kiếm được" : "Total earned"}</p>
                    <p className="mt-1 text-lg font-black text-emerald-400" title={financeFmtMoney(earningsSummary.total, baseCurrency)}>
                      {fmtCompactMoney(earningsSummary.total, baseCurrency, numberLocale)}
                    </p>
                    <p className="mt-1 text-[9px] text-slate-500">{isVi ? "Chỉ tính các khoản lãi" : "Gains only"}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-white/5 sm:border-x sm:px-4">
                    <span className="text-[9px] text-slate-500">{isVi ? "CP hiện tại" : "Stock"}<b className="mt-1 block text-xs text-emerald-300">{fmtCompactMoney(earningsSummary.stockGain, baseCurrency, numberLocale)}</b></span>
                    <span className="text-[9px] text-slate-500">{isVi ? "Lãi bán" : "Sales"}<b className="mt-1 block text-xs text-emerald-300">{fmtCompactMoney(earningsSummary.saleGain, baseCurrency, numberLocale)}</b></span>
                    <span className="text-[9px] text-slate-500">{isVi ? "Cổ tức" : "Dividend"}<b className="mt-1 block text-xs text-emerald-300">{fmtCompactMoney(earningsSummary.dividendIncome, baseCurrency, numberLocale)}</b></span>
                  </div>

                  <div>
                    <div className="flex rounded-lg border border-white/5 bg-black/15 p-0.5">
                      {(["AVERAGE", "FIFO", "LIFO"] as const).map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setRealizedMethod(method)}
                          className={`flex-1 rounded-md px-2 py-1.5 text-[9px] font-bold ${realizedMethod === method ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
                        >
                          {method === "AVERAGE" ? (isVi ? "Bình quân" : "Average") : method}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[9px] text-slate-500">
                      {isVi ? `Lãi bán theo ${realizedMethod === "AVERAGE" ? "bình quân" : realizedMethod}` : `Sale gain by ${realizedMethod.toLowerCase()}`}: {fmtCompactSignedMoney(earningsSummary.realized[realizedMethod], baseCurrency, numberLocale)}
                    </p>
                  </div>
                </div>
              </section>
            )}
            {showTodayBreakdown && (
              <div id="dashboard-today-movers" data-dashboard-detail className="antigravity-panel col-span-full p-4">
                <div className="mb-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  <span>{isVi ? "Mã biến động mạnh nhất" : "Biggest movers"}</span>
                  <span>{isVi ? "Tin gần đây" : "Recent news"}</span>
                </div>
                {todayMovers.length === 0 ? (
                  <p className="py-2 text-xs text-slate-500">{isVi ? "Chưa có dữ liệu biến động theo mã." : "No per-stock move data yet."}</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {todayMovers.map((mover) => {
                      const positive = mover.todayPnl > 0;
                      const relatedNews = moverNews[mover.symbol]?.[0];
                      return (
                        <div key={`${mover.portfolioId}-${mover.symbol}`} className="rounded-xl border border-white/5 bg-white/[0.025] p-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white">{mover.symbol}</p>
                              <p className="truncate text-[10px] text-slate-500">{mover.name}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-black ${positive ? "text-emerald-400" : "text-red-400"}`}>
                                {fmtCompactSignedMoney(mover.todayPnl, baseCurrency, numberLocale)}
                              </p>
                              <p className={`text-[10px] font-semibold ${positive ? "text-emerald-400/80" : "text-red-400/80"}`}>
                                {positive ? "+" : ""}{mover.changePct.toFixed(2)}% · {Math.abs(mover.contributionPct).toFixed(1)}% {isVi ? "đóng góp" : "contribution"}
                              </p>
                            </div>
                          </div>
                          {moverNewsLoading ? (
                            <p className="mt-2 truncate text-[10px] text-slate-600">{isVi ? "Đang tìm tin liên quan..." : "Looking for related news..."}</p>
                          ) : relatedNews ? (
                            <a href={relatedNews.url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-[10px] text-cyan-300/80 hover:text-cyan-200" title={relatedNews.title}>
                              {relatedNews.title}
                            </a>
                          ) : (
                            <p className="mt-2 text-[10px] text-slate-600">{isVi ? "Chưa tìm thấy tin trong 48 giờ qua" : "No news found in the last 48 hours"}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
        </>
  );

  function renderTransactionLog() {
    return (
        <section className="overflow-hidden bg-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-5">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-white">{isVi ? "Lịch giao dịch" : "Transaction log"}</h2>
              <p className="mt-1 text-[10px] text-slate-500">{isVi ? "Tổng hợp mua và bán từ tất cả danh mục" : "Buy and sell activity across all portfolios"}</p>
            </div>
            <div className="flex rounded-xl border border-white/5 bg-zinc-950/60 p-1">
              {(["ALL", "BUY", "SELL"] as const).map(filter => (
                <button key={filter} type="button" onClick={() => setTransactionFilter(filter)} className={`rounded-lg px-2.5 py-1 text-[9px] font-black tracking-wider transition-colors ${transactionFilter === filter ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-white"}`}>
                  {filter === "ALL" ? (isVi ? "TẤT CẢ" : "ALL") : filter === "BUY" ? (isVi ? "MUA" : "BUY") : (isVi ? "BÁN" : "SELL")}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px border-b border-white/5 bg-white/5">
            <div className="bg-[#16171c]/90 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{isVi ? "Tổng mua" : "Total bought"}</p><p className="mt-1 text-base font-black text-emerald-400">{fmtCompactMoney(transactionSummary.buyTotal, baseCurrency, numberLocale)}</p></div>
            <div className="bg-[#16171c]/90 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{isVi ? "Tổng bán" : "Total sold"}</p><p className="mt-1 text-base font-black text-rose-400">{fmtCompactMoney(transactionSummary.sellTotal, baseCurrency, numberLocale)}</p></div>
          </div>
          {transactionSummary.filtered.length === 0 ? <p className="p-5 text-center text-xs text-slate-500">{isVi ? "Chưa có giao dịch." : "No transactions yet."}</p> : (
            <div className="divide-y divide-white/5">
              {transactionSummary.filtered.map(tx => {
                const buy = transactionSummary.side(tx) === "BUY";
                return <div key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0"><div className="flex items-center gap-2"><span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${buy ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{buy ? (isVi ? "MUA" : "BUY") : (isVi ? "BÁN" : "SELL")}</span><span className="text-xs font-black text-white">{tx.assetSymbol}</span></div><p className="mt-1 truncate text-[10px] text-slate-500">{tx.portfolioName} · {new Date(tx.transactionDate).toLocaleDateString(isVi ? "vi-VN" : "en-US")}</p></div>
                  <div className="shrink-0 text-right"><p className={`text-xs font-bold ${buy ? "text-emerald-300" : "text-rose-300"}`}>{fmtCompactMoney(transactionSummary.toBase(tx), baseCurrency, numberLocale)}</p><p className="mt-1 text-[10px] text-slate-500">{tx.quantity.toLocaleString()} × {financeFmtMoney(tx.price, tx.currency)}</p></div>
                </div>;
              })}
            </div>
          )}
          {transactionSummary.filteredCount > 8 && (
            <button
              type="button"
              onClick={() => setShowAllTransactions((prev) => !prev)}
              className="w-full border-t border-white/5 px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:bg-white/[0.03] hover:text-cyan-300 transition-colors"
            >
              {showAllTransactions
                ? (isVi ? `Thu gọn (Hiển thị ${transactionSummary.filteredCount}/${transactionSummary.count} giao dịch)` : `Collapse (Showing ${transactionSummary.filteredCount} of ${transactionSummary.count} transactions)`)
                : (isVi ? `Hiển thị 8/${transactionSummary.filteredCount} giao dịch gần nhất (Xem tất cả ${transactionSummary.filteredCount})` : `Showing 8 of ${transactionSummary.filteredCount} most recent transactions (View all ${transactionSummary.filteredCount})`)}
            </button>
          )}
        </section>
    );
  }

  const volatilityPanel = volatilityAlerts.length > 0 ? (
          <section className="antigravity-panel border border-amber-400/15 bg-amber-400/[0.035] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100">{isVi ? "Cảnh báo biến động" : "Volatility alerts"}</h2>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">{isVi ? "Ngưỡng: 4% trong ngày · 10% trong tuần · 20% trong tháng." : "Thresholds: 4% daily · 10% weekly · 20% monthly."}</p>
                </div>
              </div>
              <span className="rounded-full border border-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-200">{volatilityAlerts.length}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {volatilityAlerts.map((alert) => {
                const positive = alert.changePct > 0;
                const periodLabel = alert.period === "day" ? (isVi ? "hôm nay" : "today") : alert.period === "week" ? (isVi ? "tuần" : "week") : (isVi ? "tháng" : "month");
                return <div key={`${alert.symbol}-${alert.period}`} className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black text-white">{alert.symbol}</p><p className="truncate text-[10px] text-slate-500">{alert.name}</p></div><p className={`text-sm font-black ${positive ? "text-emerald-400" : "text-rose-400"}`}>{positive ? "+" : ""}{alert.changePct.toFixed(2)}%</p></div>
                  <p className="mt-1 text-[10px] text-slate-500">{isVi ? `Vượt ngưỡng ${alert.threshold}% trong ${periodLabel}` : `Exceeded ${alert.threshold}% ${periodLabel} threshold`}</p>
                </div>;
              })}
            </div>
          </section>
  ) : null;

  const performancePanel = kpiSummary.pricedPositions.length > 0 ? (
          <div className="antigravity-panel p-5 space-y-4 bg-transparent">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t("dashboard.trend")}</h3>
              <Badge variant="outline" className="border-white/10 text-slate-400">
                {isVi ? "1 tháng" : "1 month"}
              </Badge>
            </div>
            {!marketHistoryReady ? (
              <div role="status" className="space-y-3 py-5" aria-label={isVi ? "Đang tải xu hướng tài sản" : "Loading asset trend"}>
                <Skeleton className="h-36 w-full bg-white/5" />
                <Skeleton className="h-3 w-48 max-w-full bg-white/5" />
              </div>
            ) : assetTrend.length < 2 ? (
              <div role="status" className="flex h-[180px] items-center justify-center text-center text-xs text-slate-500">
                {isVi ? "Chưa có đủ giá đóng cửa để vẽ xu hướng 1 tháng." : "Not enough closing-price data for the one-month trend."}
              </div>
            ) : (
            <div className="h-[220px]">
              <AutoSizedChart>
                <ComposedChart data={assetTrend} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashboardPerformance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tickLine={false}
                    fontSize={10}
                    minTickGap={28}
                    tickFormatter={(value) => new Date(`${value}T00:00:00Z`).toLocaleDateString(numberLocale, { day: "2-digit", month: "2-digit", timeZone: "UTC" })}
                  />
                  <YAxis width={72} stroke="#64748b" tickLine={false} fontSize={10} tickFormatter={(v) => fmtCompactMoney(v, baseCurrency, numberLocale)} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950/95 backdrop-blur border border-white/10 p-2.5 rounded-lg text-xs shadow-xl space-y-1.5 min-w-[200px]">
                            <p className="font-bold text-white border-b border-white/5 pb-1">
                              {new Date(`${data.date ?? data.label}T00:00:00Z`).toLocaleDateString(numberLocale, { timeZone: "UTC" })}
                            </p>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Portfolio Value:</span>
                              <span className="text-cyan-400 font-bold">{fmtCompactMoney(data.portfolioValue, baseCurrency, numberLocale)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">{isVi ? "Thay đổi kỳ" : "Period change"}:</span>
                              <span className={`font-bold ${data.valueChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {fmtCompactSignedMoney(data.valueChange, baseCurrency, numberLocale)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">{isVi ? "Tỷ suất" : "Return"}:</span>
                              <span className={`font-bold ${data.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {fmtPct(data.changePercent)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="portfolioValue" stroke="#06b6d4" fill="url(#dashboardPerformance)" strokeWidth={1.5} name="Portfolio Value" />
                </ComposedChart>
              </AutoSizedChart>
            </div>
            )}
            {assetTrend.length > 1 && (
            <p className="text-[9px] text-slate-500 italic mt-2 text-right">
              * {isVi ? "Dùng giá đóng cửa hằng ngày của lượng tài sản hiện đang nắm giữ. Không điều chỉnh giao dịch trong tháng." : "Uses daily closing prices for current holdings. Transactions during the month are not adjusted."}
            </p>
            )}
          </div>
  ) : null;

  return (
    <>
      <DashboardLayout
        title={isVi ? "Tổng quan tài sản" : "Portfolio overview"}
        description={isVi ? "Theo dõi hiệu suất và hoạt động của toàn bộ danh mục." : "Track performance and activity across all portfolios."}
        currencyControls={currencyControls}
        metrics={metrics}
        loading={loading}
        session={(
          <DailySessionSummary
            summary={dailySession}
            currency={baseCurrency}
            tradingDate={dailySessionTradingDate}
            portfolios={portfolios.map(portfolio => ({ id: portfolio.id, name: portfolio.name }))}
            monthlyTrend={monthlyTrend}
            onTransferPosition={handleTransferPosition}
            collapsible
          />
        )}
        workspace={workspace}
        performance={performancePanel}
        allocation={allocationPanel}
        activity={null}
        alerts={volatilityPanel}
        isVi={isVi}
      />

      <Dialog open={csvImportOpen} onOpenChange={open => !open && closeCsvImporter()}>
        <DialogContent className="max-w-xl border-white/10 bg-[#0b1020] text-white">
          <DialogHeader>
            <DialogTitle>{isVi ? "Nhập giao dịch từ CSV" : "Import transactions from CSV"}</DialogTitle>
            <DialogDescription>
              {isVi
                ? "Chọn danh mục đích, tải tệp lên và kiểm tra kết quả trước khi ghi dữ liệu."
                : "Choose a destination portfolio, upload a file, and review it before saving data."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="csv-portfolio" className="block text-xs font-semibold text-slate-300">
                {isVi ? "Danh mục đích" : "Destination portfolio"}
              </label>
              <select
                id="csv-portfolio"
                value={csvPortfolioId}
                disabled={csvImportBusy}
                onChange={event => {
                  setCsvPortfolioId(event.target.value);
                  setCsvFileName("");
                  setCsvPreview(null);
                  setCsvImportError("");
                  setCsvImportedCount(null);
                }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-50"
              >
                {portfolios.map(portfolio => (
                  <option key={portfolio.id} value={portfolio.id} className="bg-[#0b1020]">
                    {portfolio.name} ({portfolio.baseCurrency})
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.025] p-4">
              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileChange}
                className="sr-only"
                aria-label={isVi ? "Chọn tệp CSV giao dịch" : "Choose transaction CSV file"}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={csvImportBusy}
                  onClick={() => csvFileInputRef.current?.click()}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  {csvImportBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {csvFileName ? (isVi ? "Chọn tệp khác" : "Choose another file") : (isVi ? "Chọn tệp CSV" : "Choose CSV file")}
                </Button>
                <span className="min-w-0 truncate text-xs text-slate-400">
                  {csvFileName || (isVi ? "Chưa chọn tệp" : "No file selected")}
                </span>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                {isVi
                  ? "Tối đa 500 dòng. Cột bắt buộc: symbol, type, quantity, price, date. Hỗ trợ dấu phẩy, chấm phẩy và tab."
                  : "Up to 500 rows. Required columns: symbol, type, quantity, price, date. Comma, semicolon, and tab delimiters are supported."}
              </p>
            </div>

            {csvImportError && (
              <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-relaxed text-red-300">
                {csvImportError}
              </div>
            )}

            {csvImportedCount !== null && (
              <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {isVi
                    ? `Đã nhập thành công ${csvImportedCount} giao dịch và cập nhật Dashboard.`
                    : `Imported ${csvImportedCount} transactions and refreshed the Dashboard.`}
                </span>
              </div>
            )}

            {csvPreview && (
              <div className="space-y-3 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4">
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                  <span className="text-slate-300">{isVi ? "Tổng" : "Total"}: <b className="text-white">{csvPreview.totalRows}</b></span>
                  <span className="text-emerald-300">{isVi ? "Hợp lệ" : "Valid"}: <b>{csvPreview.validRows}</b></span>
                  <span className={csvPreview.invalidRows ? "text-red-300" : "text-slate-400"}>
                    {isVi ? "Không hợp lệ" : "Invalid"}: <b>{csvPreview.invalidRows}</b>
                  </span>
                </div>

                {csvPreview.issues.length > 0 && (
                  <div className="max-h-40 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                    {csvPreview.issues.slice(0, 8).map((issue, index) => (
                      <div key={`${issue.row}-${issue.field}-${index}`} className="rounded-lg bg-red-500/[0.06] px-3 py-2 text-xs text-red-200">
                        <b>{isVi ? "Dòng" : "Row"} {issue.row || "-"}</b>
                        <span className="text-red-300"> · {issue.field}: {issue.message}</span>
                      </div>
                    ))}
                    {csvPreview.issues.length > 8 && (
                      <p className="text-[11px] text-slate-400">
                        {isVi
                          ? `Còn ${csvPreview.issues.length - 8} lỗi khác.`
                          : `${csvPreview.issues.length - 8} more issues.`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" disabled={csvImportBusy} onClick={closeCsvImporter}>
                {csvImportedCount !== null ? (isVi ? "Đóng" : "Close") : (isVi ? "Hủy" : "Cancel")}
              </Button>
              {csvPreview && (
                <Button
                  type="button"
                  disabled={!csvPreview.readyToImport || csvImportBusy}
                  onClick={confirmCsvImport}
                  className="bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-40"
                >
                  {csvImportBusy && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  {isVi ? `Nhập ${csvPreview.validRows} giao dịch` : `Import ${csvPreview.validRows} transactions`}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal !== null} onOpenChange={open => !open && setModal(null)}>
        <DialogContent className="border-white/10 bg-[#0b1020] text-white">
          <DialogHeader>
            <DialogTitle>
              {modal === "portfolio" ? t("dashboard.createPortfolio") : modal === "watchlist" ? t("dashboard.addWatchlist") : t("dashboard.addGoal")}
            </DialogTitle>
            <DialogDescription>{t("dashboard.createPortfolioDesc")}</DialogDescription>
          </DialogHeader>

          {modal === "portfolio" && (
            <div className="space-y-3">
              <Input value={portfolioForm.name} onChange={event => setPortfolioForm(prev => ({ ...prev, name: event.target.value }))} placeholder={t("dashboard.portfolioName")} />
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
              <Button className="w-full" onClick={submitCreatePortfolio}>{t("dashboard.create")}</Button>
            </div>
          )}

          {modal === "watchlist" && (
            <div className="space-y-3">
              <Input value={watchlistName} onChange={event => setWatchlistName(event.target.value)} placeholder={t("watchlist.name")} />
              <Button className="w-full" onClick={submitCreateWatchlist}>{t("dashboard.create")}</Button>
            </div>
          )}

          {modal === "goal" && (
            <div className="space-y-3">
              <Input value={goalForm.name} onChange={event => setGoalForm(prev => ({ ...prev, name: event.target.value }))} placeholder={t("dashboard.goalName")} />
              <Input type="number" value={goalForm.amount} onChange={event => setGoalForm(prev => ({ ...prev, amount: event.target.value }))} placeholder={t("dashboard.targetAmount")} />
              <Input value={goalForm.currency} onChange={event => setGoalForm(prev => ({ ...prev, currency: event.target.value }))} placeholder={t("common.currency")} />
              <Input type="date" value={goalForm.date} onChange={event => setGoalForm(prev => ({ ...prev, date: event.target.value }))} />
              <Button className="w-full" onClick={submitCreateGoal}>{t("dashboard.create")}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#0b1020] text-white">
          <DialogHeader>
            <DialogTitle>
              {isVi ? "Xác nhận xóa" : "Confirm Delete"}
            </DialogTitle>
            <DialogDescription>
              {isVi 
                ? `Bạn có chắc chắn muốn xóa ${deleteTarget?.type === "portfolio" ? "danh mục" : deleteTarget?.type === "watchlist" ? "danh sách theo dõi" : "mục tiêu"} "${deleteTarget?.name}" không? Hành động này không thể hoàn tác.`
                : `Are you sure you want to delete the ${deleteTarget?.type === "portfolio" ? "portfolio" : deleteTarget?.type === "watchlist" ? "watchlist" : "goal"} "${deleteTarget?.name}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {isVi ? "Hủy" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={() => {
              if (!deleteTarget) return;
              if (deleteTarget.type === "portfolio") handleDeletePortfolio(deleteTarget.id);
              if (deleteTarget.type === "watchlist") handleDeleteWatchlist(deleteTarget.id);
              if (deleteTarget.type === "goal") handleDeleteGoal(deleteTarget.id);
            }}>
              {isVi ? "Xóa" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
