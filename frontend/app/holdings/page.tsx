"use client";

import { useState, useMemo, useEffect } from "react";
import { HoldingsTable, Holding } from "@/components/dashboard/HoldingsTable";
import { InstitutionalDetailPanel } from "@/components/dashboard/InstitutionalDetailPanel";
import { getPortfolios, getTransactions, getStockPrice, Portfolio } from "../lib/api";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { Input } from "@/components/ui/input";
import { Search, X, PieChart as PieIcon, BarChart, Wallet, TrendingUp, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import Alert from "@/components/ui/Alert";
import ChartTooltip from "@/components/charts/ChartTooltip";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
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

// Helper to generate dynamic colors based on string hash
function getDynamicColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

// Mock data
const MOCK_DATA: Holding[] = [
  { symbol: "AAPL", name: "Apple", quantity: 100, avgCost: 150, currentPrice: 175, marketValue: 17500, pnl: 2500, returnPct: 16.6, weight: 25, sector: "Tech", country: "United States" },
  { symbol: "NVDA", name: "NVIDIA", quantity: 50, avgCost: 400, currentPrice: 800, marketValue: 40000, pnl: 20000, returnPct: 100, weight: 50, sector: "AI", country: "United States" },
  { symbol: "TSM", name: "TSMC", quantity: 200, avgCost: 80, currentPrice: 140, marketValue: 28000, pnl: 12000, returnPct: 75, weight: 25, sector: "Semiconductors", country: "Taiwan" },
];

export interface HoldingExt extends Holding {
  canonical?: CanonicalClassification;
  trendPoints?: number[];
  dayChangePct?: number;
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}${formatCompactCurrency(Math.abs(value))}`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function HoldingsPage() {
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [positions, setPositions] = useState<HoldingExt[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
      
      const holdingsMap: Record<string, { symbol: string; name: string; qty: number; cost: number; sector: string; country: string }> = {};
      const allTx: any[] = [];
      
      await Promise.all(
        portfolioData.map(async portfolio => {
          try {
            const transactions = await getTransactions(portfolio.id);
            const orderedTx = [...transactions].sort((a, b) => {
              const dateA = new Date(a.transactionDate).getTime();
              const dateB = new Date(b.transactionDate).getTime();
              if (dateA !== dateB) return dateA - dateB;
              return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
            });
            allTx.push(...orderedTx);
            orderedTx.forEach((tx: any) => {
              const symbol = String(tx.assetSymbol || "").toUpperCase();
              if (!symbol) return;

              const quantity = Number(tx.quantity || 0);
              const price = Number(tx.price || 0);
              const side = String(tx.type || "").toUpperCase();

              if (!holdingsMap[symbol]) {
                holdingsMap[symbol] = {
                  symbol,
                  name: tx.assetName || symbol,
                  qty: 0,
                  cost: 0,
                  sector: tx.assetSector || "Other",
                  country: tx.assetCountry || "Other"
                };
              }

              if (side === "BUY") {
                holdingsMap[symbol].qty += quantity;
                holdingsMap[symbol].cost += quantity * price;
              } else if (side === "SELL") {
                const avg = holdingsMap[symbol].qty > 0 ? holdingsMap[symbol].cost / holdingsMap[symbol].qty : price;
                holdingsMap[symbol].qty -= quantity;
                holdingsMap[symbol].cost = Math.max(0, holdingsMap[symbol].cost - avg * quantity);
              }
            });
          } catch {}
        })
      );

      const activePositions = Object.values(holdingsMap).filter(p => p.qty > 0);
      
      // Calculate initial positions without blocking on external price APIs
      const initialHoldings = activePositions.map(pos => {
        const avgCost = pos.qty > 0 ? pos.cost / pos.qty : 0;
        const canonical = normalizeClassification(pos.symbol, pos.sector, undefined, pos.country);
        return {
          symbol: pos.symbol,
          name: pos.name,
          quantity: pos.qty,
          avgCost,
          currentPrice: avgCost,
          marketValue: pos.qty * avgCost,
          pnl: 0,
          returnPct: 0,
          weight: 0,
          sector: pos.sector,
          country: pos.country,
          canonical
        };
      });

      const initialTotalMV = initialHoldings.reduce((sum, h) => sum + h.marketValue, 0);
      const initialHoldingsWithWeight = initialHoldings.map(h => ({
        ...h,
        weight: initialTotalMV > 0 ? (h.marketValue / initialTotalMV) * 100 : 0
      }));

      setPositions(initialHoldingsWithWeight);
      setAllTransactions(allTx.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()));
      setLoading(false);

      // Fetch live prices in the background
      const pricesMap: Record<string, number> = {};
      const changePctMap: Record<string, number> = {};
      const trendMap: Record<string, number[]> = {};
      await Promise.all(
        activePositions.map(async pos => {
          try {
            const quote = await getStockPrice(pos.symbol);
            if (quote && typeof quote.price === "number" && Number.isFinite(quote.price)) {
              pricesMap[pos.symbol] = quote.price;
              if (typeof quote.changePercent === "number" && Number.isFinite(quote.changePercent)) {
                changePctMap[pos.symbol] = quote.changePercent;
              }
            }
          } catch {}

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
          } catch {}
        })
      );

      // Apply live prices to positions asynchronously
      setPositions(prev => {
        const updated = prev.map(h => {
          const actualPrice = pricesMap[h.symbol];
          if (actualPrice == null) return h;
          const cost = h.quantity * h.avgCost;
          const marketValue = h.quantity * actualPrice;
          const pnl = marketValue - cost;
          const returnPct = cost > 0 ? (pnl / cost) * 100 : 0;
          return {
            ...h,
            currentPrice: actualPrice,
            marketValue,
            pnl,
            returnPct,
            dayChangePct: changePctMap[h.symbol] ?? 0,
            trendPoints: trendMap[h.symbol]
          };
        });

        const totalMarketValue = updated.reduce((sum, h) => sum + h.marketValue, 0);
        return updated.map(h => ({
          ...h,
          weight: totalMarketValue > 0 ? (h.marketValue / totalMarketValue) * 100 : 0
        }));
      });

    } catch (e: any) {
      setError(e.message || "Không thể tải danh sách tài sản.");
      setLoading(false);
    }
  }

  const analytics = useMemo(() => {
    // 1. Map positions with scores
    const positionsWithScores = positions.map((h) => {
      const sector = h.canonical?.sector || "Other";
      const country = h.canonical?.country || "Other";
      const scores = scorePosition({
        returnPct: h.returnPct,
        totalReturnPct: h.returnPct,
        weight: h.weight,
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
      industryAcc[label] = (industryAcc[label] || 0) + p.marketValue;
    });
    const industryAlloc = Object.entries(industryAcc)
      .map(([name, value]) => ({ name, value, fill: getDynamicColor(name) }))
      .filter((x) => x.value > 0);

    // 3. Aggregate allocations by country
    const countryAcc: Record<string, number> = {};
    positionsWithScores.forEach((p) => {
      const label = p.canonical?.country || "Other";
      countryAcc[label] = (countryAcc[label] || 0) + p.marketValue;
    });
    const countryAlloc = Object.entries(countryAcc)
      .map(([name, value]) => ({ name, value, fill: getDynamicColor(name) }))
      .filter((x) => x.value > 0);

    return {
      positions: positionsWithScores,
      industryAlloc,
      countryAlloc,
    };
  }, [positions]);

  const topPosition = useMemo(() => {
    if (analytics.positions.length === 0) return null;
    return [...analytics.positions].sort((a, b) => b.marketValue - a.marketValue)[0];
  }, [analytics.positions]);

  const radarData = useMemo(() => {
    if (!topPosition) return [];
    
    // Convert keys from pillar scores back to radar elements
    const keys: (keyof PillarScores)[] = ["fundamental", "technical", "quantitative", "sentiment"];
    const labels: Record<string, string> = {
      fundamental: "Cơ bản",
      technical: "Kỹ thuật",
      quantitative: "Định lượng",
      sentiment: "Tâm lý",
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
    return positions.map(h => ({
      ...h,
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
  }, [positions, selectedIndustries, selectedCountries, search]);

  const summary = useMemo(() => {
    const totalValue = positions.reduce((sum, holding) => sum + holding.marketValue, 0);
    const totalPnl = positions.reduce((sum, holding) => sum + holding.pnl, 0);
    const weightedTodayChange = totalValue > 0
      ? positions.reduce((sum, holding) => sum + ((holding.dayChangePct ?? 0) * holding.marketValue), 0) / totalValue
      : 0;

    return {
      totalValue,
      totalPnl,
      weightedTodayChange,
      positionCount: positions.length,
    };
  }, [positions]);

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <main className="w-[800px] shrink-0 border-r border-white/5 h-full overflow-y-auto p-6 space-y-6">
      <header className="mb-7">
            <p className="text-sm font-medium text-[#54a0ff]">Quản lý danh mục đầu tư</p>
            <h2 className="mt-2 text-3xl font-black rainbow-text">Holdings Portfolio</h2>
          </header>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          {loading ? (
            <div className="antigravity-panel p-12 text-center text-sm text-slate-500 font-medium">
              Đang tải danh sách tài sản...
            </div>
          ) : positions.length === 0 ? (
            <div className="antigravity-panel p-12 text-center text-sm text-slate-500 font-medium">
              Danh mục đầu tư trống. Vui lòng thêm giao dịch để xem số liệu phân bổ.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="antigravity-panel border-white/5 bg-white/[0.02] shadow-[0_18px_50px_rgba(15,23,42,0.2)] transition-all hover:border-cyan-400/20 hover:bg-white/[0.035]">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div>
                      <CardTitle className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                        T&#7893;ng gi&#225; tr&#7883; danh m&#7909;c
                      </CardTitle>
                      <CardDescription className="mt-2 text-xs text-slate-400">
                        Quy m&#244; t&#224;i s&#7843;n &#273;ang n&#7855;m gi&#7919; theo gi&#225; hi&#7879;n t&#7841;i
                      </CardDescription>
                    </div>
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-300">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-3xl font-black text-white">{formatCompactCurrency(summary.totalValue)}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{summary.positionCount} v&#7883; th&#7871; &#273;ang n&#7855;m gi&#7919;</span>
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
                        T&#7893;ng l&#227;i / l&#7895;
                      </CardTitle>
                      <CardDescription className="mt-2 text-xs text-slate-400">
                        Hi&#7879;u qu&#7843; to&#224;n danh m&#7909;c so v&#7899;i gi&#225; v&#7889;n trung b&#236;nh
                      </CardDescription>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className={`text-3xl font-black ${summary.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatSignedCurrency(summary.totalPnl)}
                    </p>
                    <p className="text-xs text-slate-400">
                      D&#249;ng b&#7843;n r&#250;t g&#7885;n &#273;&#7875; m&#7855;t qu&#233;t nhanh h&#417;n, gi&#7843;m c&#7843;m gi&#225;c b&#7883; ng&#7853;p trong nhi&#7873;u ch&#7919; s&#7889;.
                    </p>
                  </CardContent>
                </Card>

                <Card className="antigravity-panel border-white/5 bg-white/[0.02] shadow-[0_18px_50px_rgba(15,23,42,0.2)] transition-all hover:border-violet-400/20 hover:bg-white/[0.035]">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div>
                      <CardTitle className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                        % thay &#273;&#7893;i h&#244;m nay
                      </CardTitle>
                      <CardDescription className="mt-2 text-xs text-slate-400">
                        Bi&#7871;n &#273;&#7897;ng trung b&#236;nh theo t&#7927; tr&#7885;ng t&#7915;ng m&#227;
                      </CardDescription>
                    </div>
                    <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-3 text-violet-300">
                      <Activity className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className={`text-3xl font-black ${summary.weightedTodayChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatSignedPercent(summary.weightedTodayChange)}
                    </p>
                    <p className="text-xs text-slate-400">
                      Gi&#250;p nh&#236;n nhanh nh&#7883;p danh m&#7909;c trong ng&#224;y tr&#432;&#7899;c khi &#273;i v&#224;o t&#7915;ng m&#227;.
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
                  <PieIcon size={16} className="text-blue-400" /> Phân bổ theo Ngành
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie data={analytics.industryAlloc} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78}>
                        {analytics.industryAlloc.map((e, i) => (
                          <Cell key={e.name} fill={e.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormatter={(v) => `$${Number(v).toLocaleString()}`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Phân bổ theo Quốc gia */}
            <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <PieIcon size={16} className="text-emerald-400" /> Phân bổ theo Quốc gia
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie data={analytics.countryAlloc} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78}>
                        {analytics.countryAlloc.map((e, i) => (
                          <Cell key={e.name} fill={e.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormatter={(v) => `$${Number(v).toLocaleString()}`} />} />
                    </PieChart>
                  </ResponsiveContainer>
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
                        <BarChart size={16} className="text-purple-400" /> Khung 4 Trụ Cột — {topPosition.symbol}
                      </CardTitle>
                      <CardDescription className="text-[10px] text-slate-500 mt-0.5">
                        Cổ phiếu lớn nhất danh mục (Điểm: {(topPosition.totalScore / 20).toFixed(1)}/5.0)
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="#1e293b" />
                        <PolarAngleAxis dataKey="pillar" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "#475569", fontSize: 8 }} />
                        <Radar name="Điểm" dataKey="score" stroke="#c44dff" fill="#c44dff" fillOpacity={0.25} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="mb-6 flex flex-col gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Tìm theo mã hoặc tên tài sản..."
                className="pl-10 bg-slate-900 border-slate-800"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Active Filters Chips */}
            {(selectedIndustries.length > 0 || selectedCountries.length > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase mr-2">Đang lọc:</span>
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
                  Xóa tất cả bộ lọc
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
                <HoldingsTable data={filteredData} />
              </div>
            </>
          )}
      </main>
      <div className="flex-1 h-full overflow-y-auto bg-transparent border-l border-white/5">
        <InstitutionalDetailPanel positions={positions} transactions={allTransactions} />
      </div>
    </div>
  );
}
