import { HoldingExt } from "@/app/holdings/page";

export function IncomeTab({ holding, marketData }: { holding: HoldingExt, marketData?: any }) {
  const formatNum = (num: number | undefined | null, prefix = "", suffix = "") => 
    num != null ? `${prefix}${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}` : "--";

  const yieldOnCost = marketData?.annualDividend && holding.avgCost > 0 
    ? (marketData.annualDividend / holding.avgCost) * 100 
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Dividend Yield" value={formatNum(marketData?.dividendYield, "", "%")} />
        <MetricCard label="Yield on Cost" value={formatNum(yieldOnCost, "", "%")} />
        <MetricCard label="Annual Dividend" value={formatNum(marketData?.annualDividend, "$")} />
        <MetricCard label="Next Ex-Div Date" value="--" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Dividend Calendar</p>
          <div className="h-32 flex items-center justify-center border border-dashed border-white/5 rounded">
            <span className="text-slate-600 text-xs">-- (No dividend data)</span>
          </div>
        </div>
        <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Monthly Income Projection</p>
          <div className="h-32 flex items-center justify-center border border-dashed border-white/5 rounded">
            <span className="text-slate-600 text-xs">-- (No projection data)</span>
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
