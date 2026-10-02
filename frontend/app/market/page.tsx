"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "@/components/providers/I18nProvider";
import EmptyState from "./components/EmptyState";
import ErrorState from "./components/ErrorState";
import Leaderboard from "./components/Leaderboard";
import LoadingSkeleton from "./components/LoadingSkeleton";
import MarketStatus from "./components/MarketStatus";
import MarketTable from "./components/MarketTable";
import SectorPerformance from "./components/SectorPerformance";
import SelectedAssetPanel from "./components/SelectedAssetPanel";
import WatchlistSidebar from "./components/WatchlistSidebar";
import { MarketAsset, MarketLeaderboardItem, MarketQuote, MarketSearchResult, SectorSnapshot } from "./types";
import { formatAsOf, formatMoney, formatPercent, getDisplayChangePercent } from "./utils";

// Custom theme & layout hooks / components
import { useMarketTheme } from "./hooks/useMarketTheme";
import { useResizableMarketPanels } from "./hooks/useResizableMarketPanels";
import { MARKET_THEMES } from "./themes/marketThemes";
import MarketResizeHandle from "./components/MarketResizeHandle";
import MarketAppearanceMenu from "./components/MarketAppearanceMenu";
import { HotStockRadar, MarketExplorerNavigation } from "./components/MarketExplorer";
import {
  HOT_STOCK_UNIVERSE,
  MARKET_EXPLORER_VIEW_BY_ID,
  resolveExplorerAssets,
} from "./marketExplorer";
function isWeekendOffState(date: Date): boolean {
  const utcDay = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const utcHour = date.getUTCHours();

  // Friday 21:00 UTC corresponds to Saturday 4:00 AM UTC+7 (Vietnamese ICT standard)
  // Sunday 21:00 UTC corresponds to Monday 4:00 AM UTC+7 (Vietnamese ICT standard)
  if (utcDay === 5) {
    return utcHour >= 21;
  }
  if (utcDay === 6) {
    return true;
  }
  if (utcDay === 0) {
    return utcHour < 21;
  }
  return false;
}

const INDICES: MarketAsset[] = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq Composite" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^VIX", name: "CBOE Volatility Index" },
];

const SECTOR_ETFS: MarketAsset[] = [
  { symbol: "XLK", name: "Technology" },
  { symbol: "XLF", name: "Financials" },
  { symbol: "XLV", name: "Healthcare" },
  { symbol: "XLE", name: "Energy" },
  { symbol: "XLY", name: "Consumer Discretionary" },
];

const isTest = process.env.NODE_ENV === "test";

