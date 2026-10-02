import type { MarketAsset, MarketQuote } from "./types";

export type MarketExplorerGroupId = "stocks" | "commodities" | "indices";
export interface MarketExplorerView {
  id: string;
  group: MarketExplorerGroupId;
  labelVi: string;
  labelEn: string;
  descriptionVi: string;
  descriptionEn: string;
  universe: "stocks" | "commodities" | "indices" | "custom";
  assets?: MarketAsset[];
  strategy?: "hot" | "pre" | "post" | "high52" | "low52" | "active" | "gainers" | "losers" | "undervalued" | "overvalued";
}

const assets = (entries: Array<[string, string]>): MarketAsset[] => entries.map(([symbol, name]) => ({ symbol, name }));

export const ASIA_PACIFIC_ASSETS = assets([
  ["TSM", "Taiwan Semiconductor"], ["BABA", "Alibaba"], ["JD", "JD.com"], ["PDD", "PDD Holdings"], ["SONY", "Sony Group"],
  ["TM", "Toyota Motor"], ["MUFG", "Mitsubishi UFJ"], ["HMC", "Honda Motor"], ["INFY", "Infosys"], ["HDB", "HDFC Bank"],
  ["IBN", "ICICI Bank"], ["SE", "Sea Limited"], ["BHP", "BHP Group"], ["RIO", "Rio Tinto"],
]);
export const AMERICAS_ASSETS = assets([
  ["AAPL", "Apple"], ["MSFT", "Microsoft"], ["NVDA", "NVIDIA"], ["AMZN", "Amazon"], ["META", "Meta Platforms"],
  ["GOOGL", "Alphabet"], ["TSLA", "Tesla"], ["AVGO", "Broadcom"], ["JPM", "JPMorgan Chase"], ["PLTR", "Palantir"],
  ["MELI", "MercadoLibre"], ["NU", "Nu Holdings"], ["SHOP", "Shopify"], ["BMO", "Bank of Montreal"], ["VALE", "Vale"],
]);
export const EUROPE_ASSETS = assets([
  ["ASML", "ASML Holding"], ["SAP", "SAP"], ["AZN", "AstraZeneca"], ["SHEL", "Shell"], ["UL", "Unilever"],
  ["HSBC", "HSBC Holdings"], ["BP", "BP"], ["GSK", "GSK"], ["ARM", "Arm Holdings"], ["NVS", "Novartis"],
  ["SNY", "Sanofi"], ["UBS", "UBS Group"], ["DEO", "Diageo"], ["BCS", "Barclays"], ["ERIC", "Ericsson"],
]);
export const HOT_STOCK_UNIVERSE = Array.from(new Map(
  [...AMERICAS_ASSETS, ...ASIA_PACIFIC_ASSETS, ...EUROPE_ASSETS].map((asset) => [asset.symbol, asset]),
).values());

