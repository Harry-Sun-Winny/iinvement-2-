"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { HoldingsTable, Holding } from "@/components/dashboard/HoldingsTable";
import { InstitutionalDetailPanel } from "@/components/dashboard/InstitutionalDetailPanel";
import { useTranslation } from "@/components/providers/I18nProvider";
import { getPortfolios, getTransactions, getStockPrice, Portfolio } from "../lib/api";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { Input } from "@/components/ui/input";
import { Search, X, PieChart as PieIcon, BarChart, Wallet, TrendingUp, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMarketTheme } from "@/app/market/hooks/useMarketTheme";
import { DailySessionSummary } from "@/components/dashboard/DailySessionSummary";
import { summarizeDailySession } from "../lib/finance/daily-session";

import Alert from "@/components/ui/Alert";
import ChartTooltip from "@/components/charts/ChartTooltip";
import AutoSizedChart from "@/components/charts/AutoSizedChart";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  PillarScores,
  getWeightForSector,
  scorePosition,
  weightedScore,
  recommendation,
} from "@/lib/analysis-framework";
import { normalizeClassification, CanonicalClassification, ALL_INDUSTRIES, ALL_COUNTRIES } from "@/lib/taxonomy-normalizer";
import {
  buildHoldingsFromTransactions,
  buildPositionsFromHoldings,
  applyLivePrices,
  buildDisplayPositions,
  FinancialCalculationError,
  StockQuote,
  DashboardPosition,
} from "../lib/finance/calculations";
import {
  fmtMoney,
  fmtSignedMoney,
  getValueTone,
  convertCurrency,
} from "../lib/finance/currency";
import { getFxRate } from "../lib/api";

// Helper to generate dynamic colors based on string hash
function getDynamicColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}



export interface HoldingExt extends Holding {
  canonical?: CanonicalClassification;
  trendPoints?: number[];
  dayChangePct?: number;
  todayPnl?: number | null;
  quoteCurrency?: string;
  todayPnlDisplay?: number | null;
  previousClose?: number | null;
  quoteAsOf?: string | null;
  quoteTradingDate?: string | null;
  portfolioId?: string;
  portfolioName?: string;
  assetType?: string;
  currency?: string;
}

// Legacy formatCompactCurrency and formatSignedCurrency removed.
// Use fmtMoney / fmtSignedMoney from finance/currency engine instead.

function sortTransactions(a: any, b: any) {
  const dateA = new Date(a.transactionDate).getTime();
  const dateB = new Date(b.transactionDate).getTime();
  if (dateA !== dateB) return dateA - dateB;
  return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
}

function addWeights(posList: HoldingExt[]): HoldingExt[] {
  const totalMV = posList.reduce((sum, h) => sum + h.marketValue, 0);
  return posList.map(h => ({
    ...h,
    weight: totalMV > 0 ? (h.marketValue / totalMV) * 100 : 0
  }));
}

