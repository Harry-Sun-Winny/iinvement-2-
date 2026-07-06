import { TransactionDTO, AssetType, BondLedgerDTO } from '../../../../types/ledger';

export interface HoldingLot {
  id: string;
  symbol: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
}

export interface AssetHolding {
  symbol: string;
  assetType: AssetType;
  totalQuantity: number;
  averageCost: number; // in base currency
  currentPrice: number; // in base currency
  marketValue: number; // in base currency
  totalCost: number; // in base currency
  pnl: number; // in base currency
  pnlPercentage: number;
  lots: HoldingLot[];
}
export function getCurrencyConversionFactor(symbol: string, baseCurrency: string): number {
  const normSymbol = symbol.trim().toUpperCase();
  
  const isVnStock = /^[A-Z]{3}$/.test(normSymbol)
    ? !['AMD', 'BAC', 'CAT', 'LLY', 'LTY', 'JPM', 'SAN', 'TSM', 'ARM'].includes(normSymbol)
    : normSymbol.endsWith('.VN');
    
  const isUsdStock = !isVnStock;
  
  if (baseCurrency === 'VND') {
    return isUsdStock ? 25400 : 1;
  } else if (baseCurrency === 'USD') {
    return isUsdStock ? 1 : 1 / 25400;
  }
  return 1;
}

/**
 * Calculates current asset holdings from a list of transactions using FIFO (First In First Out).
 * @param transactions - All transactions
 * @param currentPrices - Optional map of symbol -> live price (in original stock currency).
 * @param baseCurrency - Target currency (defaults to VND).
 */
export function calculateHoldings(
  transactions: TransactionDTO[],
  currentPrices?: Record<string, number>,
  baseCurrency: string = 'VND'
): AssetHolding[] {
  const activeTx = transactions.filter(t => !t.deletedAt && !t.archived);

  const sortedTx = [...activeTx].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
  );

  const holdingsMap: Record<string, { assetType: AssetType; lots: HoldingLot[] }> = {};

  for (const tx of sortedTx) {
    if (!holdingsMap[tx.symbol]) {
      holdingsMap[tx.symbol] = { assetType: tx.assetType, lots: [] };
    }

    const asset = holdingsMap[tx.symbol];

    if (tx.type === 'BUY') {
      asset.lots.push({
        id: tx.id,
        symbol: tx.symbol,
        quantity: tx.quantity,
        purchasePrice: tx.price,
        purchaseDate: tx.transactionDate
      });
    } else if (tx.type === 'SELL') {
      let remainingToSell = tx.quantity;
      while (remainingToSell > 0 && asset.lots.length > 0) {
        const firstLot = asset.lots[0];
        if (firstLot.quantity <= remainingToSell) {
          remainingToSell -= firstLot.quantity;
          asset.lots.shift();
        } else {
          firstLot.quantity -= remainingToSell;
          remainingToSell = 0;
        }
      }
    }
  }

  return Object.entries(holdingsMap)
    .map(([symbol, data]) => {
      const activeLots = data.lots.filter(l => l.quantity > 0);
      const totalQuantity = activeLots.reduce((sum, l) => sum + l.quantity, 0);

      if (totalQuantity === 0) return null;

      const fx = getCurrencyConversionFactor(symbol, baseCurrency);

      const totalCostOriginal = activeLots.reduce((sum, l) => sum + l.quantity * l.purchasePrice, 0);
      const totalCost = totalCostOriginal * fx;
      const averageCost = totalCost / totalQuantity;

      // Use real price from API if available, otherwise fall back to average cost
      const currentPriceOriginal = currentPrices?.[symbol] ?? (totalCostOriginal / totalQuantity);
      const currentPrice = currentPriceOriginal * fx;
      const marketValue = totalQuantity * currentPrice;
      const pnl = marketValue - totalCost;
      const pnlPercentage = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

      return {
        symbol,
        assetType: data.assetType,
        totalQuantity,
        averageCost,
        currentPrice,
        marketValue,
        totalCost,
        pnl,
        pnlPercentage,
        lots: activeLots
      };
    })
    .filter((h): h is AssetHolding => h !== null);
}

