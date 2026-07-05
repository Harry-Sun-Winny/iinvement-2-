import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardData } from "../../watchlist/[id]/lib/types";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface WaterfallAttributionProps {
  scores: Record<string, number>;
  weights: Record<string, number>;
  data: Readonly<DashboardData> | null;
}

const PILLAR_LABEL: Record<string, string> = {
  fundamental: "Cơ bản",
  technical: "Kỹ thuật",
  quantitative: "Định lượng",
  sentiment: "Tâm lý",
};

export default function WaterfallAttribution({ scores, weights, data }: WaterfallAttributionProps) {
  const radarData = useMemo(() => {
    return Object.keys(scores).map((key) => ({
      pillar: PILLAR_LABEL[key] || key,
      value: scores[key],
      weight: weights[key] ?? 0,
    }));
  }, [scores, weights]);

  return (
    <Card className="antigravity-panel border-white/5 bg-white/[0.01]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Score Attribution & Diagnostic Workstation
        </CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6 py-4">
        {/* Left Side: Dynamic Radar Chart */}
        <div className="flex flex-col justify-center items-center border border-white/5 bg-slate-950/40 rounded-xl p-4 min-h-[240px] h-[240px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="pillar" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[1, 5]} dataKey="value" tick={{ fill: "#475569", fontSize: 9 }} />
              <Radar
                name="Điểm"
                dataKey="value"
                stroke="#54a0ff"
                fill="#54a0ff"
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Right Side: Contribution details shell */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
            Pillar Contribution
          </p>
          <div className="space-y-2.5">
            {Object.entries(scores).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center bg-slate-950/20 p-2.5 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white capitalize">{PILLAR_LABEL[key] || key}</span>
                  <Badge variant="outline" className="border-blue-500/20 text-blue-400 text-[9px] bg-blue-500/[0.02]">
                    w: {weights[key] ?? 0}%
                  </Badge>
                </div>
                <span className="font-mono text-xs text-cyan-400 font-bold">
                  {val.toFixed(1)} / 5.0
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
