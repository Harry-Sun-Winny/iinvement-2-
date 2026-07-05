import { DashboardData } from "./types";
import { METRIC_REGISTRY } from "./metrics";

export const selectTicker = (data: Readonly<DashboardData> | null | undefined): string => data?.symbol ?? "";
export const selectCompanyName = (data: Readonly<DashboardData> | null | undefined): string => data?.name ?? "";
export const selectLogo = (data: Readonly<DashboardData> | null | undefined): string => data?.profile?.logo ?? "";
export const selectCurrency = (data: Readonly<DashboardData> | null | undefined): string => data?.currency ?? "USD";
export const selectMarketCap = (data: Readonly<DashboardData> | null | undefined): number | null => data?.profile?.marketCap ?? null;
export const selectPrice = (data: Readonly<DashboardData> | null | undefined): number | null => data?.quote?.price ?? null;
export const selectChangePercent = (data: Readonly<DashboardData> | null | undefined): number | null => data?.quote?.changePercent ?? null;
export const selectChartPoints = (data: Readonly<DashboardData> | null | undefined) => data?.chartPoints ?? [];
export const selectNews = (data: Readonly<DashboardData> | null | undefined) => data?.news ?? [];
export const selectPeers = (data: Readonly<DashboardData> | null | undefined) => data?.peers ?? [];

export function selectMetricValue(data: Readonly<DashboardData> | null | undefined, metricId: string): number | null {
  if (!data || !data.metrics) return null;
  return data.metrics[metricId] ?? null;
}

export function selectFormattedMetric(data: Readonly<DashboardData> | null | undefined, metricId: string): string {
  const value = selectMetricValue(data, metricId);
  const def = METRIC_REGISTRY[metricId];
  if (value == null || !def) return "N/A";
  try {
    return def.formatter(value, selectCurrency(data));
  } catch (e) {
    console.error(`[Selectors] Formatter failed for metric: ${metricId}`, e);
    return "N/A";
  }
}
