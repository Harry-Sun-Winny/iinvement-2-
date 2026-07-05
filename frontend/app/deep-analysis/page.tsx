"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AutoSizedChart from "@/components/charts/AutoSizedChart";
import { Activity, RefreshCw, ShieldAlert, TrendingUp } from "lucide-react";
import {
  ApiError,
  getPortfolioDeepAnalysis,
  getPortfolios,
  triggerPortfolioBackfill,
  type Portfolio,
} from "@/app/lib/api";

function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${value.toFixed(digits)}%`;
}

function formatRatio(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Khong tai duoc du lieu phan tich chuyen sau.";
}

function PortfolioPicker({
  portfolios,
  selectedId,
  onChange,
}: {
  portfolios: Portfolio[];
  selectedId: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-4">
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
        Danh muc
      </label>
      <select
        value={selectedId}
        onChange={(event) => onChange(event.target.value)}
        className="antigravity-input w-full rounded-xl border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none"
      >
        {portfolios.map((portfolio) => (
          <option key={portfolio.id} value={portfolio.id}>
            {portfolio.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function DeepAnalysisPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const portfoliosQuery = useQuery({
    queryKey: ["deep-analysis", "portfolios"],
    queryFn: getPortfolios,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const portfolios = portfoliosQuery.data ?? [];
    if (portfolios.length > 0 && !portfolios.some((portfolio) => portfolio.id === selectedId)) {
      setSelectedId(portfolios[0].id);
    }
  }, [portfoliosQuery.data, selectedId]);

  const deepAnalysisQuery = useQuery({
    queryKey: ["deep-analysis", selectedId],
    queryFn: () => getPortfolioDeepAnalysis(selectedId),
    enabled: Boolean(selectedId),
    staleTime: 60_000,
  });

  useEffect(() => {
    setStatusMessage(null);
  }, [selectedId]);

  useEffect(() => {
    const portfolios = portfoliosQuery.data ?? [];
    const currentError = deepAnalysisQuery.error;

    if (
      currentError instanceof ApiError &&
      currentError.status === 404 &&
      portfolios.length > 0 &&
      !portfolios.some((portfolio) => portfolio.id === selectedId)
    ) {
      setSelectedId(portfolios[0].id);
    }
  }, [deepAnalysisQuery.error, portfoliosQuery.data, selectedId]);

  const backfillMutation = useMutation({
    mutationFn: () => triggerPortfolioBackfill(selectedId),
    onSuccess: async () => {
      setStatusMessage("Lenh dong bo da duoc gui. Trang se tu lam moi khi danh muc nay co snapshot moi.");
      await queryClient.invalidateQueries({ queryKey: ["deep-analysis", selectedId] });
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["deep-analysis", selectedId] });
      }, 2500);
    },
  });

  const selectedPortfolio = useMemo(
    () => (portfoliosQuery.data ?? []).find((portfolio) => portfolio.id === selectedId) ?? null,
    [portfoliosQuery.data, selectedId],
  );
  const isSwitchingPortfolio =
    Boolean(selectedId) &&
    deepAnalysisQuery.fetchStatus === "fetching" &&
    deepAnalysisQuery.data != null &&
    deepAnalysisQuery.dataUpdatedAt === 0;

  const analysis = deepAnalysisQuery.data;
  const drawdownChartData = useMemo(
    () => (analysis?.drawdownSeries ?? []).map((point) => ({
      date: point.date,
      value: Number(point.portfolioValue ?? 0),
      peak: Number(point.runningPeak ?? 0),
      drawdown: Number(((point.drawdown ?? 0) * 100).toFixed(2)),
    })),
    [analysis],
  );
  const rollingChartData = useMemo(
    () => (analysis?.rollingMetrics ?? []).map((point) => ({
      date: point.date,
      sharpe: Number(point.sharpeRatio?.toFixed?.(2) ?? point.sharpeRatio ?? 0),
      sortino: Number(point.sortinoRatio?.toFixed?.(2) ?? point.sortinoRatio ?? 0),
      var95: Number(((point.valueAtRisk95 ?? 0) * 100).toFixed(2)),
      cvar95: Number(((point.conditionalValueAtRisk95 ?? 0) * 100).toFixed(2)),
    })),
    [analysis],
  );

  const metricCards = analysis ? [
    {
      label: "Gia tri hien tai",
      value: formatCurrency(analysis.overview.latestValue),
      note: "Gia tri snapshot moi nhat cua danh muc.",
    },
    {
      label: "Lai lo rong",
      value: formatCurrency(analysis.overview.netGain),
      note: "Chenh lech giua gia tri va von da bo vao.",
    },
    {
      label: "Sharpe",
      value: formatRatio(analysis.riskMetrics.sharpeRatio),
      note: "Ty le loi nhuan/rui ro tong the.",
    },
    {
      label: "Sortino",
      value: formatRatio(analysis.riskMetrics.sortinoRatio),
      note: "Tap trung vao rui ro giam gia.",
    },
    {
      label: "Max drawdown",
      value: formatPercent(analysis.riskMetrics.maxDrawdown * 100),
      note: "Muc sut sau nhat tu dinh gan nhat.",
    },
    {
      label: "VaR 95%",
      value: formatPercent(analysis.riskMetrics.valueAtRisk * 100),
      note: "Muc lo 1 ngay theo phan vi 95%.",
    },
  ] : [];

  return (
    <div className="space-y-6 p-6">
      <section className="antigravity-panel rounded-[28px] border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_35%),linear-gradient(135deg,rgba(22,19,29,0.98),rgba(12,11,18,0.98))] p-6 shadow-[0_24px_90px_rgba(8,15,30,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-300/80">Portfolio Intelligence</p>
            <h1 className="mt-2 text-3xl font-black text-white">Phân tích chuyên sâu</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Trang này gom toàn bộ dữ liệu snapshot, rủi ro và vùng suy giảm vào một luồng duy nhất để đọc nhanh hơn.
              Kết quả dùng dữ liệu nội bộ, có nêu cách tính và mức độ bất định để tránh hiểu sai như lời khuyên đầu tư.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <PortfolioPicker portfolios={portfoliosQuery.data ?? []} selectedId={selectedId} onChange={setSelectedId} />
            <button
              type="button"
              onClick={() => backfillMutation.mutate()}
              disabled={!selectedId || backfillMutation.isPending}
              className="antigravity-btn inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-cyan-400/20 bg-cyan-400/10 px-5 text-sm font-semibold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${backfillMutation.isPending ? "animate-spin" : ""}`} />
              Dong bo snapshot
            </button>
          </div>
        </div>
        {selectedPortfolio && (
          <p className="mt-4 text-xs text-slate-400">
            Dang xem du lieu cua danh muc <span className="font-semibold text-white">{selectedPortfolio.name}</span>.
          </p>
        )}
      </section>

      {(portfoliosQuery.isLoading || deepAnalysisQuery.isLoading || isSwitchingPortfolio) && (
        <div className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5 text-sm text-slate-300">
          {isSwitchingPortfolio ? "Dang doi danh muc va tai lai du lieu moi..." : "Dang tai bo phan tich chuyen sau..."}
        </div>
      )}

      {(portfoliosQuery.error || deepAnalysisQuery.error || backfillMutation.error) && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMessage(portfoliosQuery.error ?? deepAnalysisQuery.error ?? backfillMutation.error)}
        </div>
      )}

      {statusMessage && !(portfoliosQuery.error || deepAnalysisQuery.error || backfillMutation.error) && (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
          {statusMessage}
        </div>
      )}

      {analysis && !isSwitchingPortfolio && (
        <>
          <section key={`metrics-${selectedId}`} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metricCards.map((card) => (
              <article key={card.label} className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{card.label}</p>
                <p className="mt-3 text-2xl font-black text-white">{card.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{card.note}</p>
              </article>
            ))}
          </section>

          <section key={`drawdown-${selectedId}`} className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <article className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
              <div className="mb-4 flex items-center gap-2 text-white">
                <TrendingUp className="h-4 w-4 text-cyan-300" />
                <h2 className="text-sm font-bold uppercase tracking-[0.24em]">Gia tri va drawdown</h2>
              </div>
              <p className="mb-5 text-sm leading-6 text-slate-400">
                Duong xanh cho gia tri danh muc, duong vang la dinh chay, vung do la drawdown.
              </p>
              <div className="h-[340px]">
                <AutoSizedChart>
                  <AreaChart data={drawdownChartData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="deepValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="deepDrawdown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.26} />
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" tickLine={false} fontSize={11} />
                    <YAxis yAxisId="left" stroke="#64748b" tickLine={false} fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" tickLine={false} fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="value" name="Gia tri" stroke="#22d3ee" fill="url(#deepValue)" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="peak" name="Dinh chay" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
                    <Area yAxisId="right" type="monotone" dataKey="drawdown" name="Drawdown %" stroke="#fb7185" fill="url(#deepDrawdown)" strokeWidth={1.5} />
                  </AreaChart>
                </AutoSizedChart>
              </div>
            </article>

            <article className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
              <div className="mb-4 flex items-center gap-2 text-white">
                <ShieldAlert className="h-4 w-4 text-amber-300" />
                <h2 className="text-sm font-bold uppercase tracking-[0.24em]">Giai thich nhanh</h2>
              </div>
              <div className="space-y-4 text-sm leading-6 text-slate-300">
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-4">
                  <p className="font-semibold text-white">Khoang du lieu</p>
                  <p className="mt-2">
                    {analysis.overview.snapshotCount} snapshot tu {analysis.overview.firstSnapshotDate ?? "--"} den {analysis.overview.latestSnapshotDate ?? "--"}.
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-4">
                  <p className="font-semibold text-white">Ly do ket qua nay</p>
                  <p className="mt-2">
                    Sharpe va Sortino duoc tinh tu chuoi return ngay cua snapshot lich su, drawdown do tu dinh chay gan nhat.
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-4">
                  <p className="font-semibold text-white">Luu y bat dinh</p>
                  <p className="mt-2">
                    Neu snapshot con ngan hoac chua dong bo du, chi so co the dao dong manh hon binh thuong va khong nen xem la khuyen nghi tai chinh.
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section key={`rolling-${selectedId}`} className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <article className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
              <div className="mb-4 flex items-center gap-2 text-white">
                <Activity className="h-4 w-4 text-emerald-300" />
                <h2 className="text-sm font-bold uppercase tracking-[0.24em]">Rolling risk</h2>
              </div>
              <p className="mb-5 text-sm leading-6 text-slate-400">
                Chuoi 30 ngay giup nhin xu huong rui ro thay doi theo thoi gian thay vi chi mot diem tong ket.
              </p>
              <div className="h-[320px]">
                <AutoSizedChart>
                  <LineChart data={rollingChartData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" tickLine={false} fontSize={11} />
                    <YAxis stroke="#64748b" tickLine={false} fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sharpe" name="Sharpe" stroke="#38bdf8" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sortino" name="Sortino" stroke="#34d399" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="var95" name="VaR 95% (pct)" stroke="#fb7185" strokeWidth={1.6} dot={false} />
                    <Line type="monotone" dataKey="cvar95" name="CVaR 95% (pct)" stroke="#f59e0b" strokeWidth={1.6} dot={false} />
                  </LineChart>
                </AutoSizedChart>
              </div>
            </article>

            <article className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-white">Nguon va cach tinh</h2>
              <div className="mt-4 space-y-3">
                {analysis.methodologyNotes.map((note) => (
                  <div key={note} className="rounded-xl border border-white/5 bg-slate-950/80 p-4 text-sm leading-6 text-slate-300">
                    {note}
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
