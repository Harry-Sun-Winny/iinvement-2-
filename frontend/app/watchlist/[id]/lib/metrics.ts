import { formatCurrency, formatCompactNumber, formatRatio } from "./formatters";

export interface MetricDefinition {
  id: string;
  label: string;
  category: string;
  formatter: (val: number, currency?: string) => string;
}

export const METRIC_REGISTRY: Record<string, MetricDefinition> = {
  price: { id: "price", label: "Adjusted Close Price", category: "Price Metrics", formatter: (v, c) => formatCurrency(v, c) },
  ma50: { id: "ma50", label: "50-Day Moving Average", category: "Price Metrics", formatter: (v, c) => formatCurrency(v, c) },
  ma200: { id: "ma200", label: "200-Day Moving Average", category: "Price Metrics", formatter: (v, c) => formatCurrency(v, c) },
  volume: { id: "volume", label: "Trading Volume", category: "Price Metrics", formatter: v => formatCompactNumber(v) },
  
  dividendYield: { id: "dividendYield", label: "Dividend Yield", category: "Dividend Metrics", formatter: v => formatRatio(v, "%") },
  dividendPerShare: { id: "dividendPerShare", label: "Dividend Per Share", category: "Dividend Metrics", formatter: (v, c) => formatCurrency(v, c) },
  
  peRatio: { id: "peRatio", label: "P/E Ratio", category: "Valuation Metrics", formatter: v => formatRatio(v, "x") },
  priceToSalesRatio: { id: "priceToSalesRatio", label: "Price/Sales (TTM)", category: "Valuation Metrics", formatter: v => formatRatio(v, "x") },
  pbRatio: { id: "pbRatio", label: "Price/Book", category: "Valuation Metrics", formatter: v => formatRatio(v, "x") },
  pegRatio: { id: "pegRatio", label: "PEG Ratio", category: "Valuation Metrics", formatter: v => formatRatio(v) },
  enterpriseValue: { id: "enterpriseValue", label: "Enterprise Value (TEV)", category: "Valuation Metrics", formatter: (v, c) => formatCurrency(v, c) },
  
  revenue: { id: "revenue", label: "Revenue", category: "Income Statement", formatter: (v, c) => formatCurrency(v, c) },
  grossProfit: { id: "grossProfit", label: "Gross Profit", category: "Income Statement", formatter: (v, c) => formatCurrency(v, c) },
  netIncome: { id: "netIncome", label: "Net Income Available To Common Shareholders", category: "Income Statement", formatter: (v, c) => formatCurrency(v, c) },
  ebitda: { id: "ebitda", label: "EBITDA", category: "Income Statement", formatter: (v, c) => formatCurrency(v, c) },
};
