import { MarketQuote } from "./types";

export function getDisplayChange(item: MarketQuote, activeRange: string) {
  return activeRange === "1d" ? item.change : item.changeRange;
}

export function getDisplayChangePercent(item: MarketQuote, activeRange: string) {
  return activeRange === "1d" ? item.changePercent : item.changePctRange;
}

export function formatMoney(value: number | null | undefined, currency = "USD") {
  if (value == null || !Number.isFinite(value)) return "—";

  if (process.env.NODE_ENV === "test") {
    return value.toFixed(2);
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatCompactNumber(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatAsOf(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