/**
 * Calculates historical values of the portfolio at different end-of-month checkpoints.
 * @param transactions - All transactions
 * @param currentPrices - Optional map of symbol -> live price for the current month's valuation.
 * @param historyPricesMap - Optional map of symbol -> (monthKey -> historical price) for accurate historical valuation.
 * @param baseCurrency - Portfolio base currency
 * @param bonds - Optional list of bond ledger items
 */
export function calculateHistoricalPerformance(
  transactions: TransactionDTO[],
  currentPrices?: Record<string, number>,
  historyPricesMap?: Record<string, Record<string, number>>,
  baseCurrency: string = 'VND',
  bonds?: BondLedgerDTO[]
) {
  const activeTx = transactions.filter(t => !t.deletedAt);
  if (activeTx.length === 0) return [];

  // Sort transactions chronologically
  const sortedTx = [...activeTx].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
  );

  const earliestDate = new Date(sortedTx[0].transactionDate);
  let y = earliestDate.getFullYear();
  let m = earliestDate.getMonth(); // 0-11

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const historyPoints: { year: string; costBasis: number; marketValue: number }[] = [];

  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    // Get the exact last millisecond of the month using new Date(year, monthIndex + 1, 0)
    const checkpointTime = new Date(y, m + 1, 0, 23, 59, 59).getTime();
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;

    const txUntilMonth = activeTx.filter(t => {
      const txTime = new Date(t.transactionDate).getTime();
      return txTime <= checkpointTime;
    });

    // Build the prices map for this specific historical month in original currency
    const pricesForMonth: Record<string, number> = {};
    const isCurrentMonth = y === currentYear && m === currentMonth;

    const holdingsAtMonth = calculateHoldings(txUntilMonth, undefined, baseCurrency);
    holdingsAtMonth.forEach(h => {
      const fx = getCurrencyConversionFactor(h.symbol, baseCurrency);
      const avgCostOriginal = h.averageCost / fx;

      if (isCurrentMonth && currentPrices?.[h.symbol] !== undefined) {
        pricesForMonth[h.symbol] = currentPrices[h.symbol];
      } else if (historyPricesMap?.[h.symbol]?.[monthKey] !== undefined) {
        pricesForMonth[h.symbol] = historyPricesMap[h.symbol][monthKey];
      } else {
        pricesForMonth[h.symbol] = avgCostOriginal;
      }
    });

    const holdings = calculateHoldings(txUntilMonth, pricesForMonth, baseCurrency);
    const costBasisStocks = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    const marketValueStocks = holdings.reduce((sum, h) => sum + h.marketValue, 0);

    // Calculate bonds active at this checkpoint
    let bondsCostBasis = 0;
    let bondsMarketValue = 0;

    if (bonds) {
      const activeBondsAtCheckpoint = bonds.filter(b => {
        if (b.deletedAt && new Date(b.deletedAt).getTime() <= checkpointTime) {
          return false;
        }
        const purchaseTime = new Date(b.purchaseDate).getTime();
        if (purchaseTime > checkpointTime) return false;

        // If status is MATURED, check maturity date
        if (b.status === 'MATURED') {
          const maturityTime = new Date(b.maturityDate).getTime();
          return checkpointTime <= maturityTime;
        }
        return true;
      });

      bondsCostBasis = activeBondsAtCheckpoint.reduce((sum, b) => sum + b.faceValue * b.quantity, 0);
      bondsMarketValue = bondsCostBasis;
    }

    const costBasis = costBasisStocks + bondsCostBasis;
    const marketValue = marketValueStocks + bondsMarketValue;

    historyPoints.push({
      year: `${String(m + 1).padStart(2, '0')}/${y}`,
      costBasis,
      marketValue
    });

    // Advance by 1 month
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }

  return historyPoints;
}
