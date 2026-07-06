import { TransactionDTO, DividendEventDTO } from '../../../../types/ledger';
import { calculateHoldings, getCurrencyConversionFactor } from './portfolioEngine';

export interface CalculatedDividend {
  id: string;
  symbol: string;
  recordDate: string;
  paymentDate: string;
  rate: number;
  type: 'CASH' | 'STOCK';
  sharesHeldAtRecord: number;
  payout: number; // Value in cash or number of shares
  isValid: boolean;
}

/**
 * Calculates the quantity of a stock held exactly on a specific record date, taking into account multi-lot purchases and FIFO sales.
 */
export function getQuantityHeldAtDate(transactions: TransactionDTO[], symbol: string, dateStr: string): number {
  const targetDate = new Date(dateStr).getTime();
  
  // Only look at transactions on or before the record date
  const txBeforeRecord = transactions.filter(
    t => !t.deletedAt && t.symbol === symbol && new Date(t.transactionDate).getTime() <= targetDate
  );

  const holdings = calculateHoldings(txBeforeRecord);
  const matched = holdings.find(h => h.symbol === symbol);
  return matched ? matched.totalQuantity : 0;
}

/**
 * Processes all dividend events against transactions history to determine valid received dividends
 */
export function calculateReceivedDividends(
  transactions: TransactionDTO[],
  dividendEvents: DividendEventDTO[],
  baseCurrency: string = 'VND'
): CalculatedDividend[] {
  const result: CalculatedDividend[] = [];

  for (const event of dividendEvents) {
    if (event.deletedAt) continue;

    const sharesHeld = getQuantityHeldAtDate(transactions, event.symbol, event.recordDate);
    
    // Only register if the user actually held shares at the record date
    if (sharesHeld > 0) {
      let payout = event.type === 'CASH' 
        ? sharesHeld * event.dividendRate 
        : sharesHeld * event.dividendRate; // stock dividend represents quantity of shares

      if (event.type === 'CASH') {
        const factor = getCurrencyConversionFactor(event.symbol, baseCurrency);
        payout = payout * factor;
      }

      const isFuture = new Date(event.paymentDate).getTime() > Date.now();

      result.push({
        id: event.id,
        symbol: event.symbol,
        recordDate: event.recordDate,
        paymentDate: event.paymentDate,
        rate: event.dividendRate,
        type: event.type,
        sharesHeldAtRecord: sharesHeld,
        payout,
        isValid: !isFuture
      });
    }
  }

  // Sort by payment date descending
  return result.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
}

/**
 * Summarizes dividends by year for charts
 */
export function summarizeDividendsByYear(calculatedDividends: CalculatedDividend[]) {
  const summary: Record<number, { cash: number; stockShares: number }> = {};

  for (const div of calculatedDividends) {
    if (!div.isValid) continue; // Only count paid/valid dividends
    
    const year = new Date(div.paymentDate).getFullYear();
    if (!summary[year]) {
      summary[year] = { cash: 0, stockShares: 0 };
    }

    if (div.type === 'CASH') {
      summary[year].cash += div.payout;
    } else {
      summary[year].stockShares += div.payout;
    }
  }

  return Object.entries(summary).map(([year, data]) => ({
    year: Number(year),
    cash: data.cash,
    stockShares: data.stockShares
  })).sort((a, b) => a.year - b.year);
}
