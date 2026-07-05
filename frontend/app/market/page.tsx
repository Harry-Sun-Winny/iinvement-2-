"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import MarketStatus from "./components/MarketStatus";
import SectorPerformance from "./components/SectorPerformance";
import Leaderboard from "./components/Leaderboard";
import MarketTable from "./components/MarketTable";
import LoadingSkeleton from "./components/LoadingSkeleton";
import EmptyState from "./components/EmptyState";
import ErrorState from "./components/ErrorState";
import WatchlistSidebar from "./components/WatchlistSidebar";

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  changeRange: number | null;
  changePctRange: number | null;
  dataQuality?: {
    status: "OK" | "WARN" | "ERROR";
    checks: string[];
    sources: string[];
    unavailableSources: string[];
    primarySource: string;
    fallbackUsed: boolean;
    maxDeviationPercent: number | null;
  };
}
interface SearchResult { symbol: string; name: string; type: string; }

const INDICES = [
  { symbol: "^GSPC", name: "S&P 500" }, { symbol: "^IXIC", name: "Nasdaq" },
  { symbol: "^DJI", name: "Dow Jones" }, { symbol: "^FTSE", name: "FTSE 100" },
  { symbol: "^N225", name: "Nikkei 225" }, { symbol: "^HSI", name: "Hang Seng" },
  { symbol: "000001.SS", name: "Shanghai" }, { symbol: "^VIX", name: "VIX" },
];

const CATEGORIES: Record<string, { symbol: string; name: string }[]> = {
  Stocks: [
    { symbol: "AAPL", name: "Apple" }, { symbol: "MSFT", name: "Microsoft" },
    { symbol: "NVDA", name: "NVIDIA" }, { symbol: "GOOGL", name: "Alphabet" },
    { symbol: "AMZN", name: "Amazon" }, { symbol: "META", name: "Meta" },
    { symbol: "TSLA", name: "Tesla" }, { symbol: "TSM", name: "TSMC" },
    { symbol: "AVGO", name: "Broadcom" }, { symbol: "BRK-B", name: "Berkshire" },
  ],
  Crypto: [
    { symbol: "BTC-USD", name: "Bitcoin" }, { symbol: "ETH-USD", name: "Ethereum" },
    { symbol: "BNB-USD", name: "BNB" }, { symbol: "SOL-USD", name: "Solana" },
    { symbol: "XRP-USD", name: "XRP" }, { symbol: "DOGE-USD", name: "Dogecoin" },
  ],
  Commodities: [
    { symbol: "GC=F", name: "Gold" }, { symbol: "SI=F", name: "Silver" },
    { symbol: "CL=F", name: "Crude Oil" }, { symbol: "NG=F", name: "Natural Gas" },
  ],
  ETFs: [
    { symbol: "SPY", name: "SPDR S&P 500" }, { symbol: "QQQ", name: "Nasdaq ETF" },
    { symbol: "VTI", name: "Vanguard Total" }, { symbol: "GLD", name: "Gold ETF" },
  ],
  "Mutual Funds": [
    { symbol: "VFIAX", name: "Vanguard 500 Index" }, { symbol: "SWPPX", name: "Schwab S&P 500 Index" },
    { symbol: "FXAIX", name: "Fidelity 500 Index" }, { symbol: "VTSAX", name: "Vanguard Total Stock Market" },
  ],
  Bonds: [
    { symbol: "BND", name: "Vanguard Total Bond ETF" }, { symbol: "TLT", name: "20+ Year Treasury Bond" },
    { symbol: "IEF", name: "7-10 Year Treasury Bond" }, { symbol: "LQD", name: "Investment Grade Corporate Bond" },
  ],
  Currencies: [
    { symbol: "EURUSD=X", name: "EUR/USD" }, { symbol: "JPY=X", name: "USD/JPY" },
    { symbol: "GBPUSD=X", name: "GBP/USD" }, { symbol: "AUDUSD=X", name: "AUD/USD" },
  ],
};

