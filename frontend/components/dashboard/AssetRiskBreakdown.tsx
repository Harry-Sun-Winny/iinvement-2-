"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Loader2, HelpCircle, ArrowUpDown } from "lucide-react";
import { getTransactions, Transaction } from "../../app/lib/api";
import { calculateHoldings } from "../../app/ledger/services/calculators/portfolioEngine";
import { TransactionDTO } from "../../types/ledger";

export interface HistoricalPrice {
  date: string;
  close: number;
  adjustedClose: number;
  volume: number;
}

export interface CacheEntry {
  range: string;
  data: HistoricalPrice[];
  fetchedAt: number;
}

export type HistoryCache = Record<string, CacheEntry>;
export type BenchmarkCache = Record<string, CacheEntry>;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RISK_FREE_RATE = 0.0; // 0% default

interface AssetRiskBreakdownProps {
  portfolioId: string;
  timeRange: string;
  historyCache: React.MutableRefObject<HistoryCache>;
  portfolioReturns: number[]; // daily returns of the entire portfolio for risk contribution
  portfolioVolatility: number;
  benchmarkPrices: HistoricalPrice[]; // for Beta calculation
}

interface AssetRiskMetrics {
  symbol: string;
  weight: number;
  sharpe: string;
  sortino: string;
  volatility: string;
  maxDrawdown: string;
  var95: string;
  riskContribution: string;
  beta: string;
}

// Help tooltip helper
function HelpIcon({ title }: { title: string }) {
  return (
    <span className="group relative inline-block cursor-help ml-1 text-slate-500 hover:text-slate-300">
      <HelpCircle className="h-3 w-3" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded bg-slate-950 p-2 text-[10px] font-medium leading-normal text-slate-200 opacity-0 shadow-lg border border-white/10 transition-opacity group-hover:opacity-100 whitespace-normal">
        {title}
      </span>
    </span>
  );
}

