import { HoldingExt } from "@/app/holdings/page";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";

export function PositionTab({ holding, transactions, marketData }: { holding: HoldingExt, transactions: any[], marketData?: any }) {
  const formatNum = (num: number | undefined, prefix = "", suffix = "") => 
    num != null ? `${prefix}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}` : "--";

  const costBasis = holding.avgCost * holding.quantity;

  // Calculate Realized P&L
  let realizedPnL = 0;
  let currentQty = 0;
  let currentCost = 0;
  
  const assetTx = transactions
    .filter(t => (t.assetSymbol || "").toUpperCase() === holding.symbol.toUpperCase())
    .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

  assetTx.forEach(tx => {
    const qty = Number(tx.quantity);
    const price = Number(tx.price);
    if (tx.type === "BUY") {
      currentQty += qty;
      currentCost += qty * price;
    } else if (tx.type === "SELL") {
      const avgCost = currentQty > 0 ? currentCost / currentQty : price;
      const profit = (price - avgCost) * qty;
      realizedPnL += profit;
      currentQty -= qty;
      currentCost = Math.max(0, currentCost - avgCost * qty);
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label="Market Value" value={formatNum(holding.marketValue, "$")} />
        <MetricCard label="Cost Basis" value={formatNum(costBasis, "$")} />
        <MetricCard label="Average Cost" value={formatNum(holding.avgCost, "$")} />
        
        <MetricCard 
          label="Unrealized P&L" 
          value={formatNum(Math.abs(holding.pnl), holding.pnl >= 0 ? "+$" : "-$")} 
          trend={holding.pnl >= 0 ? "up" : "down"}
        />
        <MetricCard 
          label="Realized P&L" 
          value={formatNum(Math.abs(realizedPnL), realizedPnL >= 0 ? "+$" : "-$")} 
          trend={realizedPnL >= 0 ? "up" : "down"} 
        />
        
        <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Portfolio Weight</p>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-slate-200">{formatNum(holding.weight, "", "%")}</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(holding.weight, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">6-Month Price Chart</p>
        <div className="h-32 flex items-center justify-center border border-dashed border-white/5 rounded">
          {marketData?.historicalPrices && marketData.historicalPrices.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={marketData.historicalPrices.slice().reverse()}>
                <YAxis domain={["auto", "auto"]} hide />
                <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <span className="text-slate-600 text-xs">-- (No historical price data)</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend }: { label: string, value: string, trend?: "up" | "down" }) {
  return (
    <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{label}</p>
      <p className={`text-xl font-bold ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-200"}`}>
        {value}
      </p>
    </div>
  );
}
