import { selectFormattedMetric, selectChangePercent } from "./selectors";
import { formatRatio } from "./formatters";
import { CapabilityMetadata } from "./capability-analyzer";

export interface SectionDefinition {
  id: string;
  title: string;
  description: string;
  priority: number;
  layout: "half" | "full";
  visible: (capabilities: Record<string, CapabilityMetadata>) => boolean;
  getMetrics: (data: any, context?: { monthlyTrend?: number | null; marketCap?: number; currency?: string; price?: number | null; compactMoney?: any; compactNumber?: any }) => {
    label: string;
    value: string;
    trend?: number | null;
    sublabel?: string;
  }[];
}

export const SECTION_REGISTRY: SectionDefinition[] = [
  {
    id: "price-metrics",
    title: "Price Metrics",
    description: "Live quote and technical context from existing market data.",
    priority: 10,
    layout: "half",
    visible: caps => caps.quote?.visibility ?? false,
    getMetrics: (data, ctx) => [
      { label: "Adjusted Close Price", value: selectFormattedMetric(data, "price"), trend: selectChangePercent(data), sublabel: "Current quote" },
      { label: "50-Day Moving Average", value: selectFormattedMetric(data, "ma50"), trend: ctx?.monthlyTrend, sublabel: "Derived from displayed series" },
      { label: "200-Day Moving Average", value: selectFormattedMetric(data, "ma200"), trend: ctx?.monthlyTrend, sublabel: "Derived from displayed series" },
      { label: "Trading Volume", value: selectFormattedMetric(data, "volume"), sublabel: "Yahoo historical volume" },
    ],
  },
  {
    id: "dividend-metrics",
    title: "Dividend Metrics",
    description: "Dividend data requires a fundamentals endpoint.",
    priority: 20,
    layout: "half",
    visible: () => true, // Legacy fallback is always visible
    getMetrics: data => [
      { label: "Dividend Per Share", value: selectFormattedMetric(data, "dividendPerShare"), sublabel: "No dividend API connected" },
      { label: "Dividend Yield", value: selectFormattedMetric(data, "dividendYield"), sublabel: "No dividend API connected" },
    ],
  },
  {
    id: "valuation-metrics",
    title: "Valuation Metrics",
    description: "Enterprise and multiple analysis.",
    priority: 30,
    layout: "half",
    visible: () => true,
    getMetrics: data => [
      { label: "Enterprise Value (TEV)", value: selectFormattedMetric(data, "enterpriseValue"), sublabel: "Requires debt and cash data" },
      { label: "P/E Ratio", value: selectFormattedMetric(data, "peRatio"), sublabel: "Requires earnings data" },
      { label: "Price/Sales (TTM)", value: selectFormattedMetric(data, "priceToSalesRatio"), sublabel: "Requires revenue data" },
      { label: "Price/Book", value: selectFormattedMetric(data, "pbRatio"), sublabel: "Requires book value data" },
      { label: "PEG Ratio", value: selectFormattedMetric(data, "pegRatio"), sublabel: "Requires growth estimates" },
    ],
  },
  {
    id: "income-statement",
    title: "Income Statement",
    description: "Revenue quality and profitability.",
    priority: 40,
    layout: "half",
    visible: () => true,
    getMetrics: data => [
      { label: "Revenue", value: selectFormattedMetric(data, "revenue"), sublabel: "Requires financial statements API" },
      { label: "Gross Profit", value: selectFormattedMetric(data, "grossProfit"), sublabel: "Requires financial statements API" },
      { label: "Net Income Available To Common Shareholders", value: selectFormattedMetric(data, "netIncome"), sublabel: "Requires financial statements API" },
      { label: "EBITDA", value: selectFormattedMetric(data, "ebitda"), sublabel: "Requires financial statements API" },
    ],
  },
  {
    id: "cash-flow",
    title: "Cash Flow",
    description: "Operating cash generation and reinvestment.",
    priority: 50,
    layout: "half",
    visible: () => true,
    getMetrics: () => [
      { label: "Capital Expenditure", value: "N/A", sublabel: "Requires cash-flow API" },
      { label: "Cash From Operating Activities", value: "N/A", sublabel: "Requires cash-flow API" },
    ],
  },
  {
    id: "balance-sheet",
    title: "Balance Sheet",
    description: "Liquidity and leverage checks.",
    priority: 60,
    layout: "half",
    visible: () => true,
    getMetrics: () => [
      { label: "Cash & Short-Term Investments", value: "N/A", sublabel: "Requires balance-sheet API" },
      { label: "Total Debt", value: "N/A", sublabel: "Requires balance-sheet API" },
      { label: "Net Debt", value: "N/A", sublabel: "Requires balance-sheet API" },
    ],
  },
  {
    id: "growth-metrics",
    title: "Growth Metrics",
    description: "Capitalization and shareholder base.",
    priority: 70,
    layout: "half",
    visible: () => true,
    getMetrics: (data, ctx) => [
      { label: "Net Income Growth", value: "N/A", sublabel: "Requires historical statements" },
      { label: "Shares Outstanding", value: ctx?.price && ctx?.marketCap ? ctx.compactNumber(ctx.marketCap / ctx.price) : "N/A", sublabel: "Derived from market cap / price" },
      { label: "Adjusted Market Capitalization", value: ctx?.compactMoney(ctx?.marketCap, ctx?.currency), trend: selectChangePercent(data), sublabel: "Profile API" },
    ],
  },
  {
    id: "market-sentiment",
    title: "Market Sentiment",
    description: "Positioning and crowding indicators.",
    priority: 80,
    layout: "half",
    visible: () => true,
    getMetrics: () => [
      { label: "Short Interest Ratio", value: formatRatio(null), sublabel: "Requires short interest feed" },
    ],
  },
];
