import { HoldingExt } from "@/app/holdings/page";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { getWeightForSector, recommendation, scorePosition, weightedScore } from "@/lib/analysis-framework";

export function AnalysisTab({ holding, marketData }: { holding: HoldingExt, marketData?: any }) {
  const formatNum = (num: number | undefined | null, prefix = "", suffix = "") => 
    num != null ? `${prefix}${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}` : "--";

  const pillarScores = scorePosition({
    returnPct: holding.returnPct,
    totalReturnPct: holding.returnPct,
    weight: holding.weight,
  });
  const totalScore = weightedScore(pillarScores, holding.canonical?.sector || "Other");

  const radarData = (() => {
    const keys: (keyof typeof pillarScores)[] = ["fundamental", "technical", "quantitative", "sentiment"];
    const labels: Record<string, string> = {
      fundamental: "Cơ bản",
      technical: "Kỹ thuật",
      quantitative: "Định lượng",
      sentiment: "Tâm lý",
    };
    const weights = getWeightForSector(holding.canonical?.sector || "Other");

    return keys.map((k) => ({
      pillar: labels[k as string],
      score: pillarScores[k] / 20,
      weight: weights[k],
    }));
  })();

  const rec = recommendation(totalScore);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6">
        
        {/* Radar Chart Panel */}
        <div className="antigravity-panel p-6 border-white/5 bg-white/[0.01]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">4 Pillars Framework</p>
            {rec && (
              <Badge
                className={`text-[9px] font-black uppercase ${
                  rec.tone === "buy"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : rec.tone === "sell"
                    ? "bg-red-500/15 text-red-400 border-red-500/30"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                }`}
              >
                {rec.label}
              </Badge>
            )}
          </div>
          
          <div className="h-[250px] flex items-center justify-center">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="pillar" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "#475569", fontSize: 8 }} />
                  <Radar name="Score" dataKey="score" stroke="#c44dff" fill="#c44dff" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-600 text-xs">-- (No analysis available)</span>
            )}
          </div>
        </div>

        {/* Pillar Scores & Consensus */}
        <div className="space-y-4">
          <MetricCard label="Overall Score" value={(totalScore / 20).toFixed(1) + " / 5.0"} />
          <MetricCard label="Analyst Consensus" value={marketData?.recommendation || "--"} />
          <div className="grid grid-cols-3 gap-2">
            <div className="antigravity-panel p-2 bg-emerald-500/5 border-emerald-500/10 text-center">
              <p className="text-[9px] text-emerald-500 font-bold">BUY</p>
              <p className="text-sm font-bold text-emerald-400">{marketData?.buyCount ?? "--"}</p>
            </div>
            <div className="antigravity-panel p-2 bg-slate-500/5 border-slate-500/10 text-center">
              <p className="text-[9px] text-slate-500 font-bold">HOLD</p>
              <p className="text-sm font-bold text-slate-400">{marketData?.holdCount ?? "--"}</p>
            </div>
            <div className="antigravity-panel p-2 bg-red-500/5 border-red-500/10 text-center">
              <p className="text-[9px] text-red-500 font-bold">SELL</p>
              <p className="text-sm font-bold text-red-400">{marketData?.sellCount ?? "--"}</p>
            </div>
          </div>
          <MetricCard label="Avg Target Price" value={formatNum(marketData?.targetPrice, "$")} />
          <MetricCard 
            label="Expected Upside" 
            value={marketData?.targetPrice && holding.currentPrice 
              ? formatNum(((marketData.targetPrice - holding.currentPrice) / holding.currentPrice) * 100, "", "%")
              : "--"} 
          />
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
