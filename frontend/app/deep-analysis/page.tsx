"use client";

import Link from "next/link";
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
import { FourPointZeroProtocol } from "@/components/analysis/FourPointZeroProtocol";
import { DiligenceControlPanel } from "@/components/analysis/DiligenceControlPanel";
import { PsychologyWorkbench } from "@/components/analysis/PsychologyWorkbench";
import { TheoryScenarioLab } from "@/components/analysis/TheoryScenarioLab";
import { DocumentEvidencePanel } from "@/components/analysis/DocumentEvidencePanel";
import { StockNewsSentimentPanel } from "@/components/analysis/StockNewsSentimentPanel";
import { FactorMatrixPanel } from "@/components/analysis/FactorMatrixPanel";
import { InvestmentFrameworkGuide } from "@/components/analysis/InvestmentFrameworkGuide";
import { useMarketTheme } from "@/app/market/hooks/useMarketTheme";
import { MARKET_THEMES } from "@/app/market/themes/marketThemes";
import MarketAppearanceMenu from "@/app/market/components/MarketAppearanceMenu";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  CircleDashed,
  Gauge,
  Landmark,
  Layers3,
  LineChart as LineChartIcon,
  RefreshCw,
  Scale,
  ShieldAlert,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useTranslation } from "@/components/providers/I18nProvider";
import {
  ApiError,
  getPortfolioDeepAnalysis,
  getPortfolios,
  getTransactions,
  triggerPortfolioBackfill,
  type Portfolio,
} from "@/app/lib/api";
import {
  buildAssetDecisionModel,
  type AssetDecisionModel,
  type DecisionBranchId,
  type DecisionEvidenceStatus,
  type DecisionTone,
} from "@/lib/asset-decision-framework";
import { AI_ANALYSIS_MODELS, getAiModelProfile, type AiModelId } from "@/lib/ai-analysis-protocol";
import { ResearchWorkflowRail } from "@/components/research/ResearchWorkflowRail";
import { GovernanceGatePanel, type GovernanceGateStatus } from "@/components/research/GovernanceGatePanel";
import { InvestmentParameterWorkbench } from "@/components/research/InvestmentParameterWorkbench";

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

function formatScore(value: number | null | undefined, digits = 0) {
  if (value == null || !Number.isFinite(value)) return "--";
  return value.toFixed(digits);
}

function formatConfidence(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function errorMessage(error: unknown, isVi?: boolean) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return isVi ? "Không tải được dữ liệu phân tích chuyên sâu." : "Failed to load deep analysis data.";
}

const getToneMeta = (isVi: boolean): Record<DecisionTone, { label: string; className: string; barClassName: string }> => ({
  supportive: {
    label: isVi ? "Ủng hộ" : "Supportive",
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    barClassName: "bg-emerald-300",
  },
  watch: {
    label: isVi ? "Theo dõi" : "Watch",
    className: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    barClassName: "bg-amber-300",
  },
  risk: {
    label: isVi ? "Rủi ro" : "Risk",
    className: "border-rose-400/25 bg-rose-400/10 text-rose-200",
    barClassName: "bg-rose-300",
  },
  manual: {
    label: isVi ? "Cần dữ liệu" : "Needs Data",
    className: "border-slate-400/20 bg-slate-400/10 text-slate-200",
    barClassName: "bg-slate-400",
  },
});

