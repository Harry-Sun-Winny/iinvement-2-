export interface MarketDataQuality {
  status: "OK" | "WARN" | "ERROR";
  checks: string[];
  sources: string[];
  unavailableSources: string[];
  primarySource: string;
  fallbackUsed: boolean;
  maxDeviationPercent: number | null;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number | null;
  currentPrice?: number | null;
  previousClose?: number | null;
  change: number;
  changePercent: number;
  changeRange: number | null;
  changePctRange: number | null;
  currency?: string;
  sourceCurrency?: string;
  exchangeName?: string;
  marketState?: string;
  marketCap?: number | null;
  volume?: number | null;
  averageVolume?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  preMarketChangePercent?: number | null;
  postMarketChangePercent?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  date?: string;
  asOf?: string | null;
  sparkline?: number[];
  requestedSymbol?: string;
  resolvedSymbol?: string | null;
  dataQuality?: MarketDataQuality;
}

export interface MarketSearchResult {
  symbol: string;
  name: string;
  type: string;
}

export interface MarketAsset {
  symbol: string;
  name: string;
}

export interface MarketLeaderboardItem {
  symbol: string;
  name: string;
  changePercent: number;
  price: number | null;
}

export interface SectorSnapshot {
  symbol: string;
  name: string;
  changePercent: number;
}
