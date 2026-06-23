"use client";

import { memo, useMemo, useState } from "react";
import {
  Area,
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface StockSeriesPoint {
  date: string;
  price: number | null;
  volume: number | null;
  ma50: number | null;
  ma200: number | null;
  revenue: number | null;
  ebitda: number | null;
  netIncome: number | null;
  marketCap: number | null;
}

type SeriesKey = keyof Omit<StockSeriesPoint, "date">;
type RangeKey = "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "5Y" | "Max";

const ranges: RangeKey[] = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "Max"];

const seriesConfig: { key: SeriesKey; label: string; color: string; kind: "line" | "area" | "bar"; axis: "left" | "right" }[] = [
  { key: "price", label: "Price", color: "#38bdf8", kind: "area", axis: "left" },
  { key: "volume", label: "Volume", color: "#64748b", kind: "bar", axis: "right" },
  { key: "ma50", label: "50D MA", color: "#f59e0b", kind: "line", axis: "left" },
  { key: "ma200", label: "200D MA", color: "#a78bfa", kind: "line", axis: "left" },
  { key: "revenue", label: "Revenue", color: "#10b981", kind: "line", axis: "right" },
  { key: "ebitda", label: "EBITDA", color: "#22c55e", kind: "line", axis: "right" },
  { key: "netIncome", label: "Net Income", color: "#ef4444", kind: "line", axis: "right" },
  { key: "marketCap", label: "Market Cap", color: "#60a5fa", kind: "line", axis: "right" },
];

function compactNumber(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) return `${sign}${(abs / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toFixed(2)}`;
}

function filterByRange(data: StockSeriesPoint[], range: RangeKey) {
  if (range === "Max" || data.length === 0) return data;
  const last = new Date(data[data.length - 1].date).getTime();
  const days = range === "1M" ? 31 : range === "3M" ? 92 : range === "6M" ? 183 : range === "1Y" ? 366 : range === "3Y" ? 1096 : range === "5Y" ? 1827 : null;
  if (range === "YTD") {
    const year = new Date(last).getFullYear();
    return data.filter(point => new Date(point.date).getFullYear() === year);
  }
  if (!days) return data;
  const start = last - days * 24 * 60 * 60 * 1000;
  return data.filter(point => new Date(point.date).getTime() >= start);
}

function downsample(data: StockSeriesPoint[], maxPoints = 900) {
  if (data.length <= maxPoints) return data;
  const step = (data.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, index) => data[Math.round(index * step)]);
}

function StockTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-56 rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold text-white">{compactNumber(Number(entry.value))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StockChartProps {
  data: StockSeriesPoint[];
  loading?: boolean;
  error?: string;
}

function StockChart({ data, loading, error }: StockChartProps) {
  const [range, setRange] = useState<RangeKey>("1Y");
  const [activeSeries, setActiveSeries] = useState<Record<SeriesKey, boolean>>({
    price: true,
    volume: true,
    ma50: true,
    ma200: true,
    revenue: false,
    ebitda: false,
    netIncome: false,
    marketCap: false,
  });

  const visibleData = useMemo(() => filterByRange(data, range), [data, range]);
  const chartData = useMemo(() => downsample(visibleData), [visibleData]);
  const availability = useMemo(
    () => Object.fromEntries(seriesConfig.map(item => [item.key, data.some(point => point[item.key] != null)])) as Record<SeriesKey, boolean>,
    [data],
  );

  function toggleSeries(key: SeriesKey) {
    if (!availability[key]) return;
    setActiveSeries(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <Card className="border-white/10 bg-white/[0.035]">
      <CardHeader className="gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="h-5 w-5 text-cyan-300" />
            Multi-Series Analytics
          </CardTitle>
          <CardDescription>Use the brush to zoom and pan. Hover for crosshair details.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {ranges.map(item => (
            <Button key={item} variant={range === item ? "default" : "outline"} size="sm" onClick={() => setRange(item)}>
              {item}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {seriesConfig.map(item => (
            <Badge
              key={item.key}
              variant="outline"
              role="button"
              tabIndex={availability[item.key] ? 0 : -1}
              aria-disabled={!availability[item.key]}
              title={availability[item.key] ? `Toggle ${item.label}` : `${item.label}: no data available`}
              onClick={() => toggleSeries(item.key)}
              onKeyDown={event => event.key === "Enter" && toggleSeries(item.key)}
              className={`border-white/10 px-3 py-1.5 ${
                !availability[item.key]
                  ? "cursor-not-allowed opacity-40"
                  : activeSeries[item.key]
                    ? "cursor-pointer bg-white/[0.08] text-white"
                    : "cursor-pointer text-slate-500"
              }`}
            >
              <span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
              {!availability[item.key] && <span className="ml-1 text-[10px]">No data</span>}
            </Badge>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-[420px] w-full bg-white/10" />
        ) : error ? (
          <div className="grid h-[420px] place-items-center rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-300">{error}</div>
        ) : chartData.length === 0 ? (
          <div className="grid h-[420px] place-items-center rounded-xl border border-white/10 bg-slate-950/40 text-sm text-slate-500">No chart data available.</div>
        ) : (
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 18, bottom: 20, left: 0 }}>
                <defs>
                  <linearGradient id="priceFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#334155" }} minTickGap={28} />
                <YAxis yAxisId="left" tickFormatter={compactNumber} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={62} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={compactNumber} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={68} />
                <Tooltip content={<StockTooltip />} cursor={{ stroke: "#38bdf8", strokeWidth: 1, strokeDasharray: "4 4" }} />
                {seriesConfig.map(item => {
                  if (!activeSeries[item.key]) return null;
                  if (item.kind === "bar") {
                    return <Bar key={item.key} yAxisId={item.axis} dataKey={item.key} name={item.label} fill={item.color} opacity={0.28} barSize={12} isAnimationActive />;
                  }
                  if (item.kind === "area") {
                    return <Area key={item.key} yAxisId={item.axis} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} fill="url(#priceFill)" strokeWidth={2.4} dot={false} isAnimationActive />;
                  }
                  return <Line key={item.key} yAxisId={item.axis} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={1.8} dot={false} isAnimationActive />;
                })}
                <Brush dataKey="date" height={24} travellerWidth={8} stroke="#38bdf8" fill="#020617" tickFormatter={value => String(value).slice(5)} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(StockChart);
