import { DashboardData } from "./types";

export interface CapabilityMetadata {
  id: string;
  name: string;
  visibility: boolean;
  confidence: "low" | "medium" | "high";
  coverage: number; // 0 to 100 percentage
  freshness: string;
  dataSource: string;
  missingRequirements: string[];
}

export const CAPABILITIES = {
  quote: {
    id: "quote",
    name: "Real-time Quote",
    analyze: (data: Readonly<DashboardData>): CapabilityMetadata => {
      const present = data.quote.price !== null;
      return {
        id: "quote",
        name: "Real-time Quote",
        visibility: present,
        confidence: present ? "high" : "low",
        coverage: present ? 100 : 0,
        freshness: present ? "Real-time" : "N/A",
        dataSource: "Finnhub",
        missingRequirements: present ? [] : ["price"],
      };
    },
  },
  historicalCharts: {
    id: "historicalCharts",
    name: "Historical Pricing Chart",
    analyze: (data: Readonly<DashboardData>): CapabilityMetadata => {
      const points = data.chartPoints?.length ?? 0;
      const present = points > 0;
      return {
        id: "historicalCharts",
        name: "Historical Pricing Chart",
        visibility: present,
        confidence: points > 100 ? "high" : points > 10 ? "medium" : "low",
        coverage: Math.min(100, (points / 250) * 100),
        freshness: present ? "1 day delay" : "N/A",
        dataSource: "Yahoo Finance",
        missingRequirements: present ? [] : ["chartPoints"],
      };
    },
  },
  news: {
    id: "news",
    name: "Real-time Stock News",
    analyze: (data: Readonly<DashboardData>): CapabilityMetadata => {
      const items = data.news?.length ?? 0;
      const present = items > 0;
      return {
        id: "news",
        name: "Real-time Stock News",
        visibility: present,
        confidence: items > 5 ? "high" : "medium",
        coverage: Math.min(100, (items / 10) * 100),
        freshness: present ? "Real-time" : "N/A",
        dataSource: "Finnhub + Yahoo RSS",
        missingRequirements: present ? [] : ["news"],
      };
    },
  },
  financials: {
    id: "financials",
    name: "Financial Income Statement",
    analyze: (data: Readonly<DashboardData>): CapabilityMetadata => {
      const reqs = ["revenue", "ebitda", "netIncome"];
      const missing = reqs.filter(k => data.metrics[k] === null);
      const coverage = ((reqs.length - missing.length) / reqs.length) * 100;
      return {
        id: "financials",
        name: "Financial Income Statement",
        visibility: coverage > 0,
        confidence: coverage === 100 ? "high" : coverage > 30 ? "medium" : "low",
        coverage,
        freshness: coverage > 0 ? "Quarterly" : "N/A",
        dataSource: "Yahoo / FMP",
        missingRequirements: missing,
      };
    },
  },
  valuation: {
    id: "valuation",
    name: "Valuation Multiples",
    analyze: (data: Readonly<DashboardData>): CapabilityMetadata => {
      const reqs = ["peRatio", "priceToSalesRatio", "pbRatio", "enterpriseValue"];
      const missing = reqs.filter(k => data.metrics[k] === null);
      const coverage = ((reqs.length - missing.length) / reqs.length) * 100;
      return {
        id: "valuation",
        name: "Valuation Multiples",
        visibility: coverage > 0,
        confidence: coverage === 100 ? "high" : coverage > 30 ? "medium" : "low",
        coverage,
        freshness: coverage > 0 ? "Daily" : "N/A",
        dataSource: "FMP / Yahoo Derived",
        missingRequirements: missing,
      };
    },
  },
};

export function analyzeCapabilities(data: Readonly<DashboardData> | null): Record<string, CapabilityMetadata> {
  if (!data) return {};
  const result: Record<string, CapabilityMetadata> = {};
  for (const [key, cap] of Object.entries(CAPABILITIES)) {
    result[key] = cap.analyze(data);
  }
  return result;
}
