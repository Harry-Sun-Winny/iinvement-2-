import type { Transaction } from "@/app/lib/api";
import type { PortfolioMetrics, PositionSummary, SortDir, SortKey, StockData } from "@/types/analysis";

export const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
export const formatNumber = (value: unknown, digits = 2) => isFiniteNumber(value)
  ? value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })
  : "N/A";
export const formatPercent = (value: unknown) => isFiniteNumber(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "N/A";

export function buildPositions(transactions: Transaction[]): PositionSummary[] {
  const holdings: Record<string, { name: string; quantity: number; cost: number }> = {};
  for (const transaction of transactions) {
    const symbol = transaction.assetSymbol;
    if (!holdings[symbol]) holdings[symbol] = { name: transaction.assetName, quantity: 0, cost: 0 };
    if (transaction.type === "BUY") {
      holdings[symbol].quantity += transaction.quantity;
      holdings[symbol].cost += transaction.quantity * transaction.price;
    } else {
      holdings[symbol].quantity -= transaction.quantity;
      holdings[symbol].cost -= transaction.quantity * transaction.price;
    }
  }
  return Object.entries(holdings)
    .filter(([, value]) => value.quantity > 0)
    .map(([symbol, value]) => ({
      symbol,
      name: value.name,
      quantity: value.quantity,
      avgPrice: value.cost / value.quantity,
      currentPrice: 0,
      value: 0,
      pnl: 0,
      pnlPct: 0,
      priced: false,
    }));
}

export function applyPrices(positions: PositionSummary[], prices: Record<string, { price: number }>) {
  return positions.map(position => {
    const quote = prices[position.symbol];
    if (!isFiniteNumber(quote?.price)) return { ...position, priced: false };
    const value = position.quantity * quote.price;
    const cost = position.quantity * position.avgPrice;
    const pnl = value - cost;
    return { ...position, currentPrice: quote.price, value, pnl, pnlPct: cost > 0 ? (pnl / cost) * 100 : 0, priced: true };
  });
}

export function calculateRiskScore(positions: PositionSummary[]) {
  if (!positions.length) return 0;
  const totalValue = positions.reduce((sum, position) => sum + position.value, 0);
  if (!totalValue) return 0;
  const hhi = positions.reduce((sum, position) => sum + Math.pow(position.value / totalValue, 2), 0);
  const averageMove = positions.reduce((sum, position) => sum + Math.abs(position.pnlPct), 0) / positions.length;
  return Math.round(hhi * 50 + Math.min(averageMove / 2, 50));
}

export function getRiskLabel(score: number) {
  if (score < 25) return { label: "Thấp", color: "text-green-400", bg: "bg-green-500" };
  if (score < 50) return { label: "Trung bình", color: "text-yellow-400", bg: "bg-yellow-400" };
  if (score < 75) return { label: "Cao", color: "text-orange-400", bg: "bg-orange-400" };
  return { label: "Rất cao", color: "text-red-400", bg: "bg-red-500" };
}

type SortContext = { totalValue: number | null };
type SortAccessor = (position: PositionSummary, context: SortContext) => string | number;

export const positionSortAccessors: Record<SortKey, SortAccessor> = {
  symbol: position => position.symbol,
  value: position => position.value,
  pnl: position => position.pnl,
  pnlPct: position => position.pnlPct,
  weight: (position, context) => position.priced && context.totalValue ? position.value / context.totalValue : 0,
};

export function selectPortfolioMetrics(
  transactions: Transaction[],
  prices: Record<string, StockData>,
  sortKey: SortKey,
  sortDir: SortDir,
): PortfolioMetrics {
  const positions = applyPrices(buildPositions(transactions), prices);
  const pricedPositions = positions.filter(position => position.priced);
  const totalValue = pricedPositions.length ? pricedPositions.reduce((sum, position) => sum + position.value, 0) : null;
  const totalPnl = pricedPositions.length ? pricedPositions.reduce((sum, position) => sum + position.pnl, 0) : null;
  const totalCost = pricedPositions.reduce((sum, position) => sum + position.quantity * position.avgPrice, 0);
  const totalPnlPct = totalPnl != null && totalCost > 0 ? (totalPnl / totalCost) * 100 : null;
  const riskScore = pricedPositions.length ? calculateRiskScore(pricedPositions) : null;
  const context = { totalValue };
  const accessor = positionSortAccessors[sortKey];
  const direction = sortDir === "asc" ? 1 : -1;
  const sortedPositions = [...positions].sort((left, right) => {
    const leftValue = accessor(left, context);
    const rightValue = accessor(right, context);
    return typeof leftValue === "string"
      ? leftValue.localeCompare(String(rightValue)) * direction
      : (leftValue - Number(rightValue)) * direction;
  });
  return {
    positions,
    pricedPositions,
    sortedPositions,
    totalValue,
    totalPnl,
    totalCost,
    totalPnlPct,
    riskScore,
    risk: getRiskLabel(riskScore ?? 0),
    winner: pricedPositions.reduce((best, position) => !best || position.pnlPct > best.pnlPct ? position : best, null as PositionSummary | null),
    loser: pricedPositions.reduce((worst, position) => !worst || position.pnlPct < worst.pnlPct ? position : worst, null as PositionSummary | null),
    missingPriceCount: positions.length - pricedPositions.length,
  };
}
