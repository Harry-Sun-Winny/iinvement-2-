"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowDownUp,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getWatchlistItems, addWatchlistItem, removeWatchlistItem, getStockPrice, WatchlistItem } from "../../lib/api";
import { useTranslation } from "@/components/providers/I18nProvider";

import StockAnalyticsModal from "./components/StockAnalyticsModal";

interface SearchResult { symbol: string; name: string; type: string; }
interface PriceData { price: number | null; change: number | null; changePercent: number | null; }

type SortKey = "changePercent" | "price" | "symbol";
type AssetFilter = "ALL" | "STOCKS" | "ETF" | "CRYPTO";

const filters: { value: AssetFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "STOCKS", label: "Stocks" },
  { value: "ETF", label: "ETF" },
  { value: "CRYPTO", label: "Crypto" },
];

function compactMoney(value?: number) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) return `${sign}$${(abs / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function classifyAsset(symbol: string, name = ""): AssetFilter {
  const text = `${symbol} ${name}`.toUpperCase();
  if (/(BTC|ETH|SOL|BNB|USDT|USDC|XRP|ADA|DOGE|CRYPTO)/.test(text)) return "CRYPTO";
  if (/(ETF|SPY|QQQ|VOO|VTI|IWM|DIA)/.test(text)) return "ETF";
  return "STOCKS";
}

export default function WatchlistPage() {
  const { t } = useTranslation();
  const routeParams = useParams<{ id?: string }>() ?? {};
  const id = routeParams.id ?? "";
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [addingSymbol, setAddingSymbol] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filter, setFilter] = useState<AssetFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("changePercent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedAsset, setSelectedAsset] = useState<WatchlistItem | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) { window.location.href = "/login"; return; }
    loadItems();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadItems() {
    try {
      const data = await getWatchlistItems(id);
      setItems(data);
      if (data.length > 0) fetchPrices(data.map(i => i.assetSymbol));
    } catch (e: any) { setError(e.message); }
  }

  async function fetchPrices(symbols: string[]) {
    setPriceLoading(true);
    const results: Record<string, PriceData> = {};
    await Promise.all(symbols.map(async s => {
      const d = await getStockPrice(s);
      if (d) results[s] = d;
    }));
    setPrices(prev => ({ ...prev, ...results }));
    setPriceLoading(false);
  }

  function handleSearchChange(val: string) {
    setQuery(val);
    setShowSuggestions(true);
    setSearchError("");
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSuggestions([]); setSearchLoading(false); return; }
    searchTimeout.current = setTimeout(() => void searchAssets(val), 300);
  }

  async function searchAssets(value = query) {
    const term = value.trim();
    if (!term) return;
    setSearchLoading(true);
    setSearchError("");
    setShowSuggestions(true);
    try {
      const res = await fetch(`/api/stock-search?q=${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error("Search request failed");
      const data = await res.json();
      const results = Array.isArray(data) ? data : [];
      setSuggestions(results);
      if (results.length === 0) setSearchError("No matching assets found.");
    } catch {
      setSuggestions([]);
      setSearchError("Unable to search assets. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleAdd(s: SearchResult) {
    if (items.some(item => item.assetSymbol === s.symbol)) {
      setSearchError(`${s.symbol} is already in this watchlist.`);
      return;
    }
    setAddingSymbol(s.symbol);
    setError("");
    try {
      const item = await addWatchlistItem(id, s.symbol, s.name);
      setItems(prev => [...prev, item]);
      await fetchPrices([s.symbol]);
      setQuery(""); setSuggestions([]); setShowSuggestions(false); setSearchError("");
    } catch (e: any) {
      setSearchError(e?.message || `Unable to add ${s.symbol}.`);
    } finally {
      setAddingSymbol("");
    }
  }

  async function handleRemove(symbol: string) {
    try {
      await removeWatchlistItem(id, symbol);
      setItems(prev => prev.filter(i => i.assetSymbol !== symbol));
      setPrices(prev => { const n = { ...prev }; delete n[symbol]; return n; });
    } catch (e: any) { setError(e.message); }
  }

  const rows = useMemo(() => {
    const filtered = items.filter(item => filter === "ALL" || classifyAsset(item.assetSymbol, item.assetName) === filter);
    const dir = sortDir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const pa = prices[a.assetSymbol];
      const pb = prices[b.assetSymbol];
      if (sortKey === "symbol") return a.assetSymbol.localeCompare(b.assetSymbol) * dir;
      if (sortKey === "price") return ((pa?.price ?? -Infinity) - (pb?.price ?? -Infinity)) * dir;
      return ((pa?.changePercent ?? -Infinity) - (pb?.changePercent ?? -Infinity)) * dir;
    });
  }, [filter, items, prices, sortDir, sortKey]);

  const priced = useMemo(() => {
    return items
      .map(item => {
        const price = prices[item.assetSymbol];
        return price ? { symbol: item.assetSymbol, name: item.assetName || "", price, changePercent: price.changePercent, change: price.change } : null;
      })
      .filter(Boolean) as { symbol: string; name: string; price: any; changePercent: number | null; change: number | null }[];
  }, [items, prices]);

  const gainers = useMemo(() => priced.filter(p => p.change != null && p.change >= 0), [priced]);
  const losers = useMemo(() => priced.filter(p => p.change != null && p.change < 0), [priced]);
  const averageChange = useMemo(() => priced.length ? priced.reduce((sum, p) => sum + (p.changePercent ?? 0), 0) / priced.length : 0, [priced]);
  const best = useMemo(() => {
    return priced.reduce<{ symbol: string; change: number } | null>((acc, p) => {
      if (p.changePercent == null) return acc;
      if (!acc || p.changePercent > acc.change) return { symbol: p.symbol, change: p.changePercent };
      return acc;
    }, null);
  }, [priced]);

  function setSort(next: SortKey) {
    if (sortKey === next) setSortDir(prev => prev === "desc" ? "asc" : "desc");
    else {
      setSortKey(next);
      setSortDir("desc");
    }
  }

  return (
    <>
      <div className="flex flex-1 h-full overflow-hidden">
      <main className="w-[820px] shrink-0 border-r border-white/5 h-full overflow-y-auto p-6 space-y-6">

          {error && (
            <div className="antigravity-panel p-4 text-sm text-red-400 border border-red-500/20 bg-red-500/5 backdrop-blur">
              {error}
            </div>
          )}

          <div className="antigravity-panel antigravity-float-slow overflow-hidden">
            {/* Embedded Header Controls */}
            <div className="flex flex-col border-b border-white/5 p-6 gap-4 bg-white/[0.01]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-bold text-white tracking-widest uppercase">{t("watchlist.title")}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => fetchPrices(items.map(i => i.assetSymbol))} disabled={items.length === 0 || priceLoading}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${priceLoading ? "animate-spin" : ""}`} /> {t("common.refresh")}
                  </Button>
                </div>
              </div>

              {/* Add Symbol Input & Asset Class Filters */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2 border-t border-white/5 pt-4">
                {/* Search Asset input nested inside table header */}
                <div ref={suggestRef} className="relative flex-grow max-w-md">
                  <form
                    onSubmit={event => {
                      event.preventDefault();
                      if (searchTimeout.current) clearTimeout(searchTimeout.current);
                      void searchAssets();
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 focus-within:border-white/20 transition-all"
                  >
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                    <input type="text" value={query} onChange={e => handleSearchChange(e.target.value)} onFocus={() => query && setShowSuggestions(true)} placeholder={t("watchlist.symbolPlaceholder")} className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none" />
                  </form>
                  {showSuggestions && (suggestions.length > 0 || searchLoading || searchError) && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/5 bg-[#0b0c10] shadow-2xl">
                      {searchLoading && <div className="px-4 py-2.5 text-xs text-slate-550">{t("common.loading")}</div>}
                      {!searchLoading && searchError && <p className="px-4 py-3 text-xs text-amber-300">{searchError}</p>}
                      {suggestions.map(s => (
                        <div key={s.symbol} className="flex items-center justify-between gap-4 border-t border-white/[0.05] px-4 py-2.5 first:border-t-0 hover:bg-white/[0.04]">
                          <div>
                            <span className="font-semibold text-white text-xs">{s.symbol}</span>
                            <span className="ml-3 text-[10px] text-slate-400">{s.name}</span>
                          </div>
                          <Button type="button" size="sm" variant="ghost" className="antigravity-btn text-[10px] h-7 px-2" disabled={addingSymbol === s.symbol} onClick={() => void handleAdd(s)}>
                            <Plus className="h-3 w-3 mr-1" />
                            {addingSymbol === s.symbol ? t("common.loading") : t("common.add")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Asset Filters */}
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/5 shrink-0 self-end md:self-auto">
                  {filters.map(f => (
                    <button key={f.value} onClick={() => setFilter(f.value)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-300 ${filter === f.value ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="p-6">
              {items.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 font-medium">{t("watchlist.noWatchlists")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <th className="text-left py-3 px-4 text-slate-400 font-bold text-xs uppercase tracking-wider">
                          <button onClick={() => setSort("symbol")} className="hover:text-white inline-flex items-center gap-1">{t("watchlist.symbol")} <ArrowDownUp className="h-3 w-3" /></button>
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400 font-bold text-xs uppercase tracking-wider">{t("watchlist.companyName")}</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-bold text-xs uppercase tracking-wider">
                          <button onClick={() => setSort("price")} className="hover:text-white inline-flex items-center gap-1">{t("common.price")} <ArrowDownUp className="h-3 w-3" /></button>
                        </th>
                        <th className="text-right py-3 px-4 text-slate-400 font-bold text-xs uppercase tracking-wider">{t("watchlist.change")}</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-bold text-xs uppercase tracking-wider">
                          <button onClick={() => setSort("changePercent")} className="hover:text-white inline-flex items-center gap-1">% {t("watchlist.change")} <ArrowDownUp className="h-3 w-3" /></button>
                        </th>
                        <th className="text-center py-3 px-4 text-slate-400 font-bold text-xs uppercase tracking-wider">{t("watchlist.trend")}</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-bold text-xs uppercase tracking-wider">{t("common.actions")}</th>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(item => {
                        const price = prices[item.assetSymbol];
                        const up = (price?.change ?? 0) >= 0;

                        return (
                          <TableRow key={item.id} className="border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedAsset(item)}>
                            <td className="py-4 px-4 font-semibold text-white">
                              <button className="font-semibold text-white hover:text-slate-300 transition-colors bg-transparent border-none">
                                {item.assetSymbol}
                              </button>
                            </td>
                            <td className="py-4 px-4 text-slate-300 text-xs">{item.assetName}</td>
                            <td className="py-4 px-4 text-right font-semibold text-white">
                              {price && price.price != null ? `$${price.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                            </td>
                            <td className={`py-4 px-4 text-right font-semibold ${price == null || price.change == null ? "text-slate-500" : price.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {price && price.change != null ? `${price.change >= 0 ? "+" : ""}${price.change.toFixed(2)}` : "—"}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {price && price.changePercent != null ? (
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${price.changePercent >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                  {price.changePercent >= 0 ? "▲" : "▼"} {Math.abs(price.changePercent).toFixed(2)}%
                                </span>
                              ) : "—"}
                            </td>
                            <td className="py-4 px-4 text-center">
                              {price && price.price != null ? (
                                <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-bold ${up ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                                  {up ? "Gainer" : "Loser"}
                                </span>
                              ) : "—"}
                            </td>
                            <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-400 transition-colors" onClick={() => handleRemove(item.assetSymbol)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("watchlist.deleteConfirm")}</TooltipContent>
                              </Tooltip>
                            </td>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

        </main>
        
        {/* Right Analytics Workspace */}
        <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 z-10">
          {/* Watchlist Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="antigravity-panel p-4 flex flex-col justify-between hover:bg-white/[0.01] transition-all bg-transparent">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("watchlist.symbol")}</p>
              <p className="text-xl font-black text-white mt-2">{items.length}</p>
              <p className="text-[10px] text-slate-400 mt-1">{t("watchlist.priced")} {priced.length}</p>
            </div>
            <div className="antigravity-panel p-4 flex flex-col justify-between hover:bg-white/[0.01] transition-all bg-transparent">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("watchlist.averagePct")}</p>
              <p className={`text-xl font-black mt-2 ${averageChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {averageChange >= 0 ? "+" : ""}{averageChange.toFixed(2)}%
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{t("watchlist.averageChange")}</p>
            </div>
            <div className="antigravity-panel p-4 flex flex-col justify-between hover:bg-white/[0.01] transition-all bg-transparent">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("watchlist.bestPerformer")}</p>
              <p className="text-xl font-black text-emerald-400 mt-2">{best ? best.symbol : "N/A"}</p>
              <p className="text-[10px] text-slate-400 mt-1">{t("watchlist.rate")} <span className="font-bold text-emerald-450">{best ? `+${best.change.toFixed(2)}%` : "N/A"}</span></p>
            </div>
            <div className="antigravity-panel p-4 flex flex-col justify-between hover:bg-white/[0.01] transition-all bg-transparent">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("watchlist.gainLossRatio")}</p>
              <p className="text-xl font-black text-white mt-2">
                <span className="text-emerald-400">{gainers.length}</span>
                <span className="text-slate-500 mx-1">/</span>
                <span className="text-red-400">{losers.length}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{t("watchlist.gainLossCount")}</p>
            </div>
          </div>

          {/* Top Gainers & Losers Leaderboard */}
          <div className="antigravity-panel p-5 space-y-4 bg-transparent">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t("watchlist.leaderboard")}</h3>
            </div>
            
            {priced.length === 0 ? (
              <p className="text-xs text-slate-550 italic text-center py-4">{t("watchlist.noMarketData")}</p>
            ) : (
              <div className="space-y-4">
                {/* Top Gainers */}
                {gainers.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">{t("watchlist.topGainers")}</h4>
                    <div className="space-y-2">
                      {[...priced]
                        .filter(p => p.changePercent != null && p.changePercent >= 0)
                        .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
                        .slice(0, 3)
                        .map(item => {
                          return (
                            <div key={item.symbol} className="flex items-center justify-between text-xs p-2 rounded bg-white/[0.01] border border-white/5">
                              <div>
                                <span className="font-semibold text-white">{item.symbol}</span>
                                <span className="text-[10px] text-slate-400 ml-2 truncate max-w-[120px] inline-block align-bottom">{item.name || ""}</span>
                              </div>
                              <span className="font-mono font-bold text-emerald-400">+{item.changePercent?.toFixed(2)}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Top Losers */}
                {losers.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">{t("watchlist.topLosers")}</h4>
                    <div className="space-y-2">
                      {[...priced]
                        .filter(p => p.changePercent != null && p.changePercent < 0)
                        .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0))
                        .slice(0, 3)
                        .map(item => {
                          return (
                            <div key={item.symbol} className="flex items-center justify-between text-xs p-2 rounded bg-white/[0.01] border border-white/5">
                              <div>
                                <span className="font-semibold text-white">{item.symbol}</span>
                                <span className="text-[10px] text-slate-400 ml-2 truncate max-w-[120px] inline-block align-bottom">{item.name || ""}</span>
                              </div>
                              <span className="font-mono font-bold text-red-400">{item.changePercent?.toFixed(2)}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <StockAnalyticsModal
        item={selectedAsset}
        quote={(() => { const q = selectedAsset ? prices[selectedAsset.assetSymbol] : undefined; return q && q.price !== null && q.change !== null && q.changePercent !== null ? { price: q.price, change: q.change, changePercent: q.changePercent } : undefined; })()}
        open={Boolean(selectedAsset)}
        onOpenChange={open => {
          if (!open) setSelectedAsset(null);
        }}
      />
    </>
  );
}
