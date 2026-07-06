import { useState, useEffect, useMemo } from "react";
import { HoldingExt } from "@/app/holdings/page";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import AutoSizedChart from "@/components/charts/AutoSizedChart";

export function IncomeTab({ holding, marketData }: { holding: HoldingExt, marketData?: any }) {
  const formatNum = (num: number | undefined | null, prefix = "", suffix = "") => 
    num != null ? `${prefix}${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}` : "--";

  const [divHistory, setDivHistory] = useState<any[]>([]);
  const [loadingDiv, setLoadingDiv] = useState(false);

  useEffect(() => {
    setLoadingDiv(true);
    fetch(`/api/stock-dividends?symbol=${encodeURIComponent(holding.symbol)}&startDate=2024-01-01`)
      .then(res => res.json())
      .then(data => {
        setDivHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => setDivHistory([]))
      .finally(() => setLoadingDiv(false));
  }, [holding.symbol]);

  const yieldOnCost = marketData?.annualDividend && holding.avgCost > 0 
    ? (marketData.annualDividend / holding.avgCost) * 100 
    : null;

  const annualDividend = marketData?.annualDividend || 0;
  const projectedAnnualIncome = holding.quantity * annualDividend;

  const monthlyProjection = useMemo(() => {
    if (projectedAnnualIncome <= 0) return [];
    
    const payMonths = new Set<number>();
    divHistory.forEach(d => {
      const date = new Date(d.paymentDate);
      if (!isNaN(date.getTime())) {
        payMonths.add(date.getMonth());
      }
    });

    if (payMonths.size === 0) {
      payMonths.add(0); // Jan
      payMonths.add(3); // Apr
      payMonths.add(6); // Jul
      payMonths.add(9); // Oct
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const payoutPerEvent = projectedAnnualIncome / payMonths.size;

    return months.map((name, index) => {
      const hasPayout = payMonths.has(index);
      return {
        name,
        payout: hasPayout ? parseFloat(payoutPerEvent.toFixed(2)) : 0
      };
    });
  }, [projectedAnnualIncome, divHistory]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Dividend Yield" value={formatNum(marketData?.dividendYield, "", "%")} />
        <MetricCard label="Yield on Cost" value={formatNum(yieldOnCost, "", "%")} />
        <MetricCard label="Annual Dividend" value={formatNum(marketData?.annualDividend, "$")} />
        <MetricCard label="Next Ex-Div Date" value={marketData?.exDividendDate || "--"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Dividend Calendar (Ex-Dates)</p>
          <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
            {loadingDiv ? (
              <p className="text-xs text-slate-500">Loading...</p>
            ) : divHistory.length > 0 ? (
              divHistory.slice(0, 4).map((div, i) => (
                <div key={i} className="flex justify-between items-center p-2.5 rounded bg-white/[0.01] border border-white/5 text-xs">
                  <span className="font-medium text-slate-400">Ex-Date: {new Date(div.recordDate).toLocaleDateString()}</span>
                  <span className="font-bold text-slate-200">
                    ${div.dividendRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                </div>
              ))
            ) : (
              <div className="h-24 flex items-center justify-center border border-dashed border-white/5 rounded">
                <span className="text-slate-600 text-xs">-- (No dividend calendar data)</span>
              </div>
            )}
          </div>
        </div>

        <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Projected Monthly Income</p>
          <div className="h-40 flex items-center justify-center">
            {monthlyProjection.length > 0 ? (
              <AutoSizedChart>
                <BarChart data={monthlyProjection}>
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 9 }} stroke="#1e293b" />
                  <YAxis tick={{ fill: "#64748b", fontSize: 9 }} stroke="#1e293b" tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px" }}
                    labelStyle={{ color: "#94a3b8", fontSize: "10px", fontWeight: "bold" }}
                  />
                  <Bar dataKey="payout" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </AutoSizedChart>
            ) : (
              <span className="text-slate-600 text-xs">-- (No projected dividend income)</span>
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
