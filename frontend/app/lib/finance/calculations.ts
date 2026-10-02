import { Transaction, Portfolio } from "../api";
import { convertCurrency } from "./currency";

export interface StockQuote {
  price: number;
  previousClose?: number;
  dayHigh?: number | null;
  dayLow?: number | null;
  changeAmount?: number;
  changePercent?: number;
  currency: string;
  tradingDate?: string | null;
}

export interface DashboardPosition {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number | null;
  marketValue: number | null;
  todayPnl: number | null;
  pnl: number | null;
  returnPct: number | null;
  portfolioId: string;
  portfolioName: string;
  assetType: string;
  currency: string;      // Cost basis / original portfolio currency
  quoteCurrency?: string; // Live quote price currency
}

export interface DisplayPosition extends DashboardPosition {
  displayCurrency: string;
  avgCostDisplay: number;
  currentPriceDisplay: number | null;
  marketValueDisplay: number | null;
  todayPnlDisplay: number | null;
  pnlDisplay: number | null;
}

export interface Holding {
  name: string;
  qty: number;
  cost: number;
}

export interface FinancialCalculationError {
  type: "OVERSELL" | "MISSING_FX_RATE" | "INVALID_TRANSACTION";
  severity: "warning" | "error";
  message: string;
  transactionId?: string;
  portfolioId?: string;
  portfolioName?: string;
  symbol?: string;
  date?: string;
  attemptedQuantity?: number;
  availableQuantity?: number;
}

export interface HoldingBuildResult {
  holdings: Record<string, Holding>;
  errors: FinancialCalculationError[];
  /** Realized P/L from completed sales, in the portfolio transaction currency. */
  realizedPnl: number;
}

export interface PortfolioStat {
  id: string;
  value: number | null;
  pnl: number | null;
  returnPct: number | null;
}