export default function MarketPage() {
  const [activeCategory, setActiveCategory] = useState("Indices");
  const [activeRange, setActiveRange] = useState("1d");
  const [data, setData] = useState<Record<string, MarketItem>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResult, setSearchResult] = useState<MarketItem | null>(null);
  const [countdown, setCountdown] = useState(30);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !localStorage.getItem("token")) {
      window.location.href = "/login";
      return;
    }
    loadCategory(activeCategory, activeRange);
    const interval = setInterval(() => loadCategory(activeCategory, activeRange), 30005);
    return () => clearInterval(interval);
  }, [activeCategory, activeRange]);

  useEffect(() => {
    setCountdown(30);
    const t = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000);
    return () => clearInterval(t);
  }, [activeCategory, activeRange]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadCategory(cat: string, range: string) {
    setLoading(true);
    setError(null);
    const symbols = cat === "Indices" ? INDICES : CATEGORIES[cat] ?? [];
    const results: Record<string, MarketItem> = {};
    let fetchFailedCount = 0;
    await Promise.all(symbols.map(async ({ symbol, name }) => {
      try {
        const res = await fetch(`/api/stock-price?symbol=${encodeURIComponent(symbol)}&range=${range}`);
        if (!res.ok) {
          fetchFailedCount++;
          return;
        }
        const d = await res.json();
        if (d.price) {
          results[symbol] = { symbol, name, price: d.price, change: d.change, changePercent: d.changePercent, changeRange: d.changeRange ?? null, changePctRange: d.changePctRange ?? null, dataQuality: d.dataQuality };
        }
      } catch {
        fetchFailedCount++;
      }
    }));
    setData(results);
    setLoading(false);
    if (fetchFailedCount === symbols.length && symbols.length > 0) {
      setError("Không thể tải kết nối với máy chủ giá dữ liệu.");
    }
  }

  function handleSearchInput(val: string) {
    setSearch(val);
    setSearchResult(null);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stock-search?q=${encodeURIComponent(val)}`);
        setSuggestions(await res.json());
        setShowSuggestions(true);
      } catch {}
    }, 300);
  }

  async function handleSelectSuggestion(item: SearchResult) {
    setSearch(`${item.symbol} - ${item.name}`);
    setShowSuggestions(false);
    try {
      const res = await fetch(`/api/stock-price?symbol=${encodeURIComponent(item.symbol)}&range=${activeRange}`);
      const d = await res.json();
      if (d.price) setSearchResult({ symbol: item.symbol, name: item.name, price: d.price, change: d.change, changePercent: d.changePercent, changeRange: d.changeRange ?? null, changePctRange: d.changePctRange ?? null, dataQuality: d.dataQuality });
    } catch {}
  }

  const symbols = activeCategory === "Indices" ? INDICES : CATEGORIES[activeCategory] ?? [];
  function getChange(d: MarketItem) { return activeRange === "1d" ? d.change : (d.changeRange ?? null); }
  function getChangePct(d: MarketItem) { return activeRange === "1d" ? d.changePercent : (d.changePctRange ?? null); }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Left Workspace Desk */}
      <main className="w-[800px] shrink-0 border-r border-white/5 h-full overflow-y-auto p-6 space-y-6">
        {searchResult && (
          <div className="antigravity-panel p-4 flex items-center justify-between hover:bg-white/[0.01] transition-all bg-transparent">
            <div>
              <p className="text-lg font-bold text-white">{searchResult.symbol}</p>
              <p className="text-xs text-slate-400 mt-0.5">{searchResult.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-white">${searchResult.price.toFixed(2)}</p>
              <p className={`text-xs font-semibold mt-1 ${(getChange(searchResult) ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                {(getChange(searchResult) ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(getChange(searchResult) ?? 0).toFixed(2)} ({Math.abs(getChangePct(searchResult) ?? 0).toFixed(2)}%)
              </p>
            </div>
          </div>
        )}

        <div className="antigravity-panel antigravity-float-slow overflow-hidden">
          {/* Embedded Header Controls */}
          <div className="flex flex-col border-b border-white/5 p-6 gap-4 bg-white/[0.01]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">Chỉ số thị trường</h2>

              {/* Search input nested inside table header */}
              <div ref={searchRef} className="relative flex-grow max-w-md">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 focus-within:border-white/20 transition-all">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <input type="text" value={search} onChange={e => handleSearchInput(e.target.value)} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} placeholder="Tìm kiếm cổ phiếu, ETF, crypto..." className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none" />
                  {search && <button onClick={() => { setSearch(""); setSuggestions([]); setSearchResult(null); }} className="text-slate-450 hover:text-white text-xs">✕</button>}
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/5 bg-[#0b0c10] shadow-2xl">
                    {suggestions.map(s => (
                      <button key={s.symbol} onClick={() => handleSelectSuggestion(s)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-xs font-bold text-white">{s.symbol.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-semibold text-white">{s.symbol}</p>
                          <p className="text-[10px] text-slate-400">{s.name} · {s.type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Range Selectors */}
              <div className="flex bg-white/5 p-1 rounded-lg border border-white/5 shrink-0 self-end md:self-auto">
                {[["1d", "1 Ngày"], ["5d", "1 Tuần"], ["1y", "1 Năm"]].map(([r, label]) => (
                  <button key={r} onClick={() => setActiveRange(r)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-300 ${activeRange === r ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories Tabs inside Table Header */}
            <div className="flex flex-wrap gap-1.5 mt-2 border-t border-white/5 pt-4">
              {["Indices", ...Object.keys(CATEGORIES)].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 ${activeCategory === cat ? "bg-white/10 text-white shadow-sm border border-white/10" : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table Content Container */}
          <div className="p-6">
            {error ? (
              <ErrorState message={error} onRetry={() => loadCategory(activeCategory, activeRange)} />
            ) : loading ? (
              <LoadingSkeleton />
            ) : symbols.length === 0 ? (
              <EmptyState message="Không có tài sản nào thuộc danh mục này." />
            ) : (
              <div className="overflow-x-auto relative max-h-[600px] no-scrollbar">
                <MarketTable symbols={symbols} data={data} activeRange={activeRange} />
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-4">
          Yahoo Finance cross-check · Tự động cập nhật sau {countdown}s
        </p>
      </main>

      {/* Right Analytics Workspace (Bloomberg/TradingView terminal style) */}
      <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 z-10">
        <MarketStatus />
        <WatchlistSidebar />
        <SectorPerformance />
        <Leaderboard />
      </div>
    </div>
  );
}
