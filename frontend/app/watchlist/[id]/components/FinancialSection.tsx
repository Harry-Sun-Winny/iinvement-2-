"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MetricCard from "./MetricCard";

export interface FinancialMetric {
  label: string;
  value: string;
  sublabel?: string;
  trend?: number | null;
}

interface FinancialSectionProps {
  title: string;
  description: string;
  metrics: FinancialMetric[];
  loading?: boolean;
}

function FinancialSection({ title, description, metrics, loading }: FinancialSectionProps) {
  return (
    <Card className="h-full border-white/10 bg-white/[0.035]">
      <CardHeader>
        <CardTitle className="text-base text-white">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(metric => (
          <MetricCard key={metric.label} {...metric} loading={loading} />
        ))}
      </CardContent>
    </Card>
  );
}

export default memo(FinancialSection);
