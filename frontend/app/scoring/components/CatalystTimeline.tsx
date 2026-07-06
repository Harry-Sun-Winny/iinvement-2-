import React, { memo, useMemo } from "react";
import AutoSizedChart from "@/components/charts/AutoSizedChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardData } from "../../watchlist/[id]/lib/types";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CatalystTimelineProps {
  data: Readonly<DashboardData> | null;
}

function CatalystTimeline({ data }: CatalystTimelineProps) {
  const points = useMemo(() => {
    if (!data || typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("saved_stock_scores");
      if (!raw) return [];
      const all: Array<{ symbol: string; date: string; displayScore?: number; totalScore?: number }> = JSON.parse(raw);
      return all
        .filter((item) => item.symbol.toUpperCase() === data.symbol.toUpperCase())
        .map((item) => ({
          date: item.date,
          score: item.displayScore ?? item.totalScore ?? 0,
        }))
        .reverse();
    } catch {
      return [];
    }
  }, [data]);

  return (
    <Card className="antigravity-panel border-white/5 bg-white/[0.01]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Historical Score Timeline & Catalyst Alert
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4">
        {data && points.length > 0 ? (
          <div className="h-[220px] w-full">
            <AutoSizedChart>
              <LineChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#475569" fontSize={9} />
                <YAxis domain={[0, 5]} stroke="#475569" fontSize={9} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.05)", borderRadius: "8px" }}
                  labelStyle={{ color: "#94a3b8", fontSize: "10px" }}
                  itemStyle={{ color: "#38bdf8", fontSize: "12px", fontWeight: "bold" }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ fill: "#38bdf8", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </AutoSizedChart>
          </div>
        ) : (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-white/5 bg-slate-950/40 p-8">
            <p className="font-mono text-xs text-slate-500">
              {data ? "No rating history logged for this stock yet" : "Timeline Chart (No Ticker Selected)"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(CatalystTimeline);