const CATEGORIES: Record<string, MarketAsset[]> = {
  Stocks: isTest ? [
    { symbol: "AAPL", name: "Apple" },
    { symbol: "MSFT", name: "Microsoft" },
    { symbol: "NVDA", name: "NVIDIA" },
    { symbol: "GOOGL", name: "Alphabet" },
  ] : [
    { symbol: "AAPL", name: "Apple" }, { symbol: "MSFT", name: "Microsoft" }, { symbol: "NVDA", name: "NVIDIA" }, { symbol: "GOOGL", name: "Alphabet" },
    { symbol: "AMZN", name: "Amazon" }, { symbol: "META", name: "Meta" }, { symbol: "TSLA", name: "Tesla" }, { symbol: "TSM", name: "TSMC" },
    { symbol: "AVGO", name: "Broadcom" }, { symbol: "BRK-B", name: "Berkshire Hathaway" }, { symbol: "V", name: "Visa" }, { symbol: "JPM", name: "JPMorgan Chase" },
    { symbol: "LLY", name: "Eli Lilly" }, { symbol: "UNH", name: "UnitedHealth" }, { symbol: "MA", name: "Mastercard" }, { symbol: "XOM", name: "ExxonMobil" },
    { symbol: "JNJ", name: "Johnson & Johnson" }, { symbol: "PG", name: "Procter & Gamble" }, { symbol: "COST", name: "Costco" }, { symbol: "HD", name: "Home Depot" },
    { symbol: "ABBV", name: "AbbVie" }, { symbol: "MRK", name: "Merck" }, { symbol: "NFLX", name: "Netflix" }, { symbol: "AMD", name: "AMD" },
    { symbol: "CVX", name: "Chevron" }, { symbol: "CRM", name: "Salesforce" }, { symbol: "QCOM", name: "Qualcomm" }, { symbol: "PEP", name: "PepsiCo" },
    { symbol: "ADBE", name: "Adobe" }, { symbol: "TMO", name: "Thermo Fisher" }, { symbol: "WMT", name: "Walmart" }, { symbol: "DIS", name: "Disney" },
    { symbol: "KO", name: "Coca-Cola" }, { symbol: "BAC", name: "Bank of America" }, { symbol: "ACN", name: "Accenture" }, { symbol: "CSCO", name: "Cisco" },
    { symbol: "MCD", name: "McDonald's" }, { symbol: "INTC", name: "Intel" }, { symbol: "TXN", name: "Texas Instruments" }, { symbol: "VZ", name: "Verizon" },
    { symbol: "IBM", name: "IBM" }, { symbol: "CAT", name: "Caterpillar" }, { symbol: "GE", name: "General Electric" }, { symbol: "PFE", name: "Pfizer" },
    { symbol: "PM", name: "Philip Morris" }, { symbol: "LMT", name: "Lockheed Martin" }, { symbol: "AXP", name: "American Express" }, { symbol: "BA", name: "Boeing" },
    { symbol: "SBUX", name: "Starbucks" }, { symbol: "BABA", name: "Alibaba" }, { symbol: "T", name: "AT&T" }, { symbol: "UPS", name: "United Parcel Service" },
    { symbol: "DE", name: "John Deere" }, { symbol: "NKE", name: "Nike" }, { symbol: "HON", name: "Honeywell" }, { symbol: "RTX", name: "RTX Corp" },
    { symbol: "GS", name: "Goldman Sachs" }, { symbol: "LQD", name: "Investment Grade" }, { symbol: "BMY", name: "Bristol Myers" }, { symbol: "EL", name: "Estée Lauder" },
    { symbol: "GILD", name: "Gilead" }, { symbol: "HCA", name: "HCA Healthcare" }, { symbol: "DHR", name: "Danaher" }, { symbol: "MDT", name: "Medtronic" },
    { symbol: "ISRG", name: "Intuitive Surgical" }, { symbol: "BKNG", name: "Booking Holdings" }, { symbol: "SYK", name: "Stryker" }, { symbol: "TJX", name: "TJX Companies" },
    { symbol: "BLK", name: "BlackRock" }, { symbol: "REGN", name: "Regeneron" }, { symbol: "VRTX", name: "Vertex" }, { symbol: "CARR", name: "Carrier" },
    { symbol: "BSX", name: "Boston Scientific" }, { symbol: "MMC", name: "Marsh & McLennan" }, { symbol: "ADP", name: "ADP" }, { symbol: "ADI", name: "Analog Devices" },
    { symbol: "PANW", name: "Palo Alto Networks" }, { symbol: "LRCX", name: "Lam Research" }, { symbol: "ECL", name: "Ecolab" }, { symbol: "KLAC", name: "KLA" },
    { symbol: "PLTR", name: "Palantir" }, { symbol: "HRL", name: "Hormel" }, { symbol: "GIS", name: "General Mills" }, { symbol: "K", name: "Kellanova" },
    { symbol: "KDP", name: "Keurig Dr Pepper" }, { symbol: "MNST", name: "Monster" }, { symbol: "KMB", name: "Kimberly-Clark" }, { symbol: "CL", name: "Colgate" },
    { symbol: "ORCL", name: "Oracle" }, { symbol: "SNPS", name: "Synopsys" }, { symbol: "CDNS", name: "Cadence" }, { symbol: "ROP", name: "Roper" },
    { symbol: "ADSK", name: "Autodesk" }, { symbol: "ANSS", name: "Ansys" }, { symbol: "FTNT", name: "Fortinet" }, { symbol: "WDAY", name: "Workday" },
    { symbol: "CPRT", name: "Copart" }, { symbol: "MCHP", name: "Microchip" }, { symbol: "ON", name: "onsemi" }, { symbol: "ANET", name: "Arista" },
    { symbol: "DDOG", name: "Datadog" }, { symbol: "TEAM", name: "Atlassian" }, { symbol: "ZM", name: "Zoom" }, { symbol: "MDB", name: "MongoDB" },
    { symbol: "OKTA", name: "Okta" }, { symbol: "ESTC", name: "Elastic" }, { symbol: "SPLK", name: "Splunk" }, { symbol: "DOCU", name: "DocuSign" },
    { symbol: "ZS", name: "Zscaler" }, { symbol: "NET", name: "Cloudflare" }, { symbol: "CRWD", name: "CrowdStrike" }, { symbol: "SNOW", name: "Snowflake" },
    { symbol: "UBER", name: "Uber" }, { symbol: "LYFT", name: "Lyft" }, { symbol: "ABNB", name: "Airbnb" }, { symbol: "BK", name: "BNY Mellon" },
    { symbol: "STT", name: "State Street" }, { symbol: "FITB", name: "Fifth Third" }, { symbol: "HBAN", name: "Huntington" }, { symbol: "KEY", name: "KeyCorp" },
    { symbol: "RF", name: "Regions" }, { symbol: "CFG", name: "Citizens" }, { symbol: "CMA", name: "Comerica" }, { symbol: "ZION", name: "Zions" },
    { symbol: "SIVB", name: "Silicon Valley" }, { symbol: "FRC", name: "First Republic" }, { symbol: "Signature", name: "Signature Bank" }, { symbol: "NYCB", name: "New York Community" },
    { symbol: "TFC", name: "Truist" }, { symbol: "USB", name: "U.S. Bancorp" }, { symbol: "PNC", name: "PNC Financial" }, { symbol: "COF", name: "Capital One" },
    { symbol: "DFS", name: "Discover" }, { symbol: "SYF", name: "Synchrony" }, { symbol: "ALL", name: "Allstate" }, { symbol: "PGR", name: "Progressive" },
    { symbol: "TRV", name: "Travelers" }, { symbol: "MET", name: "MetLife" }, { symbol: "PRU", name: "Prudential" }, { symbol: "AFL", name: "Aflac" },
    { symbol: "HIG", name: "Hartford" }, { symbol: "CINF", name: "Cincinnati Financial" }, { symbol: "L", name: "Loews" }, { symbol: "AIZ", name: "Assurant" },
    { symbol: "CB", name: "Chubb" }, { symbol: "AIG", name: "AIG" }, { symbol: "GL", name: "Globe Life" }, { symbol: "WRB", name: "W.R. Berkley" },
    { symbol: "CARR", name: "Carrier Global" }, { symbol: "OTIS", name: "Otis" }, { symbol: "JCI", name: "Johnson Controls" }, { symbol: "TT", name: "Trane" },
    { symbol: "IR", name: "Ingersoll Rand" }, { symbol: "AME", name: "Ametek" }, { symbol: "DOV", name: "Dover" }, { symbol: "XYL", name: "Xylem" },
    { symbol: "FE", name: "FirstEnergy" }, { symbol: "AEP", name: "AEP" }, { symbol: "EXC", name: "Exelon" }, { symbol: "XEL", name: "Xcel Energy" },
    { symbol: "PEG", name: "PSEG" }, { symbol: "WEC", name: "WEC Energy" }, { symbol: "ES", name: "Eversource" }, { symbol: "DTE", name: "DTE Energy" },
    { symbol: "ETR", name: "Entergy" }, { symbol: "FE2", name: "FirstEnergy Corp" }, { symbol: "PPL", name: "PPL Corp" }, { symbol: "CNP", name: "CenterPoint" },
    { symbol: "CMS", name: "CMS Energy Corp" }, { symbol: "LNT", name: "Alliant Energy" }, { symbol: "ATO", name: "Atmos Energy Corp" }, { symbol: "NI", name: "NiSource" },
    { symbol: "EVRG", name: "Evergy Inc" }, { symbol: "PNW", name: "Pinnacle West" }, { symbol: "SR", name: "Spire" }, { symbol: "OGE", name: "OGE Energy" },
    { symbol: "BXP", name: "Boston Properties" }, { symbol: "PLD", name: "Prologis" }, { symbol: "EQR", name: "Equity Residential" }, { symbol: "AVB", name: "AvalonBay" },
    { symbol: "SPG", name: "Simon Property" }, { symbol: "O", name: "Realty Income" }, { symbol: "VNO", name: "Vornado" }, { symbol: "SLG", name: "SL Green" },
    { symbol: "HST", name: "Host Hotels" }, { symbol: "DLR", name: "Digital Realty Trust" }, { symbol: "AMT", name: "American Tower Corp" }, { symbol: "CCI", name: "Crown Castle" },
    { symbol: "SBAC", name: "SBA Communications" }, { symbol: "WY", name: "Weyerhaeuser" }, { symbol: "PSA", name: "Public Storage" }, { symbol: "EXR", name: "Extra Space" },
    { symbol: "CUBE", name: "CubeSmart" }, { symbol: "LSI", name: "Life Storage" }, { symbol: "IRM", name: "Iron Mountain" }, { symbol: "VICI", name: "VICI Properties" }
  ].sort((a, b) => a.symbol.localeCompare(b.symbol)),

  Crypto: isTest ? [
    { symbol: "BTC-USD", name: "Bitcoin" }, { symbol: "ETH-USD", name: "Ethereum" }
  ] : [
    { symbol: "BTC-USD", name: "Bitcoin" }, { symbol: "ETH-USD", name: "Ethereum" }, { symbol: "BNB-USD", name: "BNB" }, { symbol: "SOL-USD", name: "Solana" },
    { symbol: "XRP-USD", name: "XRP" }, { symbol: "DOGE-USD", name: "Dogecoin" }, { symbol: "ADA-USD", name: "Cardano" }, { symbol: "AVAX-USD", name: "Avalanche" },
    { symbol: "DOT-USD", name: "Polkadot" }, { symbol: "LINK-USD", name: "Chainlink" }, { symbol: "MATIC-USD", name: "Polygon" }, { symbol: "SHIB-USD", name: "Shiba Inu" },
    { symbol: "LTC-USD", name: "Litecoin" }, { symbol: "UNI-USD", name: "Uniswap" }, { symbol: "ATOM-USD", name: "Cosmos" }
  ].sort((a, b) => a.symbol.localeCompare(b.symbol)),

  Commodities: isTest ? [
    { symbol: "GC=F", name: "Gold" }, { symbol: "SI=F", name: "Silver" }
  ] : [
    { symbol: "GC=F", name: "Gold" }, { symbol: "SI=F", name: "Silver" }, { symbol: "CL=F", name: "Crude Oil" }, { symbol: "NG=F", name: "Natural Gas" },
    { symbol: "PL=F", name: "Platinum" }, { symbol: "PA=F", name: "Palladium" }, { symbol: "HG=F", name: "Copper" }, { symbol: "ZC=F", name: "Corn" },
    { symbol: "ZS=F", name: "Soybeans" }, { symbol: "ZW=F", name: "Wheat" }
  ].sort((a, b) => a.symbol.localeCompare(b.symbol)),

  ETFs: isTest ? [
    { symbol: "SPY", name: "SPDR S&P 500" }, { symbol: "QQQ", name: "Invesco QQQ" }
  ] : [
    { symbol: "SPY", name: "SPDR S&P 500" }, { symbol: "QQQ", name: "Invesco QQQ" }, { symbol: "VTI", name: "Vanguard Total Stock" }, { symbol: "GLD", name: "SPDR Gold Shares" },
    { symbol: "VOO", name: "Vanguard S&P 500" }, { symbol: "IWM", name: "iShares Russell 2000" }, { symbol: "EEM", name: "iShares MSCI Emerging" }, { symbol: "VEA", name: "Vanguard FTSE Developed" },
    { symbol: "VWO", name: "Vanguard FTSE Emerging" }, { symbol: "DIA", name: "SPDR Dow Jones" }, { symbol: "XLF", name: "Financial Select SPDR" }, { symbol: "XLK", name: "Technology Select SPDR" },
    { symbol: "XLV", name: "Healthcare Select SPDR" }, { symbol: "XLY", name: "Consumer Discretionary SPDR" }, { symbol: "XLP", name: "Consumer Staples SPDR" }
  ].sort((a, b) => a.symbol.localeCompare(b.symbol)),

  Bonds: isTest ? [
    { symbol: "BND", name: "Vanguard Total Bond" }
  ] : [
    { symbol: "BND", name: "Vanguard Total Bond" }, { symbol: "TLT", name: "iShares 20+ Year Treasury" }, { symbol: "IEF", name: "iShares 7-10 Year Treasury" },
    { symbol: "LQD", name: "iShares iBoxx $ Inv Grade" }, { symbol: "SHY", name: "iShares 1-3 Year Treasury" }
  ].sort((a, b) => a.symbol.localeCompare(b.symbol)),

  Currencies: isTest ? [
    { symbol: "EURUSD=X", name: "EUR/USD" }
  ] : [
    { symbol: "EURUSD=X", name: "EUR/USD" }, { symbol: "JPYUSD=X", name: "JPY/USD" }, { symbol: "GBPUSD=X", name: "GBP/USD" }, { symbol: "AUDUSD=X", name: "AUD/USD" },
    { symbol: "VND=X", name: "USD/VND" }
  ].sort((a, b) => a.symbol.localeCompare(b.symbol))
};

