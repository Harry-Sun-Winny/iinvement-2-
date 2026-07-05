import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SectorPerformance() {
  const sectors = [
    { name: "Technology", change: 1.45 },
    { name: "Financials", change: -0.22 },
    { name: "Healthcare", change: 0.58 },
    { name: "Energy", change: -1.12 },
    { name: "Consumer Discretionary", change: 0.89 },
  ];

  return (
    <Card className="antigravity-panel border-white/5 bg-white/[0.01]">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Sector Performance (1D)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 py-4">
        {sectors.map((sec, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
            <span className="text-slate-350 font-medium">{sec.name}</span>
            <span className={`font-mono font-bold ${sec.change >= 0 ? "text-green-450" : "text-red-450"}`}>
              {sec.change >= 0 ? "+" : ""}{sec.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
