"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

type RadarPoint = {
  pillar: string;
  value: number;
};

interface ScoringRadarChartProps {
  data: RadarPoint[];
}

export default function ScoringRadarChart({ data }: ScoringRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis dataKey="pillar" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
        <PolarRadiusAxis domain={[1, 5]} tick={{ fill: "#64748b", fontSize: 10 }} />
        <Radar dataKey="value" stroke="#54a0ff" fill="#54a0ff" fillOpacity={0.22} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
