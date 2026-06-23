"use client";

import { memo } from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function heatLabel(value: number) {
  if (value >= 80) return "Rất nóng";
  if (value >= 60) return "Cao";
  if (value >= 40) return "Trung bình";
  return "Thấp";
}

function MarketHeatGauge({ value }: { value: number }) {
  const color = value >= 80 ? "#ef4444" : value >= 60 ? "#f59e0b" : value >= 40 ? "#38bdf8" : "#10b981";
  return (
    <Card className="h-full border-white/10 bg-white/[0.035]">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Market Heat</CardTitle>
        <CardDescription>Điểm nóng từ mức ảnh hưởng và biến động dự kiến.</CardDescription>
      </CardHeader>
      <CardContent className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value, fill: color }]} startAngle={210} endAngle={-30} barSize={14}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background={{ fill: "#1e293b" }} cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-x-0 top-[46%] text-center">
          <p className="text-4xl font-semibold text-white">{value}</p>
          <p className="text-xs uppercase tracking-wide" style={{ color }}>{heatLabel(value)} / 100</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(MarketHeatGauge);
