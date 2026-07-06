import { useMemo } from "react";
import { HoldingExt } from "@/app/holdings/page";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import AutoSizedChart from "@/components/charts/AutoSizedChart";

export function RiskTab({ holding, marketData }: { holding: HoldingExt, marketData?: any }) {
  const formatNum = (num: number | undefined | null, prefix = "", suffix = "") => 
    num != null ? `${prefix}${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}` : "--";

  const riskMetrics = useMemo(() => {
    const prices = marketData?.historicalPrices || [];
    if (prices.length < 30) return null;

    const sortedPrices = [...prices]
      .map(p => p.close)
      .filter((v): v is number => typeof v === 'number');

    if (sortedPrices.length < 30) return null;

    const returns: number[] = [];
    for (let i = 1; i < sortedPrices.length; i++) {
      const prev = sortedPrices[i - 1];
      if (prev > 0) {
        returns.push((sortedPrices[i] - prev) / prev);
      }
    }

    if (returns.length < 20) return null;

    const recentReturns = returns.slice(-30);
    const mean = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
    const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (recentReturns.length - 1);
    const dailyVol = Math.sqrt(variance);
    const annualizedVol = dailyVol * Math.sqrt(252);

    let peak = -Infinity;
    let maxDrawdown = 0;
    sortedPrices.forEach(price => {
      if (price > peak) peak = price;
      const dd = peak > 0 ? (peak - price) / peak : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    const totalReturn = (sortedPrices[sortedPrices.length - 1] - sortedPrices[0]) / sortedPrices[0];
    const years = sortedPrices.length / 252;
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / (years || 1)) - 1;

    const rf = 0.04;
    const sharpe = annualizedVol > 0 ? (annualizedReturn - rf) / annualizedVol : null;

    const downsideReturns = recentReturns.filter(r => r < 0);
    const downsideVariance = downsideReturns.length > 0 
      ? downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length 
      : 0.0001;
    const downsideVol = Math.sqrt(downsideVariance) * Math.sqrt(252);
    const sortino = downsideVol > 0 ? (annualizedReturn - rf) / downsideVol : null;

    const sortedReturns = [...recentReturns].sort((a, b) => a - b);
    const varIndex = Math.floor(sortedReturns.length * 0.05);
    const var95 = sortedReturns[varIndex] ? -sortedReturns[varIndex] : 0;

    return {
      volatility: annualizedVol * 100,
      maxDrawdown: maxDrawdown * 100,
      sharpe: sharpe ? Math.max(-5, Math.min(5, sharpe)) : null,
      sortino: sortino ? Math.max(-5, Math.min(5, sortino)) : null,
      var95: var95 * 100
    };
  }, [marketData]);

  const drawdownHistory = useMemo(() => {
    const prices = marketData?.historicalPrices || [];
    if (prices.length === 0) return [];
    
    let peak = -Infinity;
    return prices.slice(-100).map((p: any) => {
      const close = Number(p.close || 0);
      if (close > peak) peak = close;
      const dd = peak > 0 ? ((peak - close) / peak) * 100 : 0;
      return {
        date: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        drawdown: -dd
      };
    });
  }, [marketData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label="Sharpe Ratio" value={riskMetrics ? riskMetrics.sharpe?.toFixed(2) ?? "--" : "--"} />
        <MetricCard label="Sortino Ratio" value={riskMetrics ? riskMetrics.sortino?.toFixed(2) ?? "--" : "--"} />
        <MetricCard label="Beta" value={formatNum(marketData?.beta)} />
        
        <MetricCard label="Volatility (30d)" value={riskMetrics ? riskMetrics.volatility.toFixed(2) + "%" : "--"} />
        <MetricCard label="Max Drawdown" value={riskMetrics ? riskMetrics.maxDrawdown.toFixed(2) + "%" : "--"} />
        <MetricCard label="VaR (95%)" value={riskMetrics ? riskMetrics.var95.toFixed(2) + "%" : "--"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Correlation Heatmap</p>
          <div className="h-40 flex items-center justify-center border border-dashed border-white/5 rounded">
            <span className="text-slate-600 text-xs">-- (Requires multi-asset correlation engine)</span>
          </div>
        </div>
        
        <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Drawdown Chart (Last 100 days)</p>
          <div className="h-40 flex items-center justify-center">
            {drawdownHistory.length > 0 ? (
              <AutoSizedChart>
                <AreaChart data={drawdownHistory}>
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} stroke="#1e293b" />
                  <YAxis tick={{ fill: "#64748b", fontSize: 9 }} stroke="#1e293b" unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px" }}
                    labelStyle={{ color: "#94a3b8", fontSize: "10px", fontWeight: "bold" }}
                  />
                  <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} />
                </AreaChart>
              </AutoSizedChart>
            ) : (
              <span className="text-slate-600 text-xs">-- (No historical data available)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-200">{value}</p>
    </div>
  );
}
