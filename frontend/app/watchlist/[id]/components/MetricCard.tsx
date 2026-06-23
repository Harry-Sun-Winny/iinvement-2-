"use client";

import { memo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  trend?: number | null;
  loading?: boolean;
}

function getTrendTone(trend?: number | null) {
  if (trend == null || !Number.isFinite(trend)) return "text-slate-400";
  return trend >= 0 ? "text-emerald-400" : "text-red-400";
}

function MetricCard({ label, value, sublabel, trend, loading }: MetricCardProps) {
  const TrendIcon = trend == null || !Number.isFinite(trend) ? Minus : trend >= 0 ? ArrowUpRight : ArrowDownRight;
  const valueTone = value.trim().startsWith("-") ? "text-red-400" : "text-white";

  return (
    <Card className="border-white/10 bg-slate-950/55 shadow-none transition-colors hover:border-cyan-400/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            {loading ? (
              <Skeleton className="mt-3 h-7 w-28 bg-white/10" />
            ) : (
              <p className={`mt-2 truncate text-xl font-semibold ${valueTone}`}>{value}</p>
            )}
          </div>
          <Badge variant="outline" className={`shrink-0 border-white/10 bg-white/[0.03] ${getTrendTone(trend)}`}>
            <TrendIcon className="mr-1 h-3 w-3" />
            {trend == null || !Number.isFinite(trend) ? "N/A" : `${trend >= 0 ? "+" : ""}${trend.toFixed(2)}%`}
          </Badge>
        </div>
        {sublabel && <p className="mt-3 text-xs text-slate-500">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

export default memo(MetricCard);