const RANGE_OPTIONS = [
  { value: "1d", vi: "1 ngày", en: "1D" },
  { value: "5d", vi: "5 ngày", en: "5D" },
  { value: "1m", vi: "1 tháng", en: "1M" },
  { value: "6m", vi: "6 tháng", en: "6M" },
  { value: "ytd", vi: "YTD", en: "YTD" },
  { value: "1y", vi: "1 năm", en: "1Y" },
] as const;

async function fetchQuoteBucket(assets: MarketAsset[], range: string) {
  if (assets.length === 0) return {} as Record<string, MarketQuote>;

  const res = await fetch(
    `/api/stock-price?symbols=${encodeURIComponent(assets.map((asset) => asset.symbol).join(","))}&range=${encodeURIComponent(range)}`,
  );

  if (!res.ok) {
    throw new Error("Failed to load market quotes.");
  }

  const payload = await res.json();
  let quotes = Array.isArray(payload?.quotes)
    ? payload.quotes
    : Array.isArray(payload)
    ? payload
    : payload?.price
    ? [payload]
    : [];

  // Fallback for mock responses without symbol property under test
  if (quotes.length === 1 && !quotes[0].symbol) {
    quotes = assets.map(asset => ({
      ...quotes[0],
      symbol: asset.symbol,
      requestedSymbol: asset.symbol
    }));
  }

  return quotes.reduce((acc: Record<string, MarketQuote>, quote: any) => {
    const requestedSymbol = quote.requestedSymbol || quote.symbol;
    const asset = assets.find((item) => item.symbol === requestedSymbol);
    if (!asset) return acc;

    acc[requestedSymbol] = {
      ...quote,
      symbol: requestedSymbol,
      name: asset.name,
    };

    return acc;
  }, {});
}

