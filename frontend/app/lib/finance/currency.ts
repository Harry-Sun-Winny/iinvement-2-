export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  fxRates: Record<string, number>
): number {
  const fromNormalized = from.toUpperCase();
  const toNormalized = to.toUpperCase();
  if (fromNormalized === toNormalized) return amount;

  const fromRate = fxRates[fromNormalized];
  const toRate = fxRates[toNormalized];

  if (!fromRate || !toRate) {
    throw new Error(`Missing FX rate: ${fromNormalized} -> ${toNormalized}`);
  }

  return (amount / fromRate) * toRate;
}

export function fmtMoney(value: number | null | undefined, currency: string): string {
  if (value == null || isNaN(value)) return "N/A";
  const normalized = currency.toUpperCase();
  
  // Clean up formatting for VND / USD / USDT / USDC
  const displayCurrency = normalized === "USDT" || normalized === "USDC" ? "USD" : normalized;
  
  try {
    return new Intl.NumberFormat(displayCurrency === "VND" ? "vi-VN" : "en-US", {
      style: "currency",
      currency: displayCurrency,
      maximumFractionDigits: displayCurrency === "VND" ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(displayCurrency === "VND" ? 0 : 2)} ${displayCurrency}`;
  }
}

export function fmtSignedMoney(value: number | null | undefined, currency: string): string {
  if (value == null || isNaN(value)) return "N/A";
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${fmtMoney(Math.abs(value), currency)}`;
}

const COMPACT_UNITS = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"], [1, ""]] as const;

function compactMagnitude(value: number, locale: string): string {
  const absolute = Math.abs(value);
  let unitIndex = COMPACT_UNITS.findIndex(([threshold]) => absolute >= threshold);
  if (unitIndex === -1) unitIndex = COMPACT_UNITS.length - 1;

  let [threshold, label] = COMPACT_UNITS[unitIndex];
  let scaled = absolute / threshold;

  // Promote rounded values instead of ever rendering four integer digits.
  if (unitIndex > 0 && Math.round(scaled * 10) / 10 >= 1000) {
    unitIndex -= 1;
    [threshold, label] = COMPACT_UNITS[unitIndex];
    scaled = absolute / threshold;
  }

  const compact = scaled.toLocaleString(locale, { maximumFractionDigits: 1 });
  return `${compact}${label}`;
}

export function fmtCompactNumber(value: number | null | undefined, locale = "en-US"): string {
  if (value == null || isNaN(value)) return "N/A";
  return `${value < 0 ? "-" : ""}${compactMagnitude(value, locale)}`;
}

// Quantities are ledger data, not headline metrics: preserve the database's
// eight decimal places instead of rounding small crypto positions to 0 or 0.1.
export function fmtQuantity(value: number | null | undefined, locale = "en-US"): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString(locale, { maximumFractionDigits: 8 });
}

export function fmtCompactMoney(
  value: number | null | undefined,
  currency: string,
  localeOverride?: string
): string {
  if (value == null || isNaN(value)) return "N/A";
  const normalized = currency.toUpperCase();
  const sign = value < 0 ? "-" : "";
  const symbol = normalized === "VND" ? "₫" : "$";
  const locale = localeOverride ?? (normalized === "VND" ? "vi-VN" : "en-US");
  return `${sign}${symbol}${compactMagnitude(value, locale)}`;
}

export function fmtCompactSignedMoney(
  value: number | null | undefined,
  currency: string,
  localeOverride?: string
): string {
  if (value == null || isNaN(value)) return "N/A";
  return `${value >= 0 ? "+" : "-"}${fmtCompactMoney(Math.abs(value), currency, localeOverride)}`;
}
export function getValueTone(value: number | null | undefined): "positive" | "negative" | "neutral" {
  if (value == null || isNaN(value)) return "neutral";
  return value >= 0 ? "positive" : "negative";
}

export function isPositive(value: number | null | undefined): boolean {
  return value != null && !isNaN(value) && value >= 0;
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
