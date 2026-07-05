import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardData } from "../../watchlist/[id]/lib/types";
import { selectFormattedMetric } from "../../watchlist/[id]/lib/selectors";

interface BenchmarkingGridProps {
  industry: string;
  data: Readonly<DashboardData> | null;
}

function BenchmarkingGrid({ industry, data }: BenchmarkingGridProps) {
  const metrics = [
    { id: "peRatio", label: "P/E Ratio", desc: "Price to Earnings (TTM)" },
    { id: "priceToSalesRatio", label: "Price/Sales", desc: "Price to Sales (TTM)" },
    { id: "pbRatio", label: "Price/Book", desc: "Price to Book Value" },
    { id: "pegRatio", label: "PEG Ratio", desc: "PE to Growth Ratio" },
    { id: "enterpriseValue", label: "Enterprise Value", desc: "Total Enterprise Value" },
  ];

  return (
    <Card className="antigravity-panel border-white/5 bg-white/[0.01]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Relative Peer Benchmarking (Sector: {industry})
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4">
        {data ? (
          <div className="overflow-x-auto rounded-lg border border-white/5 bg-slate-950/40">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Metric</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(m => (
                  <tr key={m.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                    <td className="py-2.5 px-4 font-bold text-slate-300">{m.label}</td>
                    <td className="py-2.5 px-4 text-slate-500">{m.desc}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-cyan-400">
                      {selectFormattedMetric(data, m.id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border border-white/5 bg-slate-950/40 rounded-xl p-8 min-h-[160px]">
            <p className="text-xs text-slate-500 font-mono">Relative Metrics Grid (No Ticker Selected)</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(BenchmarkingGrid);
