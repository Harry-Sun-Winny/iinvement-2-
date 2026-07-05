process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import YahooFinanceClass from 'yahoo-finance2';
const yahooFinance = new YahooFinanceClass();
import { NextRequest, NextResponse } from 'next/server';

function safeDiv(numerator: number, denominator: number): number {
  if (!denominator || !isFinite(denominator)) return 0;
  const result = numerator / denominator;
  return isFinite(result) ? result : 0;
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

const SYMBOL_ALIASES: Record<string, string> = {
  INTEL: "INTC",
  TSMC: "TSM",
  FOXCONN: "2317.TW",
  HONHAI: "2317.TW",
  "HON HAI": "2317.TW",
  MEDIATEK: "2454.TW",
  UMC: "UMC",
  ASE: "ASX",
  SANTA: "SAN",
  APPLE: "AAPL",
};

function getSymbolCandidates(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  const alias = SYMBOL_ALIASES[normalized] ?? normalized;
  if (alias.includes(".")) return [alias];
  if (/^\d{4,6}$/.test(alias)) return [`${alias}.TW`, `${alias}.TWO`, alias];
  return [alias, `${alias}.VN`];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');

  if (!symbol || symbol.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing required query parameter: symbol' },
      { status: 400 },
    );
  }

  const cleanSymbol = symbol.trim().toUpperCase();

  try {
    let lastError: unknown = null;
    for (const candidate of getSymbolCandidates(cleanSymbol)) {
      try {
        // 1. Fetch key stats for EPS & PE
        const quoteSummary = await yahooFinance.quoteSummary(candidate, {
          modules: ['defaultKeyStatistics', 'financialData'],
        });

        const keyStats: any = quoteSummary?.defaultKeyStatistics ?? {};
        const financialData: any = quoteSummary?.financialData ?? {};

        const eps: number = keyStats?.trailingEps ?? financialData?.earningsPerShare ?? 0;
        const pe: number = keyStats?.trailingPE ?? keyStats?.forwardPE ?? (financialData?.currentPrice ? safeDiv(financialData.currentPrice, eps) : 0);

        // 2. Fetch financials, balance sheet, and cash flow using fundamentalsTimeSeries
        const [financialsResult, balanceSheetResult, cashFlowResult] = await Promise.all([
          yahooFinance.fundamentalsTimeSeries(candidate, { module: 'financials', period1: '2018-01-01', type: 'annual' }),
          yahooFinance.fundamentalsTimeSeries(candidate, { module: 'balance-sheet', period1: '2018-01-01', type: 'annual' }),
          yahooFinance.fundamentalsTimeSeries(candidate, { module: 'cash-flow', period1: '2018-01-01', type: 'annual' })
        ]);

        // Group items by year
        const reportsMap: Record<number, any> = {};

        financialsResult.forEach((f: any) => {
          if (!f.date || Object.keys(f).length < 5) return;
          const year = new Date(f.date).getFullYear();
          if (!reportsMap[year]) reportsMap[year] = { year, period: 'FY', date: f.date };
          reportsMap[year].incomeStatement = {
            revenue: f.totalRevenue ?? 0,
            grossProfit: f.grossProfit ?? f.totalRevenue ?? 0,
            operatingIncome: f.operatingIncome ?? f.netIncome ?? 0,
            netIncome: f.netIncome ?? 0
          };
        });

        balanceSheetResult.forEach((b: any) => {
          if (!b.date || Object.keys(b).length < 5) return;
          const year = new Date(b.date).getFullYear();
          if (!reportsMap[year]) reportsMap[year] = { year, period: 'FY', date: b.date };
          reportsMap[year].balanceSheet = {
            totalAssets: b.totalAssets ?? 0,
            totalLiabilities: b.totalLiabilitiesNetMinorityInterest ?? b.totalLiab ?? b.totalLiabilities ?? 0,
            totalEquity: b.stockholdersEquity ?? b.totalStockholderEquity ?? 0,
            cashAndEquivalents: b.cashAndCashEquivalents ?? b.cash ?? 0
          };
        });

        cashFlowResult.forEach((c: any) => {
          if (!c.date || Object.keys(c).length < 5) return;
          const year = new Date(c.date).getFullYear();
          if (!reportsMap[year]) reportsMap[year] = { year, period: 'FY', date: c.date };
          reportsMap[year].cashFlow = {
            operatingCashFlow: c.operatingCashFlow ?? 0,
            investingCashFlow: c.investingCashFlow ?? 0,
            financingCashFlow: c.financingCashFlow ?? 0,
            freeCashFlow: c.freeCashFlow ?? (c.operatingCashFlow ?? 0) + (c.capitalExpenditures ?? 0)
          };
        });

        // Convert map to array and calculate ratios
        const reports = Object.values(reportsMap)
          .map((r: any) => {
            const revenue = r.incomeStatement?.revenue ?? 0;
            const grossProfit = r.incomeStatement?.grossProfit ?? 0;
            const operatingIncome = r.incomeStatement?.operatingIncome ?? 0;
            const netIncome = r.incomeStatement?.netIncome ?? 0;

            const totalAssets = r.balanceSheet?.totalAssets ?? 0;
            const totalLiabilities = r.balanceSheet?.totalLiabilities ?? 0;
            const totalEquity = r.balanceSheet?.totalEquity ?? 0;
            const cashAndEquivalents = r.balanceSheet?.cashAndEquivalents ?? 0;

            const operatingCashFlow = r.cashFlow?.operatingCashFlow ?? 0;
            const investingCashFlow = r.cashFlow?.investingCashFlow ?? 0;
            const financingCashFlow = r.cashFlow?.financingCashFlow ?? 0;
            const freeCashFlow = r.cashFlow?.freeCashFlow ?? 0;

            const roe = roundTo(safeDiv(netIncome, totalEquity) * 100, 2);
            const roa = roundTo(safeDiv(netIncome, totalAssets) * 100, 2);
            const grossMargin = roundTo(safeDiv(grossProfit, revenue) * 100, 2);
            const netMargin = roundTo(safeDiv(netIncome, revenue) * 100, 2);
            const debtToEquity = roundTo(safeDiv(totalLiabilities, totalEquity), 2);

            return {
              id: `${cleanSymbol}_${r.year}`,
              symbol: cleanSymbol,
              year: r.year,
              period: 'FY',
              incomeStatement: { revenue, grossProfit, operatingIncome, netIncome },
              balanceSheet: { totalAssets, totalLiabilities, totalEquity, cashAndEquivalents },
              cashFlow: { operatingCashFlow, investingCashFlow, financingCashFlow, freeCashFlow },
              ratios: {
                roe,
                roa,
                grossMargin,
                netMargin,
                debtToEquity,
                eps: eps,
                pe: roundTo(pe, 2),
              }
            };
          })
          .sort((a, b) => b.year - a.year);

        return NextResponse.json(reports);
      } catch (error) {
        lastError = error;
      }
    }

    console.error(`[stock-financials] Failed to fetch data for ${symbol}:`, lastError);
    return NextResponse.json([]);
  } catch (error) {
    console.error(`[stock-financials] Outer failure for ${symbol}:`, error);
    return NextResponse.json([]);
  }
}