export function buildHoldingsFromTransactions(
  txs: Transaction[],
  portfolio?: Portfolio
): HoldingBuildResult {
  const holdings: Record<string, Holding> = {};
  const errors: FinancialCalculationError[] = [];
  let realizedPnl = 0;

  const sortedTxs = [...txs].sort((a, b) => {
    const dateA = new Date(a.transactionDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.transactionDate || b.createdAt || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
  });

  sortedTxs.forEach((tx) => {
    const symbol = String(tx.assetSymbol || "").toUpperCase();
    if (!symbol) return;

    const quantity = Number(tx.quantity || 0);
    const price = Number(tx.price || 0);
    const fee = Math.max(0, Number((tx as any).fee || 0));
    const side = String(tx.type || "").toUpperCase();
    const dateKey = String(tx.transactionDate || tx.createdAt || "").slice(0, 10);

    if (!holdings[symbol]) {
      holdings[symbol] = { name: tx.assetName || symbol, qty: 0, cost: 0 };
    }

    if (side === "BUY") {
      holdings[symbol].qty += quantity;
      // A buy fee increases the cost basis of the open position.
      holdings[symbol].cost += quantity * price + fee;
    }

    if (side === "SELL") {
      const currentQty = holdings[symbol].qty;
      if (quantity > currentQty) {
        errors.push({
          type: "OVERSELL",
          severity: "warning",
          message: `${symbol}: Bán ${quantity} vượt quá số lượng sở hữu ${currentQty} ngày ${dateKey}. Giao dịch này đã bị bỏ qua để bảo toàn số liệu.`,
          transactionId: tx.id,
          portfolioId: portfolio?.id,
          portfolioName: portfolio?.name,
          symbol,
          date: dateKey,
          attemptedQuantity: quantity,
          availableQuantity: currentQty,
        });
        return; // Reject oversell transaction
      }
      const avg = currentQty > 0 ? holdings[symbol].cost / currentQty : price;
      const soldCost = avg * quantity;
      // A sell fee reduces the proceeds from the completed sale.
      realizedPnl += quantity * price - fee - soldCost;
      holdings[symbol].qty -= quantity;
      holdings[symbol].cost = Math.max(0, holdings[symbol].cost - soldCost);
    }
  });

  return { holdings, errors, realizedPnl };
}

export function buildPositionsFromHoldings(
  holdings: Record<string, Holding>,
  portfolio: Portfolio
): DashboardPosition[] {
  return Object.entries(holdings)
    .filter(([, item]) => item.qty > 0)
    .map(([symbol, item]) => {
      const avgCost = item.cost / item.qty;
      return {
        symbol,
        name: item.name,
        quantity: item.qty,
        avgCost,
        currentPrice: avgCost,
        marketValue: item.cost,
        todayPnl: 0,
        pnl: 0,
        returnPct: 0,
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        assetType: portfolio.type || "OTHER",
        currency: portfolio.baseCurrency || (portfolio as any).currency || "USD",
      };
    });
}

export function calculateTodayPnl(quantity: number, quote: StockQuote): number | null {
  if (quote.previousClose != null) {
    return quantity * (quote.price - quote.previousClose);
  }

  if (quote.changeAmount != null) {
    return quantity * quote.changeAmount;
  }

  if (quote.changePercent != null) {
    const previousClose = quote.price / (1 + quote.changePercent / 100);
    return quantity * (quote.price - previousClose);
  }

  const anyQuote = quote as any;
  if (typeof anyQuote.change === "number") {
    return quantity * anyQuote.change;
  }

  return null;
}

export function applyLivePrices(
  positions: DashboardPosition[],
  quotesBySymbol: Map<string, StockQuote>
): DashboardPosition[] {
  return positions.map((pos) => {
    const quote = quotesBySymbol.get(pos.symbol);
    if (!quote) return pos;

    const marketValue = pos.quantity * quote.price;
    const costBasis = pos.quantity * pos.avgCost;
    const pnl = marketValue - costBasis;
    const returnPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    const todayPnl = calculateTodayPnl(pos.quantity, quote);

    return {
      ...pos,
      currentPrice: quote.price,
      marketValue,
      todayPnl,
      pnl,
      returnPct,
      quoteCurrency: quote.currency || pos.currency,
    };
  });
}

export function buildDisplayPositions(
  positions: DashboardPosition[],
  baseCurrency: string,
  fxRates: Record<string, number>
): DisplayPosition[] {
  return positions.map((pos) => {
    const costCurr = pos.currency || "USD";
    const quoteCurr = pos.quoteCurrency || costCurr;
    const displayCurrency = baseCurrency;

    const costBasis = pos.quantity * pos.avgCost;
    const marketVal = pos.quantity * (pos.currentPrice ?? pos.avgCost);

    const costBasisDisplay = convertCurrency(costBasis, costCurr, displayCurrency, fxRates);
    const marketValueDisplay = convertCurrency(marketVal, quoteCurr, displayCurrency, fxRates);
    const pnlDisplay = marketValueDisplay - costBasisDisplay;

    const avgCostDisplay = pos.quantity > 0 ? costBasisDisplay / pos.quantity : 0;
    const currentPriceDisplay = pos.quantity > 0 ? marketValueDisplay / pos.quantity : null;
    const todayPnlDisplay = pos.todayPnl != null
      ? convertCurrency(pos.todayPnl, quoteCurr, displayCurrency, fxRates)
      : null;

    return {
      ...pos,
      displayCurrency,
      avgCostDisplay,
      currentPriceDisplay,
      marketValueDisplay,
      todayPnlDisplay,
      pnlDisplay,
    };
  });
}

export function computeDisplayPortfolioStats(
  positions: DisplayPosition[],
  portfolios: Portfolio[]
): Record<string, PortfolioStat> {
  return portfolios.reduce<Record<string, PortfolioStat>>((acc, portfolio) => {
    const pPositions = positions.filter((pos) => pos.portfolioId === portfolio.id);
    const value = pPositions.reduce((sum, pos) => sum + (pos.marketValueDisplay || 0), 0);
    const totalCostDisplay = pPositions.reduce((sum, pos) => sum + (pos.quantity * pos.avgCostDisplay), 0);
    const pnl = value - totalCostDisplay;

    acc[portfolio.id] = {
      id: portfolio.id,
      value,
      pnl,
      returnPct: totalCostDisplay > 0 ? (pnl / totalCostDisplay) * 100 : 0,
    };
    return acc;
  }, {});
}