export default function HoldingsPage() {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const { styleVariables } = useMarketTheme();
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [positions, setPositions] = useState<HoldingExt[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<"USD" | "VND">("USD");
  const [fxRates, setFxRates] = useState<Record<string, number>>({ USD: 1, VND: 25400 });
  const [fxStatus, setFxStatus] = useState<"live" | "fallback" | "error">("live");
  const [fxMetadata, setFxMetadata] = useState<{ updatedAt?: string; source?: string }>({});
  const [calculationErrors, setCalculationErrors] = useState<FinancialCalculationError[]>([]);
  const [realizedPnlByPortfolio, setRealizedPnlByPortfolio] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const [leftWidth, setLeftWidth] = useState(800);
  const isDraggingRef = useRef(false);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const newWidth = Math.max(400, Math.min(1200, e.clientX - 256));
    setLeftWidth(newWidth);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
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

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      window.location.href = "/login";
      return;
    }
    loadHoldingsData();
  }, []);

  async function loadHoldingsData() {
    setLoading(true);
    setError("");

    try {
      const portfolioData = await getPortfolios();
      setPortfolios(portfolioData);

      const allTx: any[] = [];
      const allErrors: FinancialCalculationError[] = [];
      const nextPositions: HoldingExt[] = [];
      const nextRealizedPnlByPortfolio: Record<string, number> = {};

      await Promise.all(
        portfolioData.map(async portfolio => {
          try {
            const transactions = await getTransactions(portfolio.id);
            const orderedTx = [...transactions].sort(sortTransactions);
            allTx.push(...orderedTx);

            const result = buildHoldingsFromTransactions(orderedTx, portfolio);
            nextRealizedPnlByPortfolio[portfolio.id] = result.realizedPnl;

            allErrors.push(
              ...result.errors.map(error => ({
                ...error,
                portfolioId: portfolio.id,
                portfolioName: portfolio.name,
              }))
            );

            const rawPositions = buildPositionsFromHoldings(result.holdings, portfolio);

            await Promise.all(rawPositions.map(async (pos) => {
              const tx: any = orderedTx.find(t => String(t.assetSymbol || "").toUpperCase() === pos.symbol);
              let sector = tx?.assetSector || tx?.sector || "Other";
              let industry = tx?.assetIndustry || tx?.industry || "";
              const country = tx?.assetCountry || tx?.country || "Other";
              let companyName = pos.name || pos.symbol;

              if ((sector === "Other" || !industry) && pos.symbol) {
                try {
                  const response = await fetch(`/api/stock-sector?symbol=${encodeURIComponent(pos.symbol)}`);
                  const metadata = response.ok ? await response.json() : null;
                  if (metadata?.sector && metadata.sector !== "Khác") sector = metadata.sector;
                  industry = metadata?.industry || industry;
                  if (metadata?.name && metadata.name !== pos.symbol) companyName = metadata.name;
                } catch {
                  // Keep the explicit Other fallback when the metadata source is unavailable.
                }
              }

              const canonical = normalizeClassification(
                pos.symbol,
                sector,
                industry,
                country
              );

              nextPositions.push({
                ...pos,
                name: companyName,
                currentPrice: pos.currentPrice ?? 0,
                marketValue: pos.marketValue ?? 0,
                pnl: pos.pnl ?? 0,
                returnPct: pos.returnPct ?? 0,
                todayPnl: pos.todayPnl ?? 0,
                sector,
                country,
                canonical,
                weight: 0,
              });
            }));
          } catch (err: any) {
            console.error(`Failed to load portfolio transactions:`, err);
          }
        })
      );

      setAllTransactions(
        allTx.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
      );

      setCalculationErrors(allErrors);
      setRealizedPnlByPortfolio(nextRealizedPnlByPortfolio);

      const weightedInitial = addWeights(nextPositions);
      setPositions(weightedInitial);
      setLoading(false);

      await loadLivePrices(weightedInitial);
    } catch (e: any) {
      setError(e.message || (isVi ? "Không thể tải danh sách tài sản." : "Could not load asset list."));
      setLoading(false);
    }
  }

  async function loadLivePrices(initialPositions: HoldingExt[]) {
    const pricesMap: Record<string, number> = {};
    const changePctMap: Record<string, number> = {};
    const previousCloseMap: Record<string, number> = {};
    const quoteAsOfMap: Record<string, string> = {};
    const quoteTradingDateMap: Record<string, string> = {};
    const trendMap: Record<string, number[]> = {};
    const quotesMap = new Map<string, StockQuote>();

    await Promise.all(
      initialPositions.map(async pos => {
        try {
          const quote = await getStockPrice(pos.symbol);
          if (quote && typeof quote.price === "number" && Number.isFinite(quote.price)) {
            pricesMap[pos.symbol] = quote.price;
            if (typeof quote.changePercent === "number" && Number.isFinite(quote.changePercent)) {
              changePctMap[pos.symbol] = quote.changePercent;
            }
            const previousClose = typeof quote.previousClose === "number"
              ? quote.previousClose
              : quote.price - (quote.change ?? 0);
            if (Number.isFinite(previousClose)) previousCloseMap[pos.symbol] = previousClose;
            if (typeof quote.asOf === "string") quoteAsOfMap[pos.symbol] = quote.asOf;
            if (typeof quote.tradingDate === "string") quoteTradingDateMap[pos.symbol] = quote.tradingDate;

            quotesMap.set(pos.symbol, {
              price: quote.price,
              previousClose,
              changeAmount: quote.change,
              changePercent: quote.changePercent,
              // Keep the quote currency from the market API instead of guessing from the asset.
              currency: String(quote.currency || "USD").toUpperCase(),
            });
          }
        } catch (err) {
          console.error(`Failed to load live price for ${pos.symbol}:`, err);
        }

        try {
          const res = await fetch(`/api/stock-history?symbol=${encodeURIComponent(pos.symbol)}&range=1M`);
          if (!res.ok) return;
          const history = await res.json();
          const points = Array.isArray(history?.points) ? history.points : [];
          const trendPoints = points
            .map((point: { adjustedClose?: number | null; close?: number | null }) => point.adjustedClose ?? point.close ?? null)
            .filter((value: number | null) => value != null && Number.isFinite(value))
            .slice(-7);

          if (trendPoints.length >= 2) {
            trendMap[pos.symbol] = trendPoints;
          }
        } catch (err) {
          console.error(`Failed to load history for ${pos.symbol}:`, err);
        }
      })
    );

    setPositions(prev => {
      const priced = applyLivePrices(prev as unknown as DashboardPosition[], quotesMap);
      const updated: HoldingExt[] = priced.map(pos => {
        // Find original HoldingExt to preserve sector/country/canonical
        const original = prev.find(p => p.symbol === pos.symbol);
        return {
          ...pos,
          currentPrice: pos.currentPrice ?? 0,
          marketValue: pos.marketValue ?? 0,
          pnl: pos.pnl ?? 0,
          returnPct: pos.returnPct ?? 0,
          todayPnl: pos.todayPnl ?? 0,
          sector: original?.sector ?? "Other",
          country: original?.country ?? "Other",
          canonical: original?.canonical,
          dayChangePct: changePctMap[pos.symbol] ?? original?.dayChangePct ?? 0,
          previousClose: previousCloseMap[pos.symbol] ?? original?.previousClose ?? null,
          quoteAsOf: quoteAsOfMap[pos.symbol] ?? original?.quoteAsOf ?? null,
          quoteTradingDate: quoteTradingDateMap[pos.symbol] ?? original?.quoteTradingDate ?? null,
          trendPoints: trendMap[pos.symbol] ?? original?.trendPoints,
          weight: 0,
        };
      });

      const totalMV = updated.reduce((sum, h) => sum + h.marketValue, 0);
      return updated.map(h => ({
        ...h,
        weight: totalMV > 0 ? (h.marketValue / totalMV) * 100 : 0
      }));
    });
  }

  const displayPositions = useMemo(() => {
    try {
      const converted = buildDisplayPositions(positions as unknown as DashboardPosition[], baseCurrency, fxRates);
      const totalMarketValue = converted.reduce(
        (sum, h) => sum + (h.marketValueDisplay ?? 0),
        0
      );
      return converted.map(h => {
        // Merge back HoldingExt fields lost during DisplayPosition conversion
        const original = positions.find(p => p.symbol === h.symbol);
        return {
          ...h,
          sector: original?.sector ?? "Other",
          country: original?.country ?? "Other",
          canonical: original?.canonical,
          trendPoints: original?.trendPoints,
          dayChangePct: original?.dayChangePct ?? 0,
          previousClose: original?.previousClose ?? null,
          quoteAsOf: original?.quoteAsOf ?? null,
          quoteTradingDate: original?.quoteTradingDate ?? null,
          weight: totalMarketValue > 0
            ? ((h.marketValueDisplay ?? 0) / totalMarketValue) * 100
            : 0,
        };
      });
    } catch (e: any) {
      console.error("Failed to build display positions:", e);
      return [];
    }
  }, [positions, baseCurrency, fxRates]);

  const analytics = useMemo(() => {
    // 1. Map positions with scores
    const positionsWithScores = displayPositions.map((h) => {
      const sector = h.canonical?.sector || "Other";
      const country = h.canonical?.country || "Other";
      const scores = scorePosition({
        returnPct: h.returnPct ?? 0,
        totalReturnPct: h.returnPct ?? 0,
        weight: h.weight ?? 0,
      });
      const totalScore = weightedScore(scores, sector);
      return {
        ...h,
        pillarScores: scores,
        totalScore,
      };
    });

    // 2. Aggregate allocations by industry
    const industryAcc: Record<string, number> = {};
    positionsWithScores.forEach((p) => {
      const label = p.canonical?.industry || "Other";
      industryAcc[label] = (industryAcc[label] || 0) + (p.marketValueDisplay ?? 0);
    });
    const industryAlloc = Object.entries(industryAcc)
      .map(([name, value]) => ({ name, value, fill: getDynamicColor(name) }))
      .filter((x) => x.value > 0);

    // 3. Aggregate allocations by country
    const countryAcc: Record<string, number> = {};
    positionsWithScores.forEach((p) => {
      const label = p.canonical?.country || "Other";
      countryAcc[label] = (countryAcc[label] || 0) + (p.marketValueDisplay ?? 0);
    });
    const countryAlloc = Object.entries(countryAcc)
      .map(([name, value]) => ({ name, value, fill: getDynamicColor(name) }))
      .filter((x) => x.value > 0);

    return {
      positions: positionsWithScores,
      industryAlloc,
      countryAlloc,
    };
  }, [displayPositions]);

  const topPosition = useMemo(() => {
    if (analytics.positions.length === 0) return null;
    return [...analytics.positions].sort((a, b) => (b.marketValueDisplay ?? 0) - (a.marketValueDisplay ?? 0))[0];
  }, [analytics.positions]);

  const radarData = useMemo(() => {
    if (!topPosition) return [];
    
    // Convert keys from pillar scores back to radar elements
    const keys: (keyof PillarScores)[] = ["fundamental", "technical", "quantitative", "sentiment"];
    const labels: Record<string, string> = {
      fundamental: isVi ? "Cơ bản" : "Fundamental",
      technical: isVi ? "Kỹ thuật" : "Technical",
      quantitative: isVi ? "Định lượng" : "Quantitative",
      sentiment: isVi ? "Tâm lý" : "Sentiment",
    };
    const weights = getWeightForSector(topPosition.canonical?.sector || "Other");

    return keys.map((k) => ({
      pillar: labels[k],
      score: topPosition.pillarScores[k] / 20, // scale to 1-5 for visual consistency
      weight: weights[k],
    }));
  }, [topPosition]);

  const topRec = useMemo(() => {
    if (!topPosition) return null;
    return recommendation(topPosition.totalScore);
  }, [topPosition]);

  const filteredData = useMemo(() => {
    return displayPositions.map(h => ({
      ...h,
      // Coerce nullable DisplayPosition fields for Holding compatibility
      currentPrice: h.currentPrice ?? 0,
      marketValue: h.marketValue ?? 0,
      pnl: h.pnl ?? 0,
      returnPct: h.returnPct ?? 0,
      mappedIndustry: h.canonical?.industry || "Other",
      mappedCountry: h.canonical?.country || "Other"
    })).filter(h => {
      const matchIndustry =
        selectedIndustries.length === 0 ||
        selectedIndustries.some(
          s =>
            h.mappedIndustry.toLowerCase().includes(s.toLowerCase()) ||
            h.sector.toLowerCase().includes(s.toLowerCase())
        );
      const matchCountry =
        selectedCountries.length === 0 ||
        selectedCountries.some(
          c =>
            h.mappedCountry.toLowerCase().includes(c.toLowerCase()) ||
            h.country.toLowerCase().includes(c.toLowerCase())
        );
      const matchSearch =
        h.symbol.toLowerCase().includes(search.toLowerCase()) ||
        h.name.toLowerCase().includes(search.toLowerCase());
      return matchIndustry && matchCountry && matchSearch;
    });
  }, [displayPositions, selectedIndustries, selectedCountries, search]);

  const summary = useMemo(() => {
    const totalValue = displayPositions.reduce(
      (sum, holding) => sum + (holding.marketValueDisplay ?? 0),
      0
    );
    const unrealizedPnl = displayPositions.reduce(
      (sum, holding) => sum + (holding.pnlDisplay ?? 0),
      0
    );
    const realizedPnl = Object.entries(realizedPnlByPortfolio).reduce((sum, [portfolioId, pnl]) => {
      const portfolio = portfolios.find((item) => item.id === portfolioId);
      const portfolioCurrency = portfolio?.baseCurrency || (portfolio as any)?.currency || "USD";
      try {
        return sum + convertCurrency(pnl, portfolioCurrency, baseCurrency, fxRates);
      } catch {
        return sum;
      }
    }, 0);
    const totalPnl = unrealizedPnl + realizedPnl;
    const weightedTodayChange = totalValue > 0
      ? displayPositions.reduce((sum, holding) => sum + ((holding.dayChangePct ?? 0) * (holding.marketValueDisplay ?? 0)), 0) / totalValue
      : 0;

    return {
      totalValue,
      totalPnl,
      unrealizedPnl,
      realizedPnl,
      weightedTodayChange,
      positionCount: displayPositions.length,
    };
  }, [baseCurrency, displayPositions, fxRates, portfolios, realizedPnlByPortfolio]);

  const dailySession = useMemo(
    () => summarizeDailySession(displayPositions.map(position => ({
      symbol: position.symbol,
      quantity: position.quantity,
      currentPrice: position.currentPriceDisplay,
      previousClose: position.previousClose == null
        ? null
        : convertCurrency(position.previousClose, position.quoteCurrency || position.currency || "USD", baseCurrency, fxRates),
      valueChange: position.todayPnlDisplay,
    }))),
    [baseCurrency, displayPositions, fxRates],
  );
  const dailySessionTradingDate = useMemo(
    () => displayPositions.map(position => position.quoteTradingDate).filter(Boolean).sort().at(-1) ?? null,
    [displayPositions],
  );

  return (
    <div style={styleVariables} className="flex flex-1 h-full overflow-hidden">
      <main style={{ width: `${leftWidth}px` }} className="shrink-0 h-full overflow-y-auto p-6 space-y-6">
      <header className="mb-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#54a0ff]">{isVi ? "Quản lý danh mục đầu tư" : "Portfolio Management"}</p>
          <h2 className="mt-2 text-3xl font-black rainbow-text">{isVi ? "Holdings Portfolio" : "Holdings Portfolio"}</h2>
        </div>

        {/* Currency Switcher Toggle */}
        <div className="flex bg-zinc-950/60 p-1 rounded-xl border border-white/5 gap-0.5 self-start md:self-auto select-none">
          {(["USD", "VND"] as const).map((curr) => (
            <button
              key={curr}
              onClick={() => setBaseCurrency(curr)}
              className={`px-2.5 py-1 text-[9px] font-black tracking-wider rounded-lg transition-all duration-200 ${
                baseCurrency === curr
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </header>

      {fxStatus === "fallback" && (
        <div className="antigravity-panel p-4 text-xs text-amber-400 border border-amber-500/20 bg-amber-500/5 backdrop-blur mb-6">
          ⚠️ {isVi 
            ? `Đang sử dụng tỷ giá quy đổi mặc định (1 USD = 25,400 VND). Kết nối API tỷ giá không khả dụng.`
            : `Using default fallback FX rate (1 USD = 25,400 VND). Live currency API is currently offline.`}
        </div>
      )}

      {calculationErrors.length > 0 && (
        <div className="antigravity-panel p-4 text-xs text-amber-400 border border-amber-500/20 bg-amber-500/5 backdrop-blur mb-6 flex flex-col gap-1.5">
          <span className="font-bold">⚠️ {isVi ? "Cảnh báo giao dịch vượt bán (Oversell):" : "Oversell Transactions Skipped:"}</span>
          <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-2">
            {calculationErrors.map((err, idx) => (
              <div key={idx} className="pl-3 border-l-2 border-amber-500/40 text-slate-300">
                <span className="font-semibold text-white/90">[{err.portfolioName || "Portfolio"}] {err.symbol}</span>: {err.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="rainbow-border antigravity-panel p-12 text-center text-sm text-slate-500 font-medium">
          {isVi ? "Đang tải danh sách tài sản..." : "Loading asset list..."}
        </div>
      ) : positions.length === 0 ? (
        <div className="antigravity-panel p-12 text-center text-sm text-slate-500 font-medium">
          {isVi ? "Danh mục đầu tư trống. Vui lòng thêm giao dịch để xem số liệu phân bổ." : "Portfolio is empty. Please add transactions to view allocation data."}
        </div>
      ) : (
        <>
          <DailySessionSummary summary={dailySession} currency={baseCurrency} tradingDate={dailySessionTradingDate} />
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="antigravity-panel border-white/5 bg-white/[0.02] shadow-[0_18px_50px_rgba(15,23,42,0.2)] transition-all hover:border-cyan-400/20 hover:bg-white/[0.035]">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    {isVi ? "Tổng giá trị danh mục" : "Total Portfolio Value"}
                  </CardTitle>
                  <CardDescription className="mt-2 text-xs text-slate-400">
                    {isVi ? "Quy mô tài sản đang nắm giữ theo giá hiện tại" : "Current market value of all held assets"}
                  </CardDescription>
                </div>
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-300">
                  <Wallet className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-3xl font-black text-white">{fmtMoney(summary.totalValue, baseCurrency)}</p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{summary.positionCount} {isVi ? "vị thế đang nắm giữ" : "open positions"}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                    Live
                  </span>
                </div>
              </CardContent>
            </Card>

                <Card className="antigravity-panel border-white/5 bg-white/[0.02] shadow-[0_18px_50px_rgba(15,23,42,0.2)] transition-all hover:border-emerald-400/20 hover:bg-white/[0.035]">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div>
                      <CardTitle className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                        {isVi ? "Tổng lãi / lỗ" : "Total Profit / Loss"}
                      </CardTitle>
                      <CardDescription className="mt-2 text-xs text-slate-400">
                        {isVi ? "Gồm lãi đã chốt khi bán và lãi/lỗ vị thế còn giữ" : "Realized sales P/L plus unrealized open-position P/L"}
                      </CardDescription>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className={`text-3xl font-black ${
                      getValueTone(summary.totalPnl) === "positive" 
                        ? "text-emerald-400" 
                        : getValueTone(summary.totalPnl) === "negative" 
                        ? "text-red-400" 
                        : "text-slate-400"
                    }`}>
                      {fmtSignedMoney(summary.totalPnl, baseCurrency)}
                    </p>
                    <div className="space-y-1 text-xs text-slate-400">
                      <p>{isVi ? "Đã chốt khi bán" : "Realized sales"}: <span className={summary.realizedPnl >= 0 ? "text-emerald-300" : "text-red-300"}>{fmtSignedMoney(summary.realizedPnl, baseCurrency)}</span></p>
                      <p>{isVi ? "Chưa chốt từ holdings" : "Unrealized holdings"}: <span className={summary.unrealizedPnl >= 0 ? "text-emerald-300" : "text-red-300"}>{fmtSignedMoney(summary.unrealizedPnl, baseCurrency)}</span></p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="antigravity-panel border-white/5 bg-white/[0.02] shadow-[0_18px_50px_rgba(15,23,42,0.2)] transition-all hover:border-violet-400/20 hover:bg-white/[0.035]">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div>
                      <CardTitle className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                        {isVi ? "% thay đổi hôm nay" : "Today's Change %"}
                      </CardTitle>
                      <CardDescription className="mt-2 text-xs text-slate-400">
                        {isVi ? "Biến động trung bình theo tỷ trọng từng mã" : "Weighted average change of positions"}
                      </CardDescription>
                    </div>
                    <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-3 text-violet-300">
                      <Activity className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className={`text-3xl font-black ${summary.weightedTodayChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {summary.weightedTodayChange >= 0 ? "+" : ""}{summary.weightedTodayChange.toFixed(2)}%
                    </p>
                    <p className="text-xs text-slate-400">
                      {isVi ? "Giúp nhìn nhanh nhịp danh mục trong ngày trước khi đi vào từng mã." : "Quick overview of daily portfolio rhythm before diving into individual assets."}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Allocation & 4-Pillars Section */}
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 mb-8">
            {/* Phân bổ theo Ngành */}
            <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <PieIcon size={16} className="text-blue-400" /> {isVi ? "Phân bổ theo Ngành" : "Sector Allocation"}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                {mounted && (
                  <AutoSizedChart>
                    <PieChart>
                      <Pie data={analytics.industryAlloc} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78}>
                        {analytics.industryAlloc.map((e, i) => (
                          <Cell key={e.name} fill={e.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormatter={(v) => fmtMoney(Number(v), baseCurrency)} />} />
                    </PieChart>
                  </AutoSizedChart>
                )}
              </CardContent>
            </Card>

            {/* Phân bổ theo Quốc gia */}
            <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <PieIcon size={16} className="text-emerald-400" /> {isVi ? "Phân bổ theo Quốc gia" : "Country Allocation"}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                {mounted && (
                  <AutoSizedChart>
                    <PieChart>
                      <Pie data={analytics.countryAlloc} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78}>
                        {analytics.countryAlloc.map((e, i) => (
                          <Cell key={e.name} fill={e.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormatter={(v) => fmtMoney(Number(v), baseCurrency)} />} />
                    </PieChart>
                  </AutoSizedChart>
                )}
              </CardContent>
            </Card>

            {/* Đánh giá 4 Trụ Cột (cho mã có Market Value lớn nhất) */}
            {topPosition && (
              <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <BarChart size={16} className="text-purple-400" /> {isVi ? "Khung 4 Trụ Cột" : "4-Pillar Framework"} — {topPosition.symbol}
                      </CardTitle>
                      <CardDescription className="text-[10px] text-slate-500 mt-0.5">
                        {isVi ? "Cổ phiếu lớn nhất danh mục" : "Largest portfolio position"} ({isVi ? "Điểm" : "Score"}: {(topPosition.totalScore / 20).toFixed(1)}/5.0)
                      </CardDescription>
                    </div>
                    {topRec && (
                      <Badge
                        className={`text-[9px] font-black uppercase ${
                          topRec.tone === "buy"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : topRec.tone === "sell"
                            ? "bg-red-500/15 text-red-400 border-red-500/30"
                            : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {topRec.label}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="h-[180px] flex items-center justify-center pt-2">
                  {mounted && (
                    <AutoSizedChart>
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="#1e293b" />
                        <PolarAngleAxis dataKey="pillar" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "#475569", fontSize: 8 }} />
                        <Radar name={isVi ? "Điểm" : "Score"} dataKey="score" stroke="#c44dff" fill="#c44dff" fillOpacity={0.25} />
                      </RadarChart>
                    </AutoSizedChart>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="mb-6 flex flex-col gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder={isVi ? "Tìm theo mã hoặc tên tài sản..." : "Search by symbol or asset name..."}
                className="pl-10 bg-slate-900 border-slate-800"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Active Filters Chips */}
            {(selectedIndustries.length > 0 || selectedCountries.length > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase mr-2">{isVi ? "Đang lọc:" : "Filtering:"}</span>
                {selectedIndustries.map(s => (
                  <Badge key={s} variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-2 py-1">
                    {s} <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSelectedIndustries(p => p.filter(x => x !== s))} />
                  </Badge>
                ))}
                {selectedCountries.map(c => (
                  <Badge key={c} variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-2 py-1">
                    {c} <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSelectedCountries(p => p.filter(x => x !== c))} />
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-slate-400 hover:text-white" onClick={() => { setSelectedIndustries([]); setSelectedCountries([]); }}>
                  {isVi ? "Xóa tất cả bộ lọc" : "Clear all filters"}
                </Button>
              </div>
            )}
          </div>

              <div className="grid grid-cols-1 xl:grid-cols-[300px,1fr] gap-8">
                <FilterPanel
                  sectors={ALL_INDUSTRIES}
                  countries={ALL_COUNTRIES}
                  selectedSectors={selectedIndustries}
                  selectedCountries={selectedCountries}
                  onToggleSector={(s) => setSelectedIndustries(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])}
                  onToggleCountry={(c) => setSelectedCountries(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])}
                  onClear={() => { setSelectedIndustries([]); setSelectedCountries([]); }}
                />
                <HoldingsTable data={filteredData} currency={baseCurrency} />
              </div>
            </>
          )}
      </main>

      {/* Draggable Divider Slider */}
      <div 
        onMouseDown={startResize}
        className="w-1.5 hover:w-2 shrink-0 bg-white/5 hover:bg-cyan-500/40 cursor-col-resize transition-all duration-150 h-full relative z-50 group"
        title="Drag to resize"
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-white/10 group-hover:bg-cyan-400" />
      </div>

      <div className="flex-1 h-full overflow-y-auto bg-transparent border-l border-white/5">
        <InstitutionalDetailPanel positions={displayPositions} transactions={allTransactions} currency={baseCurrency} />
      </div>
    </div>
  );
}
