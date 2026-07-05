"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AutoSizedChart from "@/components/charts/AutoSizedChart";
import { CheckCircle, GitMerge, RefreshCw, TrendingUp } from "lucide-react";
import ChartTooltip from "@/components/charts/ChartTooltip";

interface RiskMetrics {
  totalReturn?: number;
  annualizedReturn?: number;
  volatility?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  valueAtRisk?: number;
}

interface Snapshot {
  snapshotDate: string;
  totalValue?: number;
  totalCost?: number;
  portfolioValue?: number;
  investedAmount?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
}

interface DeepAnalysisResponse {
  riskMetrics?: RiskMetrics;
  equityCurve?: Array<{
    date: string;
    portfolioValue?: number;
    investedAmount?: number;
  }>;
}

function getAuthHeaders() {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readResponseMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data?.message || data?.error || fallback;
  } catch {
    return fallback;
  }
}

function formatMetric(value?: number, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function formatPercentMetric(value?: number, digits = 1) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : "--";
}

export function PortfolioOverviewPanel({ portfolioId }: { portfolioId: string }) {
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillSuccess, setBackfillSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (portfolioId) {
      void loadData();
    }
  }, [portfolioId]);

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/backend/api/v1/portfolios/${portfolioId}/deep-analysis`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      if (response.ok) {
        const payload: DeepAnalysisResponse = await response.json();
        setMetrics(payload.riskMetrics ?? null);
        setSnapshots((payload.equityCurve ?? []).map((point) => ({
          snapshotDate: point.date,
          portfolioValue: point.portfolioValue,
          totalValue: point.portfolioValue,
          investedAmount: point.investedAmount,
          totalCost: point.investedAmount,
        })));
      } else {
        setMessage("Khong tai duoc du lieu phan tich tu backend.");
      }
    } catch (error) {
      console.error("Failed to load portfolio analytics data", error);
      setMessage("Khong ket noi duoc du lieu snapshot.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillSuccess(false);
    setMessage("");
    try {
      const res = await fetch(`/api/backend/api/v1/portfolios/${portfolioId}/backfill`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        setBackfillSuccess(true);
        setTimeout(() => {
          setBackfillSuccess(false);
          void loadData();
        }, 1500);
      } else if (res.status === 409) {
        setMessage(await readResponseMessage(res, "Backfill dang chay o nen. Vui long doi mot chut."));
        setTimeout(() => {
          void loadData();
        }, 2000);
      } else {
        setMessage(await readResponseMessage(res, `Dong bo Snapshot khong thanh cong (${res.status}).`));
      }
    } catch (error) {
      console.error("Backfill failed", error);
      setMessage("Khong goi duoc lenh dong bo Snapshot.");
    } finally {
      setBackfilling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-12 font-medium text-slate-500">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Dang tai phan tich danh muc...
      </div>
    );
  }

  const chartData = snapshots.map((snapshot) => ({
    date: snapshot.snapshotDate,
    value: snapshot.totalValue ?? snapshot.portfolioValue ?? 0,
    cost: snapshot.totalCost ?? snapshot.investedAmount ?? 0,
  }));

  const metricCards = [
    {
      label: "Sharpe Ratio",
      val: formatMetric(metrics?.sharpeRatio),
      desc: "Hieu suat / rui ro tong the",
      color: typeof metrics?.sharpeRatio === "number" && metrics.sharpeRatio >= 1 ? "text-emerald-400" : "text-slate-300",
    },
    {
      label: "Sortino Ratio",
      val: formatMetric(metrics?.sortinoRatio),
      desc: "Hieu suat / rui ro giam gia",
      color: typeof metrics?.sortinoRatio === "number" && metrics.sortinoRatio >= 1 ? "text-emerald-400" : "text-slate-300",
    },
    {
      label: "Max Drawdown",
      val: formatPercentMetric(metrics?.maxDrawdown),
      desc: "Muc sut giam sau nhat",
      color: "text-red-400",
    },
    {
      label: "Value at Risk (95%)",
      val: formatPercentMetric(metrics?.valueAtRisk),
      desc: "Muc lo toi da trong 1 ngay",
      color: "text-yellow-400",
    },
    {
      label: "Total Return",
      val: formatPercentMetric(metrics?.totalReturn),
      desc: "Loi nhuan tong tu dau ky",
      color: typeof metrics?.totalReturn === "number" && metrics.totalReturn >= 0 ? "text-emerald-400" : "text-red-400",
    },
    {
      label: "Annualized Return",
      val: formatPercentMetric(metrics?.annualizedReturn),
      desc: "Loi nhuan quy doi theo nam",
      color: typeof metrics?.annualizedReturn === "number" && metrics.annualizedReturn >= 0 ? "text-emerald-400" : "text-red-400",
    },
    {
      label: "Volatility",
      val: formatPercentMetric(metrics?.volatility),
      desc: "Do bien dong hang nam",
      color: "text-sky-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
            <TrendingUp size={16} className="text-purple-400" /> PHAN TICH HIEU SUAT & RUI RO
          </h3>
          <p className="mt-0.5 text-[10px] text-slate-500">Chi so dinh luong va bien dong danh muc EOD</p>
        </div>
        <button
          onClick={handleBackfill}
          disabled={backfilling}
          className="antigravity-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all"
        >
          {backfillSuccess ? (
            <>
              <CheckCircle className="h-3 w-3 text-green-400" /> Thanh cong
            </>
          ) : backfilling ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" /> Dang dong bo...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3" /> Dong bo Snapshot
            </>
          )}
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          {message}
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metricCards.map((metric) => (
            <div
              key={metric.label}
              className="antigravity-panel rounded-xl border border-white/5 bg-white/[0.01] p-3 transition-all hover:bg-white/[0.02]"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
              <p className={`mt-1 text-xl font-black ${metric.color}`}>{metric.val}</p>
              <p className="mt-1 text-[9px] leading-none text-slate-400">{metric.desc}</p>
            </div>
          ))}
        </div>
      )}

      <Card className="antigravity-panel overflow-hidden border-white/5 bg-white/[0.01]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <GitMerge size={14} className="text-blue-400" /> Duong cong tang truong von (EOD)
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-500">
            So sanh gia tri danh muc (Value) va tong von dau tu (Cost)
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] pt-4">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs font-medium text-slate-500">
              Chua co du lieu snapshot lich su. Nhan "Dong bo Snapshot" de tao du lieu.
            </div>
          ) : (
            <AutoSizedChart>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                <Tooltip content={<ChartTooltip valueFormatter={(v) => `$${Number(v).toLocaleString()}`} />} />
                <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="value" name="Gia tri" stroke="#8884d8" fillOpacity={1} fill="url(#valGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="cost" name="Gia von" stroke="#82ca9d" fillOpacity={1} fill="url(#costGrad)" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </AutoSizedChart>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