export function AssetRiskBreakdown({
  portfolioId,
  timeRange,
  historyCache,
  portfolioReturns,
  portfolioVolatility,
  benchmarkPrices
}: AssetRiskBreakdownProps) {
  const [loading, setLoading] = useState(false);
  const [assetsData, setAssetsData] = useState<Record<string, HistoricalPrice[]>>({});
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<keyof AssetRiskMetrics>("symbol");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    if (portfolioId) {
      void loadPositionsAndHistory();
    }
  }, [portfolioId, timeRange]);

  async function loadPositionsAndHistory() {
    setLoading(true);
    try {
      const txs = await getTransactions(portfolioId);
      const mappedTxs: TransactionDTO[] = txs.map(t => ({
        id: t.id,
        portfolioId: t.portfolioId,
        symbol: t.assetSymbol,
        assetType: 'STOCK',
        quantity: t.quantity,
        price: t.price,
        type: t.type as 'BUY' | 'SELL',
        transactionDate: t.transactionDate ? t.transactionDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.createdAt || new Date().toISOString(),
        deletedAt: null,
        archived: false
      }));

      // Calculate active holdings
      const holdings = calculateHoldings(mappedTxs, undefined, "USD");
      setActivePositions(holdings);

      const newAssetsData: Record<string, HistoricalPrice[]> = {};
      
      // Load price history for each active asset
      await Promise.all(
        holdings.map(async (h) => {
          const symbol = h.symbol;
          const cached = historyCache.current[symbol];
          const isCacheValid = cached && cached.range === timeRange && (Date.now() - cached.fetchedAt < CACHE_TTL_MS);

          if (isCacheValid) {
            newAssetsData[symbol] = cached.data;
          } else {
            try {
              const res = await fetch(`/api/stock-history?symbol=${encodeURIComponent(symbol)}&range=${timeRange}`);
              if (res.ok) {
                const result = await res.json();
                if (result && Array.isArray(result.points)) {
                  historyCache.current[symbol] = {
                    range: timeRange,
                    data: result.points,
                    fetchedAt: Date.now()
                  };
                  newAssetsData[symbol] = result.points;
                }
              }
            } catch (err) {
              console.error(`Failed to load history for ${symbol}`, err);
            }
          }
        })
      );

      setAssetsData(newAssetsData);
    } catch (err) {
      console.error("Failed to load asset positions", err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate statistics for each asset
  const assetMetricsList = useMemo<AssetRiskMetrics[]>(() => {
    const totalMV = activePositions.reduce((sum, h) => sum + h.marketValue, 0);
    
    return activePositions.map(pos => {
      const weight = totalMV > 0 ? (pos.marketValue / totalMV) * 100 : 0;
      const history = assetsData[pos.symbol] || [];
      
      if (history.length < 20) {
        return {
          symbol: pos.symbol,
          weight,
          sharpe: "Insufficient Data",
          sortino: "Insufficient Data",
          volatility: "Insufficient Data",
          maxDrawdown: "Insufficient Data",
          var95: "Insufficient Data",
          riskContribution: "Insufficient Data",
          beta: "Insufficient Data"
        };
      }

      // 1. Calculate Daily Returns
      const dailyReturns: number[] = [];
      let maxDrawdownVal = 0;
      let peak = 0;

      for (let i = 0; i < history.length; i++) {
        const val = history[i].adjustedClose || history[i].close || 0;
        
        // Drawdown track
        if (val > peak) {
          peak = val;
        }
        if (peak > 0) {
          const dd = (peak - val) / peak;
          if (dd > maxDrawdownVal) {
            maxDrawdownVal = dd;
          }
        }

        // Daily returns
        if (i > 0) {
          const prevVal = history[i - 1].adjustedClose || history[i - 1].close || 0;
          if (prevVal > 0) {
            dailyReturns.push((val - prevVal) / prevVal);
          }
        }
      }

      // 2. Performance Stats
      const n = dailyReturns.length;
      const meanReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / n;
      const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (n - 1);
      const volatilityDaily = Math.sqrt(variance);
      const volatilityAnnualized = volatilityDaily * Math.sqrt(252);
      const annualizedReturn = meanReturn * 252;

      // Downside deviation
      const negativeReturns = dailyReturns.filter(r => r < 0);
      const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / (n - 1);
      const downsideDeviationAnnualized = Math.sqrt(downsideVariance) * Math.sqrt(252);

      // Sharpe & Sortino
      const sharpeRatio = volatilityAnnualized > 0 ? (annualizedReturn - RISK_FREE_RATE) / volatilityAnnualized : 0;
      const sortinoRatio = downsideDeviationAnnualized > 0 ? (annualizedReturn - RISK_FREE_RATE) / downsideDeviationAnnualized : 0;

      // Value at Risk (95%)
      const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
      const varIdx = Math.floor(sortedReturns.length * 0.05);
      const var95Val = sortedReturns.length > 0 ? Math.abs(sortedReturns[varIdx]) : 0;

      // 3. Contribution to Portfolio Risk (Proxy: Covariance * weight / Portfolio Volatility)
      // Alignment on dates between asset returns and portfolio returns
      let riskContributionStr = "--";
      if (portfolioReturns.length > 1 && portfolioVolatility > 0) {
        // Use simplified alignment: match last N elements
        const minLen = Math.min(dailyReturns.length, portfolioReturns.length);
        const alignedAsset = dailyReturns.slice(-minLen);
        const alignedPort = portfolioReturns.slice(-minLen);

        const assetMean = alignedAsset.reduce((s, r) => s + r, 0) / minLen;
        const portMean = alignedPort.reduce((s, r) => s + r, 0) / minLen;
        
        let cov = 0;
        for (let i = 0; i < minLen; i++) {
          cov += (alignedAsset[i] - assetMean) * (alignedPort[i] - portMean);
        }
        cov = cov / (minLen - 1);
        
        // Marginal contribution to risk (MCR) = Cov(Asset, Port) / PortVolatility
        // Risk Contribution = Weight * MCR * 252 (Annualized)
        const portfolioVolDaily = portfolioVolatility / Math.sqrt(252);
        if (portfolioVolDaily > 0) {
          const mcr = cov / portfolioVolDaily;
          const contrib = (weight / 100) * mcr * Math.sqrt(252);
          riskContributionStr = `${(contrib * 100).toFixed(1)}%`;
        }
      }

      // 4. Beta Calculation (Covariance with Benchmark / Variance of Benchmark)
      let betaStr = "--";
      if (benchmarkPrices.length > 2) {
        const benchmarkReturns: number[] = [];
        for (let i = 1; i < benchmarkPrices.length; i++) {
          const prev = benchmarkPrices[i - 1].close || 0;
          const curr = benchmarkPrices[i].close || 0;
          if (prev > 0) benchmarkReturns.push((curr - prev) / prev);
        }

        const minLen = Math.min(dailyReturns.length, benchmarkReturns.length);
        if (minLen > 1) {
          const alignedAsset = dailyReturns.slice(-minLen);
          const alignedBench = benchmarkReturns.slice(-minLen);

          const assetMean = alignedAsset.reduce((s, r) => s + r, 0) / minLen;
          const benchMean = alignedBench.reduce((s, r) => s + r, 0) / minLen;
          
          let cov = 0;
          let benchVar = 0;
          for (let i = 0; i < minLen; i++) {
            cov += (alignedAsset[i] - assetMean) * (alignedBench[i] - benchMean);
            benchVar += Math.pow(alignedBench[i] - benchMean, 2);
          }
          cov = cov / (minLen - 1);
          benchVar = benchVar / (minLen - 1);

          if (benchVar > 0) {
            betaStr = (cov / benchVar).toFixed(2);
          }
        }
      }

      return {
        symbol: pos.symbol,
        weight,
        sharpe: sharpeRatio.toFixed(2),
        sortino: sortinoRatio.toFixed(2),
        volatility: `${(volatilityAnnualized * 100).toFixed(1)}%`,
        maxDrawdown: `${(maxDrawdownVal * 100).toFixed(1)}%`,
        var95: `${(var95Val * 100).toFixed(1)}%`,
        riskContribution: riskContributionStr,
        beta: betaStr
      };
    });
  }, [activePositions, assetsData, portfolioReturns, portfolioVolatility, benchmarkPrices]);

  // Handle Sort
  const sortedMetrics = useMemo(() => {
    const sorted = [...assetMetricsList];
    sorted.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      // Parse numerical values for correct sorting
      if (sortKey === "weight") {
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      }
      
      const cleanNum = (val: string) => {
        if (val === "Insufficient Data" || val === "--") return -999999;
        return parseFloat(val.replace(/[%,]/g, ""));
      };

      if (sortKey !== "symbol") {
        const numA = cleanNum(valA as string);
        const numB = cleanNum(valB as string);
        return sortAsc ? numA - numB : numB - numA;
      }

      return sortAsc 
        ? (valA as string).localeCompare(valB as string)
        : (valB as string).localeCompare(valA as string);
    });
    return sorted;
  }, [assetMetricsList, sortKey, sortAsc]);

  const toggleSort = (key: keyof AssetRiskMetrics) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 bg-white/[0.01] border border-white/5 rounded-2xl">
        <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
        <span className="text-xs text-slate-400">Đang tính toán rủi ro tài sản...</span>
      </div>
    );
  }

  if (activePositions.length === 0) {
    return null;
  }

  return (
    <div className="antigravity-panel overflow-hidden border border-white/5 bg-white/[0.01] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Phân Rã Rủi Ro Theo Tài Sản
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Chi tiết đo lường rủi ro của từng vị thế riêng biệt</p>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[350px] custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 select-none">
              <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort("symbol")}>
                Tài sản <ArrowUpDown className="inline h-3 w-3 ml-1" />
              </th>
              <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort("weight")}>
                Tỷ trọng <ArrowUpDown className="inline h-3 w-3 ml-1" />
              </th>
              <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort("volatility")}>
                Biến động <HelpIcon title="Annualized Volatility" />
              </th>
              <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort("sharpe")}>
                Sharpe <HelpIcon title="Sharpe Ratio" />
              </th>
              <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort("sortino")}>
                Sortino <HelpIcon title="Sortino Ratio" />
              </th>
              <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort("maxDrawdown")}>
                Max DD <HelpIcon title="Max Drawdown" />
              </th>
              <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort("var95")}>
                Daily VaR <HelpIcon title="Daily Value at Risk (95%)" />
              </th>
              <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort("riskContribution")}>
                Đóng góp rủi ro <HelpIcon title="Marginal Risk Contribution" />
              </th>
              <th className="py-2.5 px-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort("beta")}>
                Beta <HelpIcon title="Beta calculated against benchmark" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedMetrics.map(item => (
              <tr key={item.symbol} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="py-3 px-3 font-bold text-white">{item.symbol}</td>
                <td className="py-3 px-2 text-right font-semibold text-slate-200">
                  {typeof item.weight === "number" ? `${item.weight.toFixed(1)}%` : item.weight}
                </td>
                <td className="py-3 px-2 text-right text-slate-300">{item.volatility}</td>
                <td className="py-3 px-2 text-right font-medium text-slate-200">{item.sharpe}</td>
                <td className="py-3 px-2 text-right text-slate-300">{item.sortino}</td>
                <td className="py-3 px-2 text-right text-red-400">{item.maxDrawdown}</td>
                <td className="py-3 px-2 text-right text-yellow-400">{item.var95}</td>
                <td className="py-3 px-2 text-right text-indigo-400">{item.riskContribution}</td>
                <td className="py-3 px-2 text-right text-emerald-400">{item.beta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
