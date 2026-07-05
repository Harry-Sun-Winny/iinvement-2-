import { HoldingExt } from "@/app/holdings/page";

export function RiskTab({ holding, marketData }: { holding: HoldingExt, marketData?: any }) {
  const formatNum = (num: number | undefined | null, prefix = "", suffix = "") => 
    num != null ? `${prefix}${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}` : "--";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label="Sharpe Ratio" value="--" />
        <MetricCard label="Sortino Ratio" value="--" />
        <MetricCard label="Beta" value={formatNum(marketData?.beta)} />
        
        <MetricCard label="Volatility (30d)" value="--" />
        <MetricCard label="Max Drawdown" value="--" />
        <MetricCard label="VaR (95%)" value="--" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Correlation Heatmap</p>
          <div className="h-32 flex items-center justify-center border border-dashed border-white/5 rounded">
            <span className="text-slate-600 text-xs">-- (No historical data)</span>
          </div>
        </div>
        <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Drawdown Chart</p>
          <div className="h-32 flex items-center justify-center border border-dashed border-white/5 rounded">
            <span className="text-slate-600 text-xs">-- (No historical data)</span>
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