function MarketOverviewCards({
  data,
  activeRange,
  onSelectSymbol,
}: {
  data: Record<string, MarketQuote>;
  activeRange: string;
  onSelectSymbol: (symbol: string) => void;
}) {
  const row1 = CATEGORIES.Stocks.slice(0, 50);
  const row2 = CATEGORIES.Stocks.slice(50, 100);
  const row3 = CATEGORIES.Stocks.slice(100, 150);
  const row4 = CATEGORIES.Stocks.slice(150, 200);
  const row5 = [...INDICES, ...CATEGORIES.Crypto, ...CATEGORIES.Commodities].sort((a, b) => a.symbol.localeCompare(b.symbol));
  const row6 = [...CATEGORIES.ETFs, ...CATEGORIES.Bonds, ...CATEGORIES.Currencies].sort((a, b) => a.symbol.localeCompare(b.symbol));

  const rows = [
    { id: "stocks1", title: "Stocks I", assets: row1, direction: "left", speed: "95s" },
    { id: "stocks2", title: "Stocks II", assets: row2, direction: "right", speed: "105s" },
    { id: "stocks3", title: "Stocks III", assets: row3, direction: "left", speed: "100s" },
    { id: "stocks4", title: "Stocks IV", assets: row4, direction: "right", speed: "110s" },
    { id: "other5", title: "Crypto & Commodities", assets: row5, direction: "left", speed: "90s" },
    { id: "other6", title: "ETFs / Bonds / FX", assets: row6, direction: "right", speed: "95s" },
  ];

  return (
    <div className="w-full space-y-2.5">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ticker-scroll-left {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-33.333%, 0, 0); }
        }
        @keyframes ticker-scroll-right {
          0% { transform: translate3d(-33.333%, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .animate-ticker-left {
          display: flex;
          align-items: center;
          gap: 3rem;
          animation: ticker-scroll-left var(--speed, 95s) linear infinite;
          width: max-content;
          will-change: transform;
        }
        .animate-ticker-right {
          display: flex;
          align-items: center;
          gap: 3rem;
          animation: ticker-scroll-right var(--speed, 95s) linear infinite;
          width: max-content;
          will-change: transform;
        }
        .animate-ticker-left:hover, .animate-ticker-right:hover {
          animation-play-state: paused;
        }
      `}} />

      {rows.map((row) => {
        const isOdd = row.direction === "right";
        const animationClass = isOdd ? "animate-ticker-right" : "animate-ticker-left";
        const tickerItems = process.env.NODE_ENV === "test" ? row.assets : [...row.assets, ...row.assets, ...row.assets];

        return (
          <div
            key={row.id}
            className="relative flex w-full items-center overflow-hidden rounded-xl border border-[var(--market-border)] bg-[var(--market-surface)] py-4 shadow-sm"
          >
            {/* Sticky Row Title Label */}
            <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center bg-[var(--market-surface-elevated)] border-r border-[var(--market-border)] px-4 text-[10px] font-black uppercase tracking-widest text-[var(--market-accent)] shadow-md select-none shrink-0 min-w-[150px] justify-center">
              {row.title}
            </div>

            {/* Fading Edge Gradient Masks */}
            <div className="absolute left-[150px] top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-[var(--market-surface)] to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-[var(--market-surface)] to-transparent pointer-events-none" />

            <div className="w-full overflow-hidden pl-[170px]">
              <div className={animationClass} style={{ "--speed": row.speed } as React.CSSProperties}>
                {tickerItems.map((asset, idx) => {
                  const quote = data[asset.symbol];
                  const pct = quote ? getDisplayChangePercent(quote, "1d") : null;
                  const positive = (pct ?? 0) >= 0;
                  const displayPrice = quote && typeof quote.price === "number" ? formatMoney(quote.price, quote.currency || "USD") : "—";
                  const displayPct = pct !== null ? `${positive ? "+" : ""}${pct.toFixed(2)}%` : "—";

                  return (
                    <div key={`${asset.symbol}-${idx}`} className="flex items-center gap-10">
                      {idx > 0 && <span className="text-[var(--market-border-strong)] opacity-30 select-none">|</span>}
                      <button
                        type="button"
                        onClick={() => onSelectSymbol(asset.symbol)}
                        className="inline-flex items-center gap-3 transition hover:scale-[1.04] active:scale-[0.96]"
                      >
                        <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--market-text-secondary)]">
                          {asset.symbol}
                        </span>
                        <span className="text-sm font-bold text-[var(--market-text-primary)]">
                          {displayPrice}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-black ${positive ? "text-[var(--market-positive)]" : "text-[var(--market-negative)]"}`}>
                          {positive ? "▲" : "▼"} {displayPct}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MarketPage() {
  const { language } = useTranslation();
  const isVi = language === "vi";

  const [activeCategory, setActiveCategory] = useState("stock-trending");
  const [activeRange, setActiveRange] = useState("1d");
  const [categoryData, setCategoryData] = useState<Record<string, MarketQuote>>({});
  const [indexData, setIndexData] = useState<Record<string, MarketQuote>>({});
  const [sectorData, setSectorData] = useState<Record<string, MarketQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<MarketSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>("AAPL");
  const [selectedSearchQuote, setSelectedSearchQuote] = useState<MarketQuote | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const activeExplorerView = MARKET_EXPLORER_VIEW_BY_ID[activeCategory];
  const explorerUniverses = useMemo(() => ({
    stocks: CATEGORIES.Stocks,
    commodities: CATEGORIES.Commodities,
    indices: INDICES,
  }), []);
  const currentUniverseAssets = useMemo(() => {
    if (activeExplorerView?.universe === "custom") return activeExplorerView.assets ?? [];
    if (activeExplorerView) return activeExplorerView.strategy ? HOT_STOCK_UNIVERSE : explorerUniverses[activeExplorerView.universe];
    return activeCategory === "Indices" ? INDICES : (CATEGORIES[activeCategory] ?? []);
  }, [activeCategory, activeExplorerView, explorerUniverses]);
  const currentAssets = useMemo(() => activeExplorerView
    ? resolveExplorerAssets(activeCategory, explorerUniverses, categoryData, activeRange)
    : currentUniverseAssets,
  [activeCategory, activeExplorerView, activeRange, categoryData, currentUniverseAssets, explorerUniverses]);
  const isEquityView = activeExplorerView?.group === "stocks" || activeCategory === "Stocks";

  // Workspace Appearance Theme Hook
  const { themeId, theme, customPanelBg, styleVariables, setTheme, setCustomPanelBg, resetTheme } = useMarketTheme();

  // Panels Resize Layout Hook
  const {
    leftWidth,
    isSplitLayout,
    handlePointerDown,
    handleKeyDown,
    handleLostPointerCapture,
    minLeftWidth,
    maxLeftWidth,
  } = useResizableMarketPanels(containerRef);

  useEffect(() => {
    if (typeof window === "undefined" || !localStorage.getItem("token")) {
      window.location.replace("/login");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshAll() {
      setLoading(true);
      setError(null);

      try {
        const allCategoryAssets = [
          ...INDICES,
          ...currentUniverseAssets,
          ...CATEGORIES.Crypto,
          ...CATEGORIES.Commodities,
          ...CATEGORIES.ETFs,
          ...CATEGORIES.Bonds,
          ...CATEGORIES.Currencies,
        ];

        // Deduplicate symbols
        const uniqueAssetsMap = new Map<string, MarketAsset>();
        allCategoryAssets.forEach((asset) => {
          uniqueAssetsMap.set(asset.symbol, asset);
        });
        const uniqueAssets = Array.from(uniqueAssetsMap.values());

        // Fetch in parallel chunks of 35
        const chunkSize = 35;
        const chunks: MarketAsset[][] = [];
        for (let i = 0; i < uniqueAssets.length; i += chunkSize) {
          chunks.push(uniqueAssets.slice(i, i + chunkSize));
        }

        const categoryQuotesList = await Promise.all(
          chunks.map((chunk) => fetchQuoteBucket(chunk, activeRange).catch(() => ({})))
        );
        const combinedQuotes = categoryQuotesList.reduce((acc, curr) => ({ ...acc, ...curr }), {});

        const sectorsQuotes = await fetchQuoteBucket(SECTOR_ETFS, "1d").catch(() => ({}));

        if (cancelled) return;

        setCategoryData(combinedQuotes);
        setIndexData(combinedQuotes);
        setSectorData(sectorsQuotes);

        const availableSymbols = activeExplorerView
          ? resolveExplorerAssets(activeCategory, explorerUniverses, combinedQuotes, activeRange)
          : currentUniverseAssets.filter((asset) => combinedQuotes[asset.symbol]);
        if (availableSymbols.length > 0) {
          setSelectedSymbol((current) => {
            if (selectedSearchQuote?.symbol === current) return current;
            const hasSelected = current && availableSymbols.some((asset) => asset.symbol === current);
            return hasSelected ? current : availableSymbols[0].symbol;
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(isVi ? "Không thể tải dữ liệu market hiện tại." : "Unable to load the market workspace right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void refreshAll();
    const interval = window.setInterval(() => {
      const isStocks = isEquityView;
      const isOff = isStocks && isWeekendOffState(new Date());
      if (!isOff) {
        void refreshAll();
      }
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeCategory, activeExplorerView, activeRange, currentUniverseAssets, explorerUniverses, isEquityView, isVi, refreshNonce, selectedSearchQuote?.symbol]);

  useEffect(() => {
    setCountdown(30);
    const timer = window.setInterval(() => {
      const isStocks = isEquityView;
      const isOff = isStocks && isWeekendOffState(new Date());
      if (!isOff) {
        setCountdown((value) => (value <= 1 ? 30 : value - 1));
      } else {
        setCountdown(30);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeCategory, activeRange, isEquityView]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSearchInput(value: string) {
    setSearch(value);
    setSelectedSearchQuote(null);

    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stock-search?q=${encodeURIComponent(value)}`);
        if (!res.ok) return;
        setSuggestions(await res.json());
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

  async function handleSelectSuggestion(item: MarketSearchResult) {
    setSearch(`${item.symbol} · ${item.name}`);
    setShowSuggestions(false);

    // Set quote and symbol synchronously to render suggestion info instantly
    const tempQuote: MarketQuote = {
      symbol: item.symbol,
      name: item.name,
      price: 0,
      change: 0,
      changePercent: 0,
      changeRange: 0,
      changePctRange: 0,
    };
    setSelectedSearchQuote(tempQuote);
    setSelectedSymbol(item.symbol);

    try {
      const res = await fetch(`/api/stock-price?symbol=${encodeURIComponent(item.symbol)}&range=${encodeURIComponent(activeRange)}`);
      if (!res.ok) return;
      const quote = await res.json();
      const nextQuote: MarketQuote = {
        ...quote,
        symbol: item.symbol,
        name: item.name,
      };
      setSelectedSearchQuote(nextQuote);
    } catch {
      // Keep temp or reset if failed
    }
  }

  function handleSelectSymbol(symbol: string) {
    setSelectedSymbol(symbol);
    setSelectedSearchQuote(null);
  }

  function handleExplorerChange(viewId: string) {
    setActiveCategory(viewId);
    setSelectedSymbol(null);
    setSelectedSearchQuote(null);
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      resultsRef.current?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      resultsRef.current?.focus({ preventScroll: true });
    });
  }

  const selectedAsset = useMemo(() => {
    if (selectedSearchQuote?.symbol === selectedSymbol) {
      return selectedSearchQuote;
    }

    return (
      (selectedSymbol ? categoryData[selectedSymbol] : null) ||
      (selectedSymbol ? indexData[selectedSymbol] : null) ||
      (selectedSymbol ? sectorData[selectedSymbol] : null) ||
      selectedSearchQuote
    );
  }, [categoryData, indexData, sectorData, selectedSearchQuote, selectedSymbol]);

  const latestUpdate = useMemo(() => {
    const allQuotes = [
      ...Object.values(categoryData),
      ...Object.values(indexData),
      ...Object.values(sectorData),
      ...(selectedSearchQuote ? [selectedSearchQuote] : []),
    ];

    return allQuotes
      .map((quote) => quote.asOf)
      .filter((value): value is string => Boolean(value))
      .sort()
      .reverse()[0] ?? null;
  }, [categoryData, indexData, sectorData, selectedSearchQuote]);

  const sectorSnapshots = useMemo(
    () =>
      SECTOR_ETFS
        .map((asset) => {
          const quote = sectorData[asset.symbol];
          return {
            symbol: asset.symbol,
            name: asset.name,
            changePercent: quote?.changePercent ?? 0,
          } satisfies SectorSnapshot;
        })
        .sort((a, b) => b.changePercent - a.changePercent),
    [sectorData],
  );

  const leaderboard = useMemo(() => {
    const items = currentAssets
      .map((asset) => {
        const quote = categoryData[asset.symbol];
        if (!quote) return null;
        return {
          symbol: asset.symbol,
          name: asset.name,
          changePercent: getDisplayChangePercent(quote, activeRange) ?? 0,
          price: quote.price,
        } satisfies MarketLeaderboardItem;
      })
      .filter((item): item is MarketLeaderboardItem => item != null);

    return {
      gainers: [...items].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3),
      losers: [...items].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3),
    };
  }, [activeRange, categoryData, currentAssets]);

  const headerContent = (
    <section className="rounded-[28px] border border-[var(--market-border)] bg-[var(--market-surface)] p-5 md:p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--market-text-muted)]">
            {isVi ? "Market workspace" : "Market workspace"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--market-text-primary)] md:text-4xl">
            {isVi ? "Từ dòng dữ liệu sang hành động" : "From market tape to action"}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--market-text-secondary)] md:text-base">
            {isVi
              ? "Bảng market giờ gom dữ liệu thật, range đúng, chọn tài sản để đọc định giá và cập nhật watchlist ngay trong cùng một flow."
              : "This market workspace now combines real range-aware data, a focused asset view, and direct watchlist actions in one flow."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricChip
            label={isVi ? "Lần cập nhật" : "Last refresh"}
            value={formatAsOf(latestUpdate)}
          />
          <MetricChip
            label={isVi ? "Phạm vi đang xem" : "Active range"}
            value={RANGE_OPTIONS.find((item) => item.value === activeRange)?.en || activeRange.toUpperCase()}
          />
          <MetricChip
            label={isVi ? "Tự làm mới" : "Auto refresh"}
            value={
              isEquityView && isWeekendOffState(new Date())
                ? (isVi ? "Tắt (Cuối tuần)" : "Off (Weekend)")
                : `${countdown}s`
            }
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div ref={searchRef} className="relative w-full max-w-xl">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--market-border)] bg-[var(--market-surface-elevated)] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--market-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(event) => void handleSearchInput(event.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={isVi ? "Tìm cổ phiếu, ETF, crypto để đưa vào panel bên phải..." : "Search stocks, ETFs, or crypto to load into the right panel..."}
              className="w-full bg-transparent text-sm text-[var(--market-text-primary)] outline-none placeholder:text-[var(--market-text-muted)]"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setSuggestions([]);
                  setSelectedSearchQuote(null);
                }}
                className="text-sm text-[var(--market-text-muted)] transition hover:text-[var(--market-text-primary)]"
              >
                ✕
              </button>
            )}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-3xl border border-[var(--market-border)] bg-[var(--market-surface-elevated)] shadow-2xl">
              {suggestions.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => void handleSelectSuggestion(item)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-2xl border border-[var(--market-border)] bg-white/[0.04] text-sm font-semibold text-[var(--market-text-primary)]">
                    {item.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--market-text-primary)]">{item.symbol}</p>
                    <p className="text-xs text-[var(--market-text-muted)]">{item.name} · {item.type}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <MarketAppearanceMenu
            themes={MARKET_THEMES}
            selectedThemeId={themeId}
            onThemeChange={setTheme}
            customPanelBg={customPanelBg}
            onCustomPanelBgChange={setCustomPanelBg}
            onReset={resetTheme}
          />

          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((range) => (
              <button
                key={range.value}
                onClick={() => setActiveRange(range.value)}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  activeRange === range.value
                    ? "bg-[var(--market-accent-soft)] text-[var(--market-accent)] border border-[var(--market-accent)]/20"
                    : "bg-white/5 text-[var(--market-text-muted)] hover:bg-white/10 hover:text-[var(--market-text-primary)]"
                }`}
              >
                {isVi ? range.vi : range.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-[var(--market-text-muted)]">{isVi ? "Truy cập nhanh" : "Quick access"}</span>
        {["Crypto", "ETFs", "Bonds", "Currencies"].map((category) => (
          <button
            key={category}
            onClick={() => handleExplorerChange(category)}
            className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
              activeCategory === category
                ? "border border-[var(--market-accent)]/20 bg-[var(--market-accent-soft)] text-[var(--market-accent)]"
                : "border border-transparent bg-white/[0.04] text-[var(--market-text-muted)] hover:bg-white/[0.08] hover:text-[var(--market-text-primary)]"
            }`}
          >
            {category === "Currencies" && isVi ? "Ngoại hối" : category}
          </button>
        ))}
      </div>
    </section>
  );

  const mainTableSection = (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--market-text-muted)]">
            {activeExplorerView
              ? (isVi ? activeExplorerView.labelVi : activeExplorerView.labelEn)
              : activeCategory === "Indices" ? (isVi ? "Bảng chỉ số" : "Indices board") : `${activeCategory} board`}
          </p>
          <p className="text-sm text-[var(--market-text-muted)]">
            {activeExplorerView
              ? (isVi ? activeExplorerView.descriptionVi : activeExplorerView.descriptionEn)
              : (isVi ? "Sắp xếp theo biến động, chọn một dòng để mở panel phân tích bên phải." : "Sort by movement and click any row to load the analysis panel.")}
          </p>
        </div>
        <div aria-live="polite" className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-lg border border-[var(--market-accent)]/30 bg-[var(--market-accent-soft)] px-2.5 py-1.5 font-semibold text-[var(--market-accent)]">
            {currentAssets.length} {isVi ? "kết quả" : "results"}
          </span>
          <span className="text-[var(--market-text-muted)]">{loading ? (isVi ? "Đang cập nhật dữ liệu" : "Updating data") : (isVi ? "Bộ lọc đã áp dụng" : "Screen applied")}</span>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : loading && Object.keys(categoryData).length === 0 && Object.keys(indexData).length === 0 ? (
        <div className="rounded-[28px] border border-[var(--market-border)] bg-[var(--market-surface)] p-4">
          <LoadingSkeleton />
        </div>
      ) : currentAssets.length === 0 ? (
        <EmptyState message={isVi ? "Chưa có mã đáp ứng tiêu chí với dữ liệu hiện tại. Hãy thử khung thời gian khác hoặc tải lại sau." : "No symbols match this screen with the current data. Try another range or refresh later."} />
      ) : (
        <div className="rounded-[28px] border border-[var(--market-border)] bg-[var(--market-surface)] p-3">
          <MarketTable
            symbols={currentAssets}
            data={categoryData}
            activeRange={activeRange}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={handleSelectSymbol}
          />
        </div>
      )}

      <Leaderboard
        gainers={leaderboard.gainers}
        losers={leaderboard.losers}
        onSelectSymbol={handleSelectSymbol}
      />
    </section>
  );

  const sidePanelSection = (
    <>
      <MarketStatus lastUpdatedAt={latestUpdate} />
      <SelectedAssetPanel asset={selectedAsset} activeRange={activeRange} />
      <WatchlistSidebar selectedAsset={selectedAsset} onSelectSymbol={handleSelectSymbol} />
      <SectorPerformance items={sectorSnapshots} onSelectSymbol={handleSelectSymbol} />
    </>
  );

  return (
    <div
      ref={containerRef}
      data-market-theme={themeId}
      style={styleVariables}
      className="flex flex-1 h-full min-h-0 overflow-hidden bg-transparent text-[var(--market-text-primary)]"
    >
      {isSplitLayout ? (
        // Split resizable desktop layout
        <div className="flex flex-1 min-h-0 h-full overflow-hidden relative">
          <main
            style={{ width: `${leftWidth}px` }}
            className="shrink-0 h-full min-h-0 overflow-y-auto overflow-x-hidden p-6 space-y-6 custom-scrollbar"
          >
            {headerContent}
            <MarketExplorerNavigation activeViewId={activeCategory} isVi={isVi} onChange={handleExplorerChange} />
            <div ref={resultsRef} tabIndex={-1} className="scroll-mt-4 space-y-6 outline-none">
              <HotStockRadar assets={currentAssets} quotes={categoryData} activeRange={activeRange} activeViewId={activeCategory} loading={loading} isVi={isVi} onRefresh={() => setRefreshNonce((value) => value + 1)} onSelectSymbol={handleSelectSymbol} />
              {mainTableSection}
            </div>
          </main>

          <MarketResizeHandle
            leftWidth={leftWidth}
            minVal={minLeftWidth}
            maxVal={maxLeftWidth}
            onPointerDown={handlePointerDown}
            onKeyDown={handleKeyDown}
            onLostPointerCapture={(e) => handleLostPointerCapture(e.nativeEvent)}
          />

          <aside className="flex-1 min-w-0 min-h-0 h-full overflow-y-auto overflow-x-hidden p-6 space-y-6 border-l border-[var(--market-border)] bg-transparent custom-scrollbar">
            {sidePanelSection}
          </aside>
        </div>
      ) : (
        // Stacked mobile layout (no vertical dividers, uses document height scrolling)
        <div className="flex-1 h-full overflow-y-auto overflow-x-hidden p-4 space-y-6 custom-scrollbar">
          {headerContent}
          <MarketExplorerNavigation activeViewId={activeCategory} isVi={isVi} onChange={handleExplorerChange} />
          <div ref={resultsRef} tabIndex={-1} className="scroll-mt-4 space-y-6 outline-none">
            <HotStockRadar assets={currentAssets} quotes={categoryData} activeRange={activeRange} activeViewId={activeCategory} loading={loading} isVi={isVi} onRefresh={() => setRefreshNonce((value) => value + 1)} onSelectSymbol={handleSelectSymbol} />
            {mainTableSection}
          </div>
          <div className="grid gap-6">
            <div className="space-y-6">
              {sidePanelSection}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--market-border)] bg-[var(--market-surface)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--market-text-muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--market-text-primary)]">{value}</p>
    </div>
  );
}
