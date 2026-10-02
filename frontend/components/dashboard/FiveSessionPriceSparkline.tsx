"use client";

export interface SessionPricePoint {
  date: string;
  close: number;
}

interface FiveSessionPriceSparklineProps {
  symbol: string;
  points?: SessionPricePoint[];
  currency: string;
  locale: string;
}

const WIDTH = 112;
const HEIGHT = 32;
const PADDING = 3;

function formatPrice(value: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(currency === "VND" ? 0 : 2)} ${currency}`;
  }
}

function formatDate(value: string, locale: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(parsed);
}

export function FiveSessionPriceSparkline({
  symbol,
  points,
  currency,
  locale,
}: FiveSessionPriceSparklineProps) {
  const isVi = locale.toLowerCase().startsWith("vi");

  if (points === undefined) {
    return (
      <span
        role="status"
        aria-label={isVi ? `Đang tải giá 5 phiên của ${symbol}` : `Loading ${symbol} 5-session prices`}
        className="mx-auto block h-7 w-24 rounded-md bg-white/[0.05]"
      />
    );
  }

  const recentPoints = points
    .filter((point) => Boolean(point.date) && Number.isFinite(point.close) && point.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5);

  if (recentPoints.length < 2) {
    return <span className="text-[10px] text-slate-500">{isVi ? "Chưa có dữ liệu" : "No data"}</span>;
  }

  const prices = recentPoints.map((point) => point.close);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const priceRange = maximum - minimum;
  const plotWidth = WIDTH - PADDING * 2;
  const plotHeight = HEIGHT - PADDING * 2;
  const coordinates = recentPoints.map((point, index) => ({
    x: PADDING + (index / (recentPoints.length - 1)) * plotWidth,
    y: priceRange === 0
      ? HEIGHT / 2
      : PADDING + ((maximum - point.close) / priceRange) * plotHeight,
  }));
  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const firstPrice = prices[0];
  const latestPrice = prices[prices.length - 1];
  const changePercent = ((latestPrice - firstPrice) / firstPrice) * 100;
  const direction = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat";
  const stroke = direction === "up" ? "#34d399" : direction === "down" ? "#fb7185" : "#94a3b8";
  const directionLabel = isVi
    ? direction === "up" ? "tăng" : direction === "down" ? "giảm" : "đi ngang"
    : direction;
  const accessibleLabel = isVi
    ? `Biểu đồ giá ${symbol}, ${recentPoints.length} phiên gần nhất, ${directionLabel} ${Math.abs(changePercent).toFixed(2)}%.`
    : `${symbol} price chart, latest ${recentPoints.length} sessions, ${directionLabel} ${Math.abs(changePercent).toFixed(2)}%.`;
  const details = recentPoints
    .map((point) => `${formatDate(point.date, locale)}: ${formatPrice(point.close, currency, locale)}`)
    .join(" · ");
  const latest = coordinates[coordinates.length - 1];

  return (
    <svg
      role="img"
      aria-label={accessibleLabel}
      data-session-count={recentPoints.length}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto block h-8 w-28 overflow-visible"
      preserveAspectRatio="none"
    >
      <title>{`${accessibleLabel} ${details}`}</title>
      <line x1={PADDING} y1={HEIGHT / 2} x2={WIDTH - PADDING} y2={HEIGHT / 2} stroke="rgba(148, 163, 184, 0.14)" strokeWidth="1" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={latest.x} cy={latest.y} r="2.25" fill={stroke} />
    </svg>
  );
}