export const COMMODITY_GROUPS = {
  all: assets([["GC=F", "Gold"], ["SI=F", "Silver"], ["HG=F", "Copper"], ["PL=F", "Platinum"], ["CL=F", "WTI Crude Oil"], ["BZ=F", "Brent Crude Oil"], ["NG=F", "Natural Gas"], ["ZC=F", "Corn"], ["ZW=F", "Wheat"], ["ZS=F", "Soybeans"], ["KC=F", "Coffee"], ["SB=F", "Sugar"], ["CC=F", "Cocoa"], ["CT=F", "Cotton"], ["LE=F", "Live Cattle"], ["HE=F", "Lean Hogs"]]),
  metals: assets([["GC=F", "Gold"], ["SI=F", "Silver"], ["HG=F", "Copper"], ["PL=F", "Platinum"], ["PA=F", "Palladium"]]),
  softs: assets([["KC=F", "Coffee"], ["SB=F", "Sugar"], ["CC=F", "Cocoa"], ["CT=F", "Cotton"], ["OJ=F", "Orange Juice"]]),
  meats: assets([["LE=F", "Live Cattle"], ["HE=F", "Lean Hogs"], ["GF=F", "Feeder Cattle"]]),
  energy: assets([["CL=F", "WTI Crude Oil"], ["BZ=F", "Brent Crude Oil"], ["NG=F", "Natural Gas"], ["RB=F", "RBOB Gasoline"], ["HO=F", "Heating Oil"]]),
  grains: assets([["ZC=F", "Corn"], ["ZW=F", "Wheat"], ["ZS=F", "Soybeans"], ["ZO=F", "Oats"], ["ZR=F", "Rough Rice"]]),
  indices: assets([["DBC", "Invesco DB Commodity Index"], ["PDBC", "Optimum Yield Commodity"], ["GSG", "S&P GSCI Commodity ETF"], ["COMT", "iShares GSCI Commodity Dynamic Roll"]]),
};
export const INDEX_GROUPS = {
  main: assets([["^GSPC", "S&P 500"], ["^IXIC", "Nasdaq Composite"], ["^DJI", "Dow Jones"], ["^RUT", "Russell 2000"], ["^VIX", "CBOE Volatility Index"]]),
  world: assets([["^N225", "Nikkei 225"], ["^HSI", "Hang Seng"], ["000001.SS", "Shanghai Composite"], ["^KS11", "KOSPI"], ["^AXJO", "S&P/ASX 200"], ["^FTSE", "FTSE 100"], ["^GDAXI", "DAX"], ["^FCHI", "CAC 40"]]),
  global: assets([["ACWI", "MSCI All Country World"], ["VT", "Vanguard Total World"], ["URTH", "MSCI World"], ["EEM", "MSCI Emerging Markets"], ["VEA", "FTSE Developed Markets"]]),
  futures: assets([["ES=F", "S&P 500 Futures"], ["NQ=F", "Nasdaq 100 Futures"], ["YM=F", "Dow Futures"], ["RTY=F", "Russell 2000 Futures"], ["NKD=F", "Nikkei Futures"]]),
  realtime: assets([["^GSPC", "S&P 500"], ["^IXIC", "Nasdaq Composite"], ["^DJI", "Dow Jones"], ["^VIX", "CBOE Volatility Index"], ["ES=F", "S&P 500 Futures"], ["NQ=F", "Nasdaq 100 Futures"]]),
};

const custom = (id: string, group: MarketExplorerGroupId, vi: string, en: string, descriptionVi: string, descriptionEn: string, list: MarketAsset[]): MarketExplorerView => ({ id, group, labelVi: vi, labelEn: en, descriptionVi, descriptionEn, universe: "custom", assets: list });
const screen = (id: string, vi: string, en: string, descriptionVi: string, descriptionEn: string, strategy?: MarketExplorerView["strategy"]): MarketExplorerView => ({ id, group: "stocks", labelVi: vi, labelEn: en, descriptionVi, descriptionEn, universe: "stocks", strategy });

