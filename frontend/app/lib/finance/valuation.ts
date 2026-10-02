import { Portfolio, Transaction } from "../api";
import {
  applyLivePrices,
  buildDisplayPositions,
  buildHoldingsFromTransactions,
  buildPositionsFromHoldings,
  DashboardPosition,
  DisplayPosition,
  FinancialCalculationError,
  StockQuote,
} from "./calculations";
import { convertCurrency } from "./currency";

export interface PortfolioTransactionSet {
  portfolio: Portfolio;
  txs: Transaction[];
}

export interface PortfolioValuation {
  positions: DashboardPosition[];
  displayPositions: DisplayPosition[];
  errors: FinancialCalculationError[];
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  totalPnl: number;
}

/**
 * Canonical valuation pipeline for every portfolio surface.
 * Prices are read in quote.currency and converted only at display time.
 */
export function valuePortfolioSets(
  portfolioTxns: PortfolioTransactionSet[],
  quotesBySymbol: Map<string, StockQuote>,
  displayCurrency: string,
  fxRates: Record<string, number>,
): PortfolioValuation {
  const errors: FinancialCalculationError[] = [];
  const positions: DashboardPosition[] = [];
  let totalRealizedPnl = 0;

  portfolioTxns.forEach(({ portfolio, txs }) => {
    const built = buildHoldingsFromTransactions(txs, portfolio);
    errors.push(...built.errors);
    positions.push(...buildPositionsFromHoldings(built.holdings, portfolio));
    const portfolioCurrency = portfolio.baseCurrency || (portfolio as any).currency || "USD";
    totalRealizedPnl += convertCurrency(built.realizedPnl, portfolioCurrency, displayCurrency, fxRates);
  });

  const pricedPositions = applyLivePrices(positions, quotesBySymbol);
  const displayPositions = buildDisplayPositions(pricedPositions, displayCurrency, fxRates);
  const totalMarketValue = displayPositions.reduce((sum, position) => sum + (position.marketValueDisplay ?? 0), 0);
  const totalCostBasis = displayPositions.reduce((sum, position) => sum + (position.quantity * position.avgCostDisplay), 0);

  return {
    positions: pricedPositions,
    displayPositions,
    errors,
    totalMarketValue,
    totalCostBasis,
    totalUnrealizedPnl: totalMarketValue - totalCostBasis,
    totalRealizedPnl,
    totalPnl: totalMarketValue - totalCostBasis + totalRealizedPnl,
  };
}
