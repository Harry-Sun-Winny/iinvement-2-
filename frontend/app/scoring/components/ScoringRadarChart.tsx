"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";
import AutoSizedChart from "@/components/charts/AutoSizedChart";

type RadarPoint = {
  pillar: string;
  value: number;
};

interface ScoringRadarChartProps {
  data: RadarPoint[];
}

export default function ScoringRadarChart({ data }: ScoringRadarChartProps) {
  return (
    <AutoSizedChart>
      <RadarChart data={data}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis dataKey="pillar" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
        <PolarRadiusAxis domain={[1, 5]} tick={{ fill: "#64748b", fontSize: 10 }} />
        <Radar dataKey="value" stroke="#54a0ff" fill="#54a0ff" fillOpacity={0.22} />
      </RadarChart>
    </AutoSizedChart>
  );
}