export const MARKET_EXPLORER_VIEWS: MarketExplorerView[] = [
  screen("stock-screener", "Sàng lọc cổ phiếu", "Stock screener", "Toàn bộ cổ phiếu quốc tế đang hỗ trợ", "All supported international equities"),
  screen("stock-trending", "Cổ phiếu theo xu hướng", "Trending stocks", "Động lượng, thanh khoản và phiên mở rộng", "Momentum, liquidity and extended-hours signals", "hot"),
  custom("stocks-asia", "stocks", "Châu Á/Thái Bình Dương", "Asia Pacific", "ADR và mã niêm yết quốc tế tiêu biểu", "Leading regional listings and ADRs", ASIA_PACIFIC_ASSETS),
  custom("stocks-americas", "stocks", "Châu Mỹ", "Americas", "Mỹ, Canada và Mỹ Latinh", "US, Canada and Latin America", AMERICAS_ASSETS),
  custom("stocks-europe", "stocks", "Châu Âu", "Europe", "Doanh nghiệp châu Âu giao dịch quốc tế", "Internationally traded European leaders", EUROPE_ASSETS),
  screen("stocks-premarket", "Trước giờ mở cửa Mỹ", "US pre-market", "Xếp hạng theo biến động pre-market", "Ranked by pre-market movement", "pre"),
  screen("stocks-afterhours", "Sau giờ đóng cửa", "After hours", "Xếp hạng theo biến động after-hours", "Ranked by after-hours movement", "post"),
  screen("stocks-high52", "Mức đỉnh trong 52 tuần", "52-week highs", "Các mã gần đỉnh 52 tuần nhất", "Stocks closest to their 52-week high", "high52"),
  screen("stocks-low52", "Mức đáy trong 52 tuần", "52-week lows", "Các mã gần đáy 52 tuần nhất", "Stocks closest to their 52-week low", "low52"),
  screen("stocks-active", "Hoạt động mạnh nhất", "Most active", "Ưu tiên volume tương đối cao", "Highest relative volume first", "active"),
  screen("stocks-gainers", "Mã tăng mạnh nhất", "Top gainers", "Dẫn đầu theo khung thời gian đang chọn", "Leaders in the selected range", "gainers"),
  screen("stocks-losers", "Mã giảm mạnh nhất", "Top losers", "Giảm mạnh theo khung thời gian đang chọn", "Largest declines in the selected range", "losers"),
  screen("stocks-undervalued", "Cổ phiếu bị định giá thấp", "Potentially undervalued", "P/E dương dưới 18, chỉ dùng để sàng lọc ban đầu", "Positive P/E below 18, for initial screening only", "undervalued"),
  screen("stocks-overvalued", "Cổ phiếu bị định giá cao", "High valuation", "P/E từ 35 trở lên, cần kiểm tra tăng trưởng", "P/E of 35 or more, growth review required", "overvalued"),
  custom("commodities-all", "commodities", "Hàng hóa", "Commodities", "Tổng quan hợp đồng hàng hóa", "Broad commodity futures overview", COMMODITY_GROUPS.all),
  custom("commodities-metals", "commodities", "Kim loại", "Metals", "Kim loại quý và công nghiệp", "Precious and industrial metals", COMMODITY_GROUPS.metals),
  custom("commodities-softs", "commodities", "Hàng mềm", "Softs", "Cà phê, đường, cacao, bông", "Coffee, sugar, cocoa and cotton", COMMODITY_GROUPS.softs),
  custom("commodities-meats", "commodities", "Thịt", "Meats", "Gia súc và thịt heo", "Livestock and lean hogs", COMMODITY_GROUPS.meats),
  custom("commodities-energy", "commodities", "Năng lượng", "Energy", "Dầu, khí và nhiên liệu", "Oil, gas and refined fuels", COMMODITY_GROUPS.energy),
  custom("commodities-grains", "commodities", "Ngũ cốc", "Grains", "Ngô, lúa mì, đậu tương và gạo", "Corn, wheat, soybeans and rice", COMMODITY_GROUPS.grains),
  custom("commodities-indices", "commodities", "Chỉ số hàng hóa", "Commodity indices", "Các rổ hàng hóa đa dạng", "Diversified commodity baskets", COMMODITY_GROUPS.indices),
  custom("indices-main", "indices", "Chỉ số chính", "Main indices", "Các chỉ số lớn của Mỹ", "Major US benchmarks", INDEX_GROUPS.main),
  custom("indices-world", "indices", "Chỉ số thế giới", "World indices", "Châu Á, châu Âu và Australia", "Asia, Europe and Australia", INDEX_GROUPS.world),
  custom("indices-global", "indices", "Chỉ số toàn cầu", "Global indices", "Các rổ cổ phiếu toàn cầu", "Broad global equity baskets", INDEX_GROUPS.global),
  custom("indices-futures", "indices", "Hợp đồng tương lai chỉ số", "Index futures", "Tín hiệu sớm trước phiên", "Early read before the cash session", INDEX_GROUPS.futures),
  custom("indices-realtime", "indices", "Chỉ số theo thời gian thực", "Real-time indices", "Bảng gọn cho nhịp thị trường hiện tại", "Compact live market pulse", INDEX_GROUPS.realtime),
];

export const MARKET_EXPLORER_VIEW_BY_ID = Object.fromEntries(MARKET_EXPLORER_VIEWS.map((item) => [item.id, item]));
export const MARKET_EXPLORER_ASSETS = Array.from(new Map(MARKET_EXPLORER_VIEWS.flatMap((item) => item.assets ?? []).map((asset) => [asset.symbol, asset])).values());

