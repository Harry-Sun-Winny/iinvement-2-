"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getMarketDetails } from "@/app/lib/api";
import { useTranslation } from "@/components/providers/I18nProvider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Building2, Radar, Target, Wallet } from "lucide-react";
import { MarketQuote } from "../types";
import { formatAsOf, formatCompactNumber, formatMoney, formatPercent, getDisplayChange, getDisplayChangePercent } from "../utils";

interface SelectedAssetPanelProps {
  asset?: MarketQuote | null;
  activeRange: string;
}

interface DetailState {
  beta?: number | null;
  pe?: number | null;
  forwardPe?: number | null;
  pb?: number | null;
  roe?: number | null;
  dividendYield?: number | null;
  recommendation?: string | null;
  targetPrice?: number | null;
  historicalPrices?: Array<{ date: string; close: number | null }>;
  sector?: string;
  country?: string;
  marketCap?: number | null;
}

function formatMultiple(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}x`;
}

function buildLinePath(points: number[]) {
  if (points.length < 2) return "";
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 80 - ((point - min) / range) * 62;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function SelectedAssetPanel({ asset, activeRange }: SelectedAssetPanelProps) {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const [details, setDetails] = useState<DetailState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const symbol = asset?.symbol;

    if (!symbol) {
      setDetails(null);
      return;
    }

    let cancelled = false;

    async function loadDetails() {
      setLoading(true);
      try {
        const data = await getMarketDetails(symbol!);
        if (!cancelled) {
          setDetails(data);
        }
      } catch {
        if (!cancelled) {
          setDetails(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [asset?.symbol]);

  const chartPoints = useMemo(
    () => (details?.historicalPrices ?? [])
      .map((point) => (typeof point.close === "number" ? point.close : null))
      .filter((value): value is number => value != null)
      .slice(-36),
    [details?.historicalPrices],
  );

  const linePath = useMemo(() => buildLinePath(chartPoints), [chartPoints]);
  const displayChange = asset ? getDisplayChange(asset, activeRange) : null;
  const displayChangePct = asset ? getDisplayChangePercent(asset, activeRange) : null;
  const isPositive = (displayChangePct ?? 0) >= 0;

  if (!asset) {
    return (
      <Card className="border-[var(--market-border)] bg-[var(--market-bg)]">
        <CardContent className="px-5 py-10 text-center text-sm text-[var(--market-text-muted)]">
          {isVi ? "Chọn một tài sản để xem context, định giá và lịch sử." : "Pick an asset to inspect context, valuation, and history."}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[var(--market-border)] bg-[var(--market-bg)]">
      <CardHeader className="space-y-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--market-text-secondary)]">
              {isVi ? "Selected Asset" : "Selected Asset"}
            </CardTitle>
            <p className="mt-2 text-2xl font-semibold text-[var(--market-text-primary)]">{asset.symbol}</p>
            <p className="text-sm text-[var(--market-text-muted)]">{asset.name}</p>
          </div>
          <Badge className={isPositive ? "border-[var(--market-positive)]/20 bg-[var(--market-positive)]/10 text-[var(--market-positive)]" : "border-[var(--market-negative)]/20 bg-[var(--market-negative)]/10 text-[var(--market-negative)]"}>
            {formatPercent(displayChangePct)}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--market-border)] bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--market-text-muted)]">{isVi ? "Giá hiện tại" : "Current price"}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--market-text-primary)]">{formatMoney(asset.price, asset.currency || "USD")}</p>
            <p className={`mt-2 text-sm font-medium ${isPositive ? "text-[var(--market-positive)]" : "text-[var(--market-negative)]"}`}>
              {displayChange != null && Number.isFinite(displayChange) ? `${displayChange >= 0 ? "+" : ""}${displayChange.toFixed(2)}` : "—"} · {formatPercent(displayChangePct)}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--market-border)] bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--market-text-muted)]">{isVi ? "Dữ liệu" : "Data health"}</p>
            <p className="mt-2 text-sm font-semibold text-[var(--market-text-primary)]">
              {asset.dataQuality?.status || "—"} {asset.dataQuality?.primarySource ? `· ${asset.dataQuality.primarySource}` : ""}
            </p>
            <p className="mt-2 text-sm text-[var(--market-text-muted)]">
              {isVi ? "Cập nhật:" : "Updated:"} {formatAsOf(asset.asOf)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        <div className="rounded-2xl border border-[var(--market-border)] bg-[var(--market-surface-elevated)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--market-text-muted)]">
                {isVi ? "Bối cảnh giá 6 tháng" : "6-month price context"}
              </p>
              <p className="text-sm text-[var(--market-text-secondary)]">
                {loading
                  ? (isVi ? "Đang tải bối cảnh..." : "Loading context...")
                  : (details?.sector || details?.country
                    ? [details?.sector, details?.country].filter(Boolean).join(" · ")
                    : (isVi ? "Dùng dữ liệu lịch sử gần nhất khả dụng." : "Using the latest available historical data."))}
              </p>
            </div>
            <AreaChart className="h-4 w-4 text-[var(--market-text-muted)]" />
          </div>

          {linePath ? (
            <svg viewBox="0 0 100 84" className="h-36 w-full">
              <path d={linePath} fill="none" stroke={isPositive ? "var(--market-positive)" : "var(--market-negative)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <div className="grid h-36 place-items-center rounded-2xl border border-dashed border-[var(--market-border)] text-sm text-[var(--market-text-muted)]">
              {isVi ? "Chưa có lịch sử giá để hiển thị." : "No price history to display yet."}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricTile icon={Wallet} label={isVi ? "Vốn hóa" : "Market cap"} value={formatMoney(details?.marketCap, asset.currency || "USD")} />
          <MetricTile icon={Target} label={isVi ? "Giá mục tiêu" : "Target price"} value={formatMoney(details?.targetPrice, asset.currency || "USD")} />
          <MetricTile icon={Building2} label="P/E" value={formatMultiple(details?.pe)} />
          <MetricTile icon={Radar} label={isVi ? "ROE" : "ROE"} value={formatPercent(details?.roe != null ? details.roe * 100 : null)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--market-border)] bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--market-text-muted)]">{isVi ? "Valuation mix" : "Valuation mix"}</p>
            <div className="mt-3 space-y-2 text-sm text-[var(--market-text-secondary)]">
              <div className="flex items-center justify-between">
                <span>Forward P/E</span>
                <span>{formatMultiple(details?.forwardPe)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>P/B</span>
                <span>{formatMultiple(details?.pb)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{isVi ? "Dividend yield" : "Dividend yield"}</span>
                <span>{formatPercent(details?.dividendYield != null ? details.dividendYield * 100 : null)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--market-border)] bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--market-text-muted)]">{isVi ? "Analyst read" : "Analyst read"}</p>
            <div className="mt-3 space-y-2 text-sm text-[var(--market-text-secondary)]">
              <div className="flex items-center justify-between">
                <span>{isVi ? "Khuyến nghị" : "Recommendation"}</span>
                <span>{details?.recommendation || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Beta</span>
                <span>{details?.beta != null ? details.beta.toFixed(2) : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{isVi ? "Lịch sử điểm giá" : "History points"}</span>
                <span>{formatCompactNumber(chartPoints.length, 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--market-border)] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-[var(--market-text-muted)]">
        <Icon className="h-4 w-4" />
        <p className="text-xs uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-3 text-lg font-semibold text-[var(--market-text-primary)]">{value}</p>
    </div>
  );
}
