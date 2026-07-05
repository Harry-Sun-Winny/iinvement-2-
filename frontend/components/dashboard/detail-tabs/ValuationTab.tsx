import { HoldingExt } from "@/app/holdings/page";

export function ValuationTab({ holding, marketData }: { holding: HoldingExt, marketData?: any }) {
  const formatNum = (num: number | undefined | null, prefix = "", suffix = "") => 
    num != null ? `${prefix}${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}` : "--";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="P/E Ratio" value={formatNum(marketData?.pe)} />
        <MetricCard label="Forward P/E" value={formatNum(marketData?.forwardPe)} />
        <MetricCard label="PEG Ratio" value="--" /> {/* FMP ratio TTm doesn't provide PEG by default */}
        <MetricCard label="P/B Ratio" value={formatNum(marketData?.pb)} />
        <MetricCard label="P/S Ratio" value={formatNum(marketData?.ps)} />
        <MetricCard label="EV / EBITDA" value="--" /> 
        <MetricCard label="ROE" value={formatNum(marketData?.roe, "", "%")} />
        <MetricCard label="EPS (TTM)" value={formatNum(marketData?.eps, "$")} />
      </div>

      <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Peer Comparison</p>
        <div className="h-32 flex items-center justify-center border border-dashed border-white/5 rounded">
          <span className="text-slate-600 text-xs">-- (No peer data available)</span>
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
