import { Portfolio, Transaction } from "../api";
import { convertCurrency } from "./currency";
import { StockQuote, FinancialCalculationError } from "./calculations";

export interface PerformancePoint {
  /** ISO date keeps the chart chronological when transactions span years. */
  date: string;
  label: string;
  portfolioValue: number;
  netInvested: number;
  pnl: number;
}

export interface PerformanceBuildResult {
  points: PerformancePoint[];
  errors: FinancialCalculationError[];
  isEstimated: true;
  methodology: "TRANSACTION_PRICE_ESTIMATE";
}

interface TxWithPortfolio {
  tx: Transaction;
  portfolio: Portfolio;
}

function transactionDateKey(tx: Transaction) {
  return String(tx.transactionDate || tx.createdAt || "").slice(0, 10);
}

export function buildPerformanceTimeline(
  portfolioTxns: Array<{ portfolio: Portfolio; txs: Transaction[] }>,
  quotesBySymbol: Map<string, StockQuote>,
  baseCurrency: string,
  fxRates: Record<string, number>
): PerformanceBuildResult {
  const points: PerformancePoint[] = [];
  const errors: FinancialCalculationError[] = [];
  const allTxsWithPortfolio: TxWithPortfolio[] = [];
  const seenTransactions = new Set<string>();

  portfolioTxns.forEach(({ portfolio, txs }) => {
    txs.forEach((tx) => {
      // A duplicated response must not create a duplicated holding.
      const transactionKey = `${portfolio.id}:${tx.id}`;
      if (seenTransactions.has(transactionKey)) return;
      seenTransactions.add(transactionKey);
      allTxsWithPortfolio.push({ tx, portfolio });
    });
  });

  allTxsWithPortfolio.sort((a, b) => {
    const dateA = new Date(a.tx.transactionDate || a.tx.createdAt || 0).getTime();
    const dateB = new Date(b.tx.transactionDate || b.tx.createdAt || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return new Date(a.tx.createdAt ?? 0).getTime() - new Date(b.tx.createdAt ?? 0).getTime();
  });

  const datesSet = new Set<string>();
  allTxsWithPortfolio.forEach(({ tx }) => {
    const dateKey = transactionDateKey(tx);
    if (dateKey) datesSet.add(dateKey);
  });
  const todayStr = new Date().toISOString().slice(0, 10);
  datesSet.add(todayStr);
  const sortedDates = Array.from(datesSet).sort((a, b) => a.localeCompare(b));

  const txsByDate = new Map<string, TxWithPortfolio[]>();
  allTxsWithPortfolio.forEach((item) => {
    const dateKey = transactionDateKey(item.tx);
    if (!dateKey) return;
    const existing = txsByDate.get(dateKey) || [];
    existing.push(item);
    txsByDate.set(dateKey, existing);
  });

  // A symbol is scoped to a portfolio: the same ticker can appear in portfolios
  // using different currencies, cost bases, and quantities.
  const holdingQty: Record<string, number> = {};
  const lastPrice: Record<string, { price: number; currency: string; symbol: string }> = {};
  let cumulativeInvestedInBase = 0;

  sortedDates.forEach((date) => {
    const dayTxs = txsByDate.get(date) || [];
    dayTxs.forEach(({ tx, portfolio }) => {
      const symbol = String(tx.assetSymbol || "").toUpperCase();
      if (!symbol) return;
      const holdingKey = `${portfolio.id}:${symbol}`;
      const qty = Number(tx.quantity || 0);
      const price = Number(tx.price || 0);
      const side = String(tx.type || "").toUpperCase();
      const currency = portfolio.baseCurrency || (portfolio as any).currency || "USD";

      if (side === "BUY") {
        holdingQty[holdingKey] = (holdingQty[holdingKey] || 0) + qty;
        lastPrice[holdingKey] = { price, currency, symbol };
        try { cumulativeInvestedInBase += convertCurrency(qty * price, currency, baseCurrency, fxRates); } catch {}
      }

      if (side === "SELL") {
        const currentQty = holdingQty[holdingKey] || 0;
        if (qty > currentQty) {
          errors.push({
            type: "OVERSELL",
            severity: "warning",
            message: `${symbol}: sell quantity exceeds the holding on ${date}.`,
            transactionId: tx.id,
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
            symbol,
            date,
            attemptedQuantity: qty,
            availableQuantity: currentQty,
          });
          return;
        }
        holdingQty[holdingKey] = Math.max(0, currentQty - qty);
        lastPrice[holdingKey] = { price, currency, symbol };
        try { cumulativeInvestedInBase -= convertCurrency(qty * price, currency, baseCurrency, fxRates); } catch {}
      }
    });

    let portfolioValueInBase = 0;
    Object.keys(holdingQty).forEach((holdingKey) => {
      const qty = holdingQty[holdingKey];
      const priceInfo = lastPrice[holdingKey];
      if (qty <= 0 || !priceInfo) return;
      let priceAtDate = priceInfo.price;
      let priceCurrency = priceInfo.currency;
      if (date === todayStr) {
        const quote = quotesBySymbol.get(priceInfo.symbol);
        if (quote) {
          priceAtDate = quote.price;
          priceCurrency = quote.currency || priceInfo.currency;
        }
      }
      try { portfolioValueInBase += qty * convertCurrency(priceAtDate, priceCurrency, baseCurrency, fxRates); } catch {}
    });

    points.push({
      date,
      label: date,
      portfolioValue: Math.round(portfolioValueInBase * 100) / 100,
      netInvested: Math.round(cumulativeInvestedInBase * 100) / 100,
      pnl: Math.round((portfolioValueInBase - cumulativeInvestedInBase) * 100) / 100,
    });
  });

  return { points, errors, isEstimated: true, methodology: "TRANSACTION_PRICE_ESTIMATE" };
}