const pct = (quote: MarketQuote | undefined, range: string) => range === "1d" ? quote?.changePercent ?? 0 : quote?.changePctRange ?? quote?.changePercent ?? 0;
const relativeVolume = (quote?: MarketQuote) => quote?.volume && quote?.averageVolume ? quote.volume / quote.averageVolume : 0;
const sessionMove = (quote?: MarketQuote) => Math.max(Math.abs(quote?.preMarketChangePercent ?? 0), Math.abs(quote?.postMarketChangePercent ?? 0));
const highDistance = (quote?: MarketQuote) => quote?.price && quote?.fiftyTwoWeekHigh ? Math.abs(quote.fiftyTwoWeekHigh - quote.price) / quote.fiftyTwoWeekHigh : Number.POSITIVE_INFINITY;
const lowDistance = (quote?: MarketQuote) => quote?.price && quote?.fiftyTwoWeekLow ? Math.abs(quote.price - quote.fiftyTwoWeekLow) / quote.fiftyTwoWeekLow : Number.POSITIVE_INFINITY;

export function getHotScore(quote: MarketQuote | undefined, range = "1d") {
  if (!quote?.price) return 0;
  return Math.round(Math.min(Math.abs(pct(quote, range)), 20) * 3 + Math.min(relativeVolume(quote), 5) * 10 + Math.min(sessionMove(quote), 12) * 2 + (highDistance(quote) <= 0.03 ? 12 : 0));
}
export function getHotReason(quote: MarketQuote | undefined, isVi: boolean) {
  if (!quote) return isVi ? "Đang chờ dữ liệu" : "Waiting for data";
  const relative = relativeVolume(quote);
  if (relative >= 1.5) return isVi ? `Volume ${relative.toFixed(1)}x trung bình` : `Volume ${relative.toFixed(1)}x average`;
  if (highDistance(quote) <= 0.03) return isVi ? "Sát đỉnh 52 tuần" : "Near 52-week high";
  if (sessionMove(quote) >= 1) return isVi ? "Biến động mạnh ngoài giờ" : "Strong extended-hours move";
  return isVi ? "Động lượng giá nổi bật" : "Notable price momentum";
}

export function resolveExplorerAssets(viewId: string, universes: { stocks: MarketAsset[]; commodities: MarketAsset[]; indices: MarketAsset[] }, quotes: Record<string, MarketQuote>, range: string) {
  const selected = MARKET_EXPLORER_VIEW_BY_ID[viewId] ?? MARKET_EXPLORER_VIEW_BY_ID["stock-trending"];
  const universe = selected.universe === "custom" ? selected.assets ?? [] : universes[selected.universe];
  const available = universe.filter((asset) => quotes[asset.symbol]);
  const by = (selector: (quote: MarketQuote | undefined) => number, direction: "asc" | "desc" = "desc") => [...available].sort((a, b) => direction === "desc" ? selector(quotes[b.symbol]) - selector(quotes[a.symbol]) : selector(quotes[a.symbol]) - selector(quotes[b.symbol]));
  switch (selected.strategy) {
    case "hot": return by((quote) => getHotScore(quote, range)).slice(0, 30);
    case "pre": return by((quote) => Math.abs(quote?.preMarketChangePercent ?? 0)).filter((asset) => quotes[asset.symbol]?.preMarketChangePercent != null).slice(0, 30);
    case "post": return by((quote) => Math.abs(quote?.postMarketChangePercent ?? 0)).filter((asset) => quotes[asset.symbol]?.postMarketChangePercent != null).slice(0, 30);
    case "high52": return by(highDistance, "asc").filter((asset) => Number.isFinite(highDistance(quotes[asset.symbol]))).slice(0, 30);
    case "low52": return by(lowDistance, "asc").filter((asset) => Number.isFinite(lowDistance(quotes[asset.symbol]))).slice(0, 30);
    case "active": return by(relativeVolume).filter((asset) => relativeVolume(quotes[asset.symbol]) > 0).slice(0, 30);
    case "gainers": return by((quote) => pct(quote, range)).filter((asset) => pct(quotes[asset.symbol], range) > 0).slice(0, 30);
    case "losers": return by((quote) => pct(quote, range), "asc").filter((asset) => pct(quotes[asset.symbol], range) < 0).slice(0, 30);
    case "undervalued": return by((quote) => quote?.trailingPE ?? Number.POSITIVE_INFINITY, "asc").filter((asset) => { const pe = quotes[asset.symbol]?.trailingPE; return pe != null && pe > 0 && pe < 18; }).slice(0, 30);
    case "overvalued": return by((quote) => quote?.trailingPE ?? 0).filter((asset) => (quotes[asset.symbol]?.trailingPE ?? 0) >= 35).slice(0, 30);
    default: return universe;
  }
}