function ToneBadge({ tone, isVi = false }: { tone: DecisionTone, isVi?: boolean }) {
  const meta = getToneMeta(isVi)[tone];
  const Icon =
    tone === "supportive" ? CheckCircle2 : tone === "risk" ? AlertTriangle : tone === "manual" ? CircleDashed : Gauge;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function BranchIcon({ id }: { id: DecisionBranchId }) {
  const Icon =
    id === "macro"
      ? Landmark
      : id === "asset"
        ? Layers3
        : id === "behavior"
          ? Brain
          : id === "personal"
            ? WalletCards
            : id === "market"
              ? LineChartIcon
              : Scale;

  return <Icon className="h-4 w-4" />;
}

function EvidenceBadge({ status, isProxy, isVi }: { status: DecisionEvidenceStatus; isProxy: boolean; isVi: boolean }) {
  const label =
    status === "missing"
      ? isVi ? "Thiếu dữ liệu" : "Missing"
      : status === "verified"
        ? isVi ? "Đã xác minh" : "Verified"
        : isProxy
          ? isVi ? "Proxy" : "Proxy"
          : isVi ? "Ước tính" : "Estimated";
  const className =
    status === "missing"
      ? "border-slate-500/20 bg-slate-500/10 text-slate-300"
      : status === "verified"
        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
        : "border-amber-400/20 bg-amber-400/10 text-amber-100";

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>{label}</span>;
}

function InvestmentDecisionEngine({
  model,
  activeBranchId,
  onSelectBranch,
  isVi,
}: {
  model: AssetDecisionModel;
  activeBranchId: DecisionBranchId;
  onSelectBranch: (value: DecisionBranchId) => void;
  isVi: boolean;
}) {
  const activeBranch = model.branches.find((branch) => branch.id === activeBranchId) ?? model.branches[0];
  const coveragePercent = Math.round(model.coverage.ratio * 100);
  const tMeta = getToneMeta(isVi);

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="antigravity-panel rounded-[28px] border-cyan-400/10 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_36%),rgba(255,255,255,0.015)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-300/80">
                {isVi ? "Động cơ ra quyết định" : "Investment Decision Engine"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">{model.label}</h2>
            </div>
            <ToneBadge tone={model.tone} isVi={isVi} />
          </div>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className="min-w-[140px]">
              <p className="text-6xl font-black leading-none text-white">{formatScore(model.score)}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">/ 100 {isVi ? "điểm" : "pts"}</p>
            </div>
            <div className="flex-1">
              <p className="text-sm leading-6 text-slate-300">{model.summary}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${tMeta[model.tone].barClassName}`} style={{ width: `${model.displayScore}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{isVi ? `Độ phủ ${coveragePercent}%` : `Coverage ${coveragePercent}%`}</span>
                <span>{isVi ? `Độ tin cậy ${formatConfidence(model.confidence)}` : `Confidence ${formatConfidence(model.confidence)}`}</span>
                <span>{isVi ? `${model.coverage.verifiedFactorCount} xác minh · ${model.coverage.estimatedFactorCount} proxy` : `${model.coverage.verifiedFactorCount} verified · ${model.coverage.estimatedFactorCount} proxy`}</span>
              </div>
            </div>
          </div>
        </article>

        <article className="antigravity-panel rounded-[28px] border-white/5 bg-white/[0.01] p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-white">{isVi ? "Tín hiệu kéo điểm" : "Top Drivers"}</h3>
              <div className="mt-4 space-y-3">
                {model.topDrivers.length > 0 ? (
                  model.topDrivers.map((factor) => (
                    <div key={factor.id} className="rounded-2xl border border-white/5 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{factor.title}</p>
                        <ToneBadge tone={factor.tone} isVi={isVi} />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-400">{factor.evidence}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-white/5 bg-slate-950/70 p-4 text-sm leading-6 text-slate-400">
                    {isVi ? "Chưa có tín hiệu tự động đủ mạnh. Hãy dùng danh sách nhánh bên dưới để kiểm tra thủ công." : "No strong automated signals yet. Use the branch list below to verify manually."}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-white">{isVi ? "Việc nên làm tiếp" : "Next Actions"}</h3>
              <div className="mt-4 space-y-3">
                {model.nextActions.map((action) => (
                  <div key={action} className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.06] p-4 text-sm leading-6 text-cyan-50">
                    {action}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {model.sections.map((section) => (
          <article key={section.id} className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{section.label}</p>
                <p className="mt-3 text-3xl font-black text-white">{formatScore(section.score)}</p>
              </div>
              <ToneBadge tone={section.tone} isVi={isVi} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">{section.summary}</p>
          </article>
        ))}
      </div>

      {model.riskGates.length > 0 && (
        <article className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.05] p-5">
          <div className="flex items-center gap-2 text-rose-100">
            <ShieldAlert className="h-4 w-4" />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em]">{isVi ? "Cổng rủi ro trước giải ngân" : "Pre-trade risk gates"}</h3>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {model.riskGates.map((gate) => (
              <div key={gate.id} className="rounded-xl border border-white/5 bg-slate-950/55 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{gate.title}</p>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${gate.severity === "hard-stop" ? "border-rose-400/25 bg-rose-400/10 text-rose-200" : "border-amber-400/25 bg-amber-400/10 text-amber-200"}`}>
                    {gate.severity === "hard-stop" ? "Hard stop" : isVi ? "Cảnh báo" : "Warning"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{gate.detail}</p>
              </div>
            ))}
          </div>
        </article>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {model.branches.map((branch) => (
          <button
            key={branch.id}
            type="button"
            aria-pressed={activeBranch.id === branch.id}
            onClick={() => onSelectBranch(branch.id)}
            className={`antigravity-panel rounded-2xl border p-4 text-left transition hover:border-cyan-300/30 ${
              activeBranch.id === branch.id ? "border-cyan-300/35 bg-cyan-300/[0.07]" : "border-white/5 bg-white/[0.01]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-white">
                <span className="rounded-xl border border-white/10 bg-slate-950/70 p-2 text-cyan-200">
                  <BranchIcon id={branch.id} />
                </span>
                <div>
                  <p className="text-sm font-bold">{branch.shortLabel}</p>
                  <p className="mt-1 text-xs text-slate-500">{isVi ? "Trọng số" : "Weight"} {branch.weight}%</p>
                </div>
              </div>
              <ToneBadge tone={branch.tone} isVi={isVi} />
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full rounded-full ${tMeta[branch.tone].barClassName}`} style={{ width: `${branch.displayScore}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              {formatScore(branch.score)}/100 · {isVi ? "tin cậy" : "confidence"} {formatConfidence(branch.confidence)} · {isVi ? "nối" : "connected"} {branch.connectedCount}/{branch.factors.length}
            </p>
          </button>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
          <div className="flex items-center gap-2 text-white">
            <BranchIcon id={activeBranch.id} />
            <h3 className="text-sm font-bold uppercase tracking-[0.24em]">{activeBranch.shortLabel}</h3>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">{activeBranch.role}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {activeBranch.groups.map((group) => (
              <span key={group} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs text-slate-300">
                {group}
              </span>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-white/5 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{isVi ? "Vai trò trong mô hình" : "Role in model"}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {isVi ? `Nhánh này chiếm ${activeBranch.weight}% điểm tổng hợp. Các yếu tố chưa nối dữ liệu vẫn được giữ làm checklist bắt buộc trước khi xem kết quả như một quyết định đầu tư hoàn chỉnh.` : `This branch accounts for ${activeBranch.weight}% of the overall score. Unconnected factors act as a mandatory checklist before making a final investment decision.`}
            </p>
          </div>
        </article>

        <div className="space-y-3">
          {activeBranch.factors.map((factor) => (
            <article key={factor.id} className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{factor.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{factor.evidence}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <EvidenceBadge status={factor.status} isProxy={factor.isProxy} isVi={isVi} />
                  <span className="rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1 text-xs font-semibold text-white">
                    {formatScore(factor.score)}
                  </span>
                  <ToneBadge tone={factor.tone} isVi={isVi} />
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{isVi ? "Ngưỡng" : "Threshold"}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{factor.threshold}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{isVi ? "Nguồn" : "Source"}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{factor.source}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{isVi ? "Hành động" : "Action"}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{factor.action}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                {isVi ? "Độ tin cậy" : "Confidence"}: {formatConfidence(factor.confidence)}{factor.asOf ? ` · As of ${factor.asOf}` : ""}
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function PortfolioPicker({
  portfolios,
  selectedId,
  onChange,
  isVi,
}: {
  portfolios: Portfolio[];
  selectedId: string;
  onChange: (value: string) => void;
  isVi: boolean;
}) {
  return (
    <div className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-4">
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
        {isVi ? "Danh mục" : "Portfolio"}
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
  const { t, language } = useTranslation();
  const isVi = language === "vi";
  const { themeId, theme, customPanelBg, styleVariables, setTheme, setCustomPanelBg, resetTheme } = useMarketTheme();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<DecisionBranchId>("asset");
  const [showRiskChart, setShowRiskChart] = useState(false);

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

  const portfolioTransactionsQuery = useQuery({
    queryKey: ["deep-analysis", "transactions", selectedId],
    queryFn: () => getTransactions(selectedId),
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
      setStatusMessage(isVi ? "Lệnh đồng bộ đã được gửi. Trang sẽ tự làm mới khi danh mục này có snapshot mới." : "Sync command sent. Page will refresh automatically when new snapshot is ready.");
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
  const portfolioSymbols = useMemo(
    () => [...new Set((portfolioTransactionsQuery.data ?? []).map((transaction) => transaction.assetSymbol).filter(Boolean))].slice(0, 8),
    [portfolioTransactionsQuery.data],
  );
  const decisionModel = useMemo(() => (analysis ? buildAssetDecisionModel(analysis) : null), [analysis]);
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
      label: isVi ? "Giá trị hiện tại" : "Current Value",
      value: formatCurrency(analysis.overview?.latestValue),
      note: isVi ? "Giá trị snapshot mới nhất của danh mục." : "Latest snapshot value of the portfolio.",
    },
    {
      label: isVi ? "Lãi lỗ ròng" : "Net P/L",
      value: formatCurrency(analysis.overview?.netGain),
      note: isVi ? "Chênh lệch giữa giá trị và vốn đã bỏ vào." : "Difference between value and capital invested.",
    },
    {
      label: "Sharpe",
      value: formatRatio(analysis.riskMetrics?.sharpeRatio),
      note: isVi ? "Tỷ lệ lợi nhuận/rủi ro tổng thể." : "Overall risk/return ratio.",
    },
    {
      label: "Sortino",
      value: formatRatio(analysis.riskMetrics?.sortinoRatio),
      note: isVi ? "Tập trung vào rủi ro giảm giá." : "Focuses on downside risk.",
    },
    {
      label: "Max drawdown",
      value: formatPercent((analysis.riskMetrics?.maxDrawdown ?? 0) * 100),
      note: isVi ? "Mức sụt sâu nhất từ đỉnh gần nhất." : "Deepest drop from the most recent peak.",
    },
    {
      label: "VaR 95%",
      value: formatPercent((analysis.riskMetrics?.valueAtRisk ?? 0) * 100),
      note: isVi ? "Mức lỗ 1 ngày theo phân vị 95%." : "1-day loss level at 95% percentile.",
    },
  ] : [];

  const evidenceCoverage = Math.round((decisionModel?.coverage.ratio ?? 0) * 100);
  const hasPointInTimeSnapshot = Boolean(analysis?.overview?.latestSnapshotDate);
  const hasLineageNotes = Boolean(analysis?.methodologyNotes?.length);
  const hasDecisionCoverage = evidenceCoverage >= 60;
  const hasRiskReview = decisionModel ? decisionModel.riskGates.length === 0 : false;
  const analysisGateStatus: GovernanceGateStatus = !analysis
    ? "blocked"
    : hasPointInTimeSnapshot && hasLineageNotes && hasDecisionCoverage && hasRiskReview
      ? "ready"
      : "conditional";
  const analysisGateLabel = analysisGateStatus === "ready"
    ? (isVi ? "SẴN SÀNG THẨM ĐỊNH" : "READY FOR REVIEW")
    : analysisGateStatus === "conditional"
      ? (isVi ? "PHÂN TÍCH CÓ ĐIỀU KIỆN" : "CONDITIONAL ANALYSIS")
      : "NO-DECISION";

  return (
    <div style={styleVariables} className="space-y-6 p-6 h-full overflow-y-auto">
      <ResearchWorkflowRail
        stage="analysis"
        isVi={isVi}
        states={{ analysis: analysis ? (analysisGateStatus === "ready" ? "complete" : "active") : "blocked", review: "pending", policy: "pending" }}
      />

      <section className="antigravity-panel rounded-[28px] border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_35%),linear-gradient(135deg,rgba(22,19,29,0.98),rgba(12,11,18,0.98))] p-6 shadow-[0_24px_90px_rgba(8,15,30,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-300/80">{t("deepAnalysis.subtitle")}</p>
            <h1 className="mt-2 text-3xl font-black text-white">{t("deepAnalysis.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              {t("deepAnalysis.description")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/deep-analysis/review"
                className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
              >
                {t("sidebar.review")}
              </Link>
              <span className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs leading-5 text-slate-400">
                {t("deepAnalysis.reviewTip")}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <MarketAppearanceMenu
              themes={MARKET_THEMES}
              selectedThemeId={themeId}
              onThemeChange={setTheme}
              customPanelBg={customPanelBg}
              onCustomPanelBgChange={setCustomPanelBg}
              onReset={resetTheme}
            />
            <PortfolioPicker portfolios={portfoliosQuery.data ?? []} selectedId={selectedId} onChange={setSelectedId} isVi={isVi} />
            <button
              type="button"
              onClick={() => backfillMutation.mutate()}
              disabled={!selectedId || backfillMutation.isPending}
              className="antigravity-btn inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-cyan-400/20 bg-cyan-400/10 px-5 text-sm font-semibold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${backfillMutation.isPending ? "animate-spin" : ""}`} />
              {t("deepAnalysis.syncSnapshot")}
            </button>
          </div>
        </div>
        {selectedPortfolio && (
          <p className="mt-4 text-xs text-slate-400">
            {t("deepAnalysis.viewingPortfolio")} <span className="font-semibold text-white">{selectedPortfolio.name}</span>.
          </p>
        )}
      </section>

      <GovernanceGatePanel
        eyebrow={isVi ? "Cổng G1 · Evidence → Measurement → Signal" : "Gate G1 · Evidence → Measurement → Signal"}
        title={isVi ? "Tình trạng gói phân tích" : "Analysis package status"}
        description={isVi ? "Trang này chỉ xác nhận chất lượng đầu vào và phân tích. Nó không tự tạo lệnh; hồ sơ vẫn phải qua phản chứng, policy và ràng buộc danh mục." : "This page qualifies inputs and analysis only. It does not create an order; the dossier must still pass falsification, policy and portfolio constraints."}
        status={analysisGateStatus}
        statusLabel={analysisGateLabel}
        isVi={isVi}
        metrics={[
          { label: isVi ? "Vintage dữ liệu" : "Data vintage", value: analysis?.overview?.latestSnapshotDate ?? "--", detail: isVi ? "Snapshot point-in-time" : "Point-in-time snapshot" },
          { label: isVi ? "Độ phủ evidence" : "Evidence coverage", value: `${evidenceCoverage}%`, detail: isVi ? "Không phải xác suất đúng" : "Not probability of being right" },
          { label: "Confidence", value: decisionModel ? formatConfidence(decisionModel.confidence) : "--", detail: isVi ? "Tách khỏi điểm đầu tư" : "Separated from investment score" },
          { label: isVi ? "Policy hiện tại" : "Current policy", value: analysisGateLabel, detail: isVi ? "Chưa phải lệnh giao dịch" : "Not a trade order" },
        ]}
        checks={[
          { label: isVi ? "Có snapshot point-in-time" : "Point-in-time snapshot exists", done: hasPointInTimeSnapshot, critical: true },
          { label: isVi ? "Có lineage/phương pháp nguồn" : "Source lineage and methodology", done: hasLineageNotes, critical: true },
          { label: isVi ? "Đạt minimum evidence coverage" : "Minimum evidence coverage met", done: hasDecisionCoverage, critical: true },
          { label: isVi ? "Không còn risk gate chưa xử lý" : "No unresolved risk gate", done: hasRiskReview },
        ]}
      />

      {(portfoliosQuery.isLoading || deepAnalysisQuery.isLoading || isSwitchingPortfolio) && (
        <div className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5 text-sm text-slate-300">
          {isSwitchingPortfolio ? t("deepAnalysis.switchingPortfolio") : t("deepAnalysis.loadingAnalysis")}
        </div>
      )}

      {(portfoliosQuery.error || deepAnalysisQuery.error || backfillMutation.error) && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMessage(portfoliosQuery.error ?? deepAnalysisQuery.error ?? backfillMutation.error, isVi)}
        </div>
      )}

      {statusMessage && !(portfoliosQuery.error || deepAnalysisQuery.error || backfillMutation.error) && (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
          {statusMessage}
        </div>
      )}

      {selectedPortfolio && !isSwitchingPortfolio && (
        <div className="space-y-6">
          <InvestmentFrameworkGuide />
          <FactorMatrixPanel />
          <InvestmentParameterWorkbench
            symbol={portfolioSymbols[0] ?? selectedPortfolio.name}
            context="analysis"
          />
          <FourPointZeroProtocol isVi={isVi} />

          <PsychologyWorkbench isVi={isVi} />

          <TheoryScenarioLab isVi={isVi} />

          <DocumentEvidencePanel storageKey={`deep-analysis-evidence-${selectedId}`} isVi={isVi} />

          <StockNewsSentimentPanel symbols={portfolioSymbols} isVi={isVi} />

          <DiligenceControlPanel
            isVi={isVi}
            connectedFactors={decisionModel?.coverage.connectedFactorCount ?? 0}
            totalFactors={decisionModel?.coverage.totalFactorCount ?? 48}
            readiness={{
              assetIdentified: Boolean(selectedPortfolio),
              valuation: Boolean(analysis?.overview?.latestValue),
              thesis: Boolean(analysis),
              bearCase: analysis?.riskMetrics?.maxDrawdown != null,
              invalidation: Boolean(decisionModel?.riskGates?.length),
              sizing: Boolean(analysis?.overview?.latestValue),
              sourceLedger: Boolean(analysis?.methodologyNotes?.length),
            }}
          />
        </div>
      )}

      {analysis && !isSwitchingPortfolio && (
        <>

          {decisionModel && (
            <InvestmentDecisionEngine
              key={`decision-${selectedId}`}
              model={decisionModel}
              activeBranchId={activeBranchId}
              onSelectBranch={setActiveBranchId}
              isVi={isVi}
            />
          )}

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
                <h2 className="text-sm font-bold uppercase tracking-[0.24em]">{isVi ? "Giá trị và Drawdown" : "Value & Drawdown"}</h2>
              </div>
              <p className="mb-5 text-sm leading-6 text-slate-400">
                {isVi ? "Đường xanh là giá trị danh mục, đường vàng là đỉnh chạy, vùng đỏ là drawdown." : "Blue line is portfolio value, yellow line is running peak, red area is drawdown."}
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
                    <Area yAxisId="left" type="monotone" dataKey="value" name={t("deepAnalysis.metrics.latestValue")} stroke="#22d3ee" fill="url(#deepValue)" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="peak" name={t("deepAnalysis.peak")} stroke="#fbbf24" strokeWidth={1.5} dot={false} />
                    <Area yAxisId="right" type="monotone" dataKey="drawdown" name="Drawdown %" stroke="#fb7185" fill="url(#deepDrawdown)" strokeWidth={1.5} />
                  </AreaChart>
                </AutoSizedChart>
              </div>
            </article>

            <article className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
              <div className="mb-4 flex items-center gap-2 text-white">
                <ShieldAlert className="h-4 w-4 text-amber-300" />
                <h2 className="text-sm font-bold uppercase tracking-[0.24em]">{t("deepAnalysis.quickExplanation")}</h2>
              </div>
              <div className="space-y-4 text-sm leading-6 text-slate-300">
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-4">
                  <p className="font-semibold text-white">{t("deepAnalysis.dataRange")}</p>
                  <p className="mt-2">
                    {t("deepAnalysis.snapshotsFromTo", {
                      start: analysis.overview?.firstSnapshotDate ?? "--",
                      end: analysis.overview?.latestSnapshotDate ?? "--"
                    })}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-4">
                  <p className="font-semibold text-white">{t("deepAnalysis.whyResults")}</p>
                  <p className="mt-2">
                    {t("deepAnalysis.whyExplanation")}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-4">
                  <p className="font-semibold text-white">{t("deepAnalysis.uncertaintyNote")}</p>
                  <p className="mt-2">
                    {t("deepAnalysis.uncertaintyExplanation")}
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section key={`rolling-${selectedId}`} className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <div className="xl:col-span-2 flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.015] px-4 py-3">
              <p className="text-sm text-slate-400">{isVi ? "Mặc định chỉ giữ biểu đồ giá trị/drawdown vì đây là tín hiệu quyết định. Mở biểu đồ rolling khi cần xác minh chất lượng rủi ro theo thời gian." : "The decision view keeps value/drawdown by default. Open rolling risk only when validating risk quality over time."}</p>
              <button type="button" onClick={() => setShowRiskChart((value) => !value)} className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]">{showRiskChart ? (isVi ? "Ẩn biểu đồ" : "Hide chart") : (isVi ? "Mở biểu đồ" : "Show chart")}</button>
            </div>
            {showRiskChart &&
            <article className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
              <div className="mb-4 flex items-center gap-2 text-white">
                <Activity className="h-4 w-4 text-emerald-300" />
                <h2 className="text-sm font-bold uppercase tracking-[0.24em]">{t("deepAnalysis.rollingRisk")}</h2>
              </div>
              <p className="mb-5 text-sm leading-6 text-slate-400">
                {t("deepAnalysis.rollingExplanation")}
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
            }

            <article className={`antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5 ${showRiskChart ? "" : "xl:col-span-2"}`}>
              <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-white">{t("deepAnalysis.sourceMethodology")}</h2>
              <div className="mt-4 space-y-3">
                {(analysis.methodologyNotes ?? []).map((note) => (
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
