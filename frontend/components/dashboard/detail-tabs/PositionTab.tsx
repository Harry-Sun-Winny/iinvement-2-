import { fmtMoney, fmtSignedMoney } from "../../../app/lib/finance/currency";
import AutoSizedChart from "@/components/charts/AutoSizedChart";
import ChartTooltip from "@/components/charts/ChartTooltip";
import { CartesianGrid, LineChart, Line, Tooltip, XAxis, YAxis } from "recharts";

export function PositionTab({ 
  holding, 
  transactions, 
  marketData, 
  currency = "USD" 
}: { 
  holding: any, 
  transactions: any[], 
  marketData?: any, 
  currency?: string 
}) {
  const formatNum = (num: number | undefined, prefix = "", suffix = "") => 
    num != null ? `${prefix}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}` : "--";

  const isVnd = currency === "VND";
  const costBasis = (holding.marketValueDisplay ?? holding.marketValue) - (holding.pnlDisplay ?? holding.pnl);

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

  const displayRealizedPnL = isVnd ? realizedPnL * 25400 : realizedPnL;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label="Market Value" value={fmtMoney(holding.marketValueDisplay ?? holding.marketValue, currency)} />
        <MetricCard label="Cost Basis" value={fmtMoney(holding.costBasisDisplay ?? costBasis, currency)} />
        <MetricCard label="Average Cost" value={fmtMoney(holding.avgCostDisplay ?? holding.avgCost, currency)} />
        
        <MetricCard 
          label="Unrealized P&L" 
          value={fmtSignedMoney(holding.pnlDisplay ?? holding.pnl, currency)} 
          trend={(holding.pnlDisplay ?? holding.pnl) >= 0 ? "up" : "down"}
        />
        <MetricCard 
          label="Realized P&L" 
          value={fmtSignedMoney(displayRealizedPnL, currency)} 
          trend={displayRealizedPnL >= 0 ? "up" : "down"} 
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
        <div className="mb-3 flex items-center justify-between gap-3"><p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">6-Month Price Chart</p><span className="text-[10px] text-slate-500">Hover để xem giá và ngày</span></div>
        <div className="h-44 flex items-center justify-center border border-dashed border-white/5 rounded px-2 py-2">
          {marketData?.historicalPrices && marketData.historicalPrices.length > 0 ? (
            <AutoSizedChart>
              <LineChart data={marketData.historicalPrices.slice().reverse()} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={{ stroke: "#334155" }} tickFormatter={(value) => String(value).slice(5)} minTickGap={28} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} width={48} tickFormatter={(value) => Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })} />
                <Tooltip content={<ChartTooltip labelFormatter={(value) => `Ngày ${value}`} valueFormatter={(value) => formatNum(Number(value), currency === "VND" ? "₫" : "$" )} />} />
                <Line name="Giá đóng cửa" type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#e0f2fe" }} />
              </LineChart>
            </AutoSizedChart>
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
