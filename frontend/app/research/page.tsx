"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CircleAlert,
  FileSearch,
  FileText,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/components/providers/I18nProvider";
import {
  createResearchRun,
  getPortfolios,
  getResearchScore,
  getTransactions,
  type Portfolio,
  type ResearchResult,
  type Transaction,
} from "@/app/lib/api";

type AssetOption = {
  symbol: string;
  name: string;
  quantity: number;
};

type ResearchTab = "overview" | "parameters" | "sources" | "activity";

function buildAssetOptions(transactions: Transaction[]): AssetOption[] {
  const assets = new Map<string, AssetOption>();

  for (const transaction of transactions) {
    const symbol = transaction.assetSymbol?.trim().toUpperCase();
    if (!symbol) continue;

    const current = assets.get(symbol) ?? {
      symbol,
      name: transaction.assetName?.trim() || symbol,
      quantity: 0,
    };
    const quantity = Number(transaction.quantity) || 0;
    if (transaction.type === "BUY") current.quantity += quantity;
    if (transaction.type === "SELL") current.quantity -= quantity;
    assets.set(symbol, current);
  }

  const allAssets = [...assets.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  const heldAssets = allAssets.filter((asset) => asset.quantity > 0);
  return heldAssets.length > 0 ? heldAssets : allAssets;
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--";
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

function formatScore(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "--" : Math.round(value).toString();
}

function formatDate(value: string | null | undefined, isVi: boolean) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(isVi ? "vi-VN" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusTone(status: string | undefined) {
  if (status === "PASS") return "border-emerald-300/25 bg-emerald-300/10 text-emerald-200";
  if (status === "PASS_WITH_WARNINGS") return "border-amber-300/25 bg-amber-300/10 text-amber-200";
  return "border-rose-300/25 bg-rose-300/10 text-rose-200";
}

function evidenceTone(status: string) {
  if (status === "VERIFIED") return "text-emerald-300";
  if (status === "CONFLICTED" || status === "MISSING") return "text-rose-300";
  return "text-amber-200";
}

export default function ResearchPage() {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [activeTab, setActiveTab] = useState<ResearchTab>("overview");
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPortfolios() {
      setPortfolioLoading(true);
      setError(null);
      try {
        const data = await getPortfolios();
        if (!active) return;
        setPortfolios(data);
        setSelectedPortfolioId((current) => data.some((portfolio) => portfolio.id === current) ? current : data[0]?.id ?? "");
      } catch {
        if (active) setError(isVi ? "Không thể tải danh mục. Vui lòng thử lại." : "Unable to load portfolios. Please try again.");
      } finally {
        if (active) setPortfolioLoading(false);
      }
    }

    void loadPortfolios();
    return () => { active = false; };
  }, [isVi]);

  useEffect(() => {
    if (!selectedPortfolioId) {
      setTransactions([]);
      return;
    }

    let active = true;

    async function loadActivity() {
      setActivityLoading(true);
      setError(null);
      try {
        const data = await getTransactions(selectedPortfolioId);
        if (active) setTransactions(data);
      } catch {
        if (active) setError(isVi ? "Không thể tải giao dịch của danh mục này." : "Unable to load transactions for this portfolio.");
      } finally {
        if (active) setActivityLoading(false);
      }
    }

    void loadActivity();
    return () => { active = false; };
  }, [isVi, selectedPortfolioId]);

  const assetOptions = useMemo(() => buildAssetOptions(transactions), [transactions]);
  const selectedPortfolio = useMemo(
    () => portfolios.find((portfolio) => portfolio.id === selectedPortfolioId) ?? null,
    [portfolios, selectedPortfolioId],
  );
  const selectedAsset = useMemo(
    () => assetOptions.find((asset) => asset.symbol === selectedSymbol) ?? null,
    [assetOptions, selectedSymbol],
  );

  useEffect(() => {
    setSelectedSymbol((current) => assetOptions.some((asset) => asset.symbol === current) ? current : assetOptions[0]?.symbol ?? "");
  }, [assetOptions]);

  const loadResearch = useCallback(async (symbol: string) => {
    if (!symbol) {
      setResearch(null);
      return;
    }

    setResearchLoading(true);
    setError(null);
    try {
      setResearch(await getResearchScore(symbol));
    } catch {
      setResearch(null);
      setError(isVi ? "Chưa tải được kết quả nghiên cứu cho mã này." : "Research results for this asset could not be loaded.");
    } finally {
      setResearchLoading(false);
    }
  }, [isVi]);

  useEffect(() => {
    void loadResearch(selectedSymbol);
  }, [loadResearch, selectedSymbol]);

  async function refreshResearch() {
    if (!selectedSymbol) return;
    setRefreshing(true);
    setError(null);
    try {
      const run = await createResearchRun(selectedSymbol);
      setResearch(run.response);
    } catch {
      setError(isVi ? "Không thể cập nhật bản nghiên cứu. Vui lòng thử lại." : "Research refresh could not be completed. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }

  const citedParameters = research?.parameterResults.filter((item) => item.citation?.sourceName) ?? [];
  const verifiedParameters = research?.parameterResults.filter((item) => item.evidenceStatus === "VERIFIED").length ?? 0;
  const unresolvedParameters = research?.parameterResults.filter((item) => item.evidenceStatus === "MISSING" || item.evidenceStatus === "CONFLICTED").length ?? 0;
  const tabs: Array<{ id: ResearchTab; label: string }> = [
    { id: "overview", label: isVi ? "Tổng quan" : "Overview" },
    { id: "parameters", label: isVi ? "Tham số" : "Parameters" },
    { id: "sources", label: isVi ? "Nguồn trích dẫn" : "Sources" },
    { id: "activity", label: isVi ? "Giao dịch danh mục" : "Portfolio activity" },
  ];

  return (
    <main className="h-full w-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-[1540px] space-y-5 pb-8">
        <section className="antigravity-panel rounded-[28px] border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%),linear-gradient(135deg,rgba(22,19,29,0.98),rgba(12,11,18,0.98))] p-6 shadow-[0_24px_90px_rgba(8,15,30,0.35)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <FileSearch className="h-4 w-4" />
                <span>{isVi ? "Nghiên cứu theo danh mục" : "Portfolio-scoped research"}</span>
              </div>
              <h1 className="mt-2 text-3xl font-black text-white">
                {selectedAsset ? `${selectedAsset.symbol} - ${selectedAsset.name}` : isVi ? "Research workspace" : "Research workspace"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {selectedPortfolio
                  ? (isVi
                    ? `Kết quả bên dưới chỉ áp dụng cho danh mục ${selectedPortfolio.name} và tài sản bạn đang theo dõi trong danh mục đó.`
                    : `Results below are scoped to ${selectedPortfolio.name} and the assets held or tracked in that portfolio.`)
                  : (isVi ? "Chọn một danh mục để mở hồ sơ nghiên cứu đúng dữ liệu của bạn." : "Choose a portfolio to open research using your own data.")}
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[520px]">
              <label className="block text-xs font-semibold text-slate-300">
                {isVi ? "Danh mục" : "Portfolio"}
                <select
                  value={selectedPortfolioId}
                  onChange={(event) => setSelectedPortfolioId(event.target.value)}
                  disabled={portfolioLoading || portfolios.length === 0}
                  className="antigravity-input mt-2 w-full rounded-xl border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {portfolios.length === 0 && <option value="">{isVi ? "Chưa có danh mục" : "No portfolios"}</option>}
                  {portfolios.map((portfolio) => <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                {isVi ? "Tài sản trong danh mục" : "Portfolio asset"}
                <select
                  value={selectedSymbol}
                  onChange={(event) => setSelectedSymbol(event.target.value)}
                  disabled={activityLoading || assetOptions.length === 0}
                  className="antigravity-input mt-2 w-full rounded-xl border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {assetOptions.length === 0 && <option value="">{isVi ? "Chưa có tài sản" : "No assets yet"}</option>}
                  {assetOptions.map((asset) => <option key={asset.symbol} value={asset.symbol}>{asset.symbol} - {asset.name}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
            <p className="text-xs leading-5 text-slate-400">
              {isVi
                ? "Điểm và phân loại là kết quả phân tích có nguồn, không phải khuyến nghị mua bán hay cam kết lợi nhuận."
                : "Scores and classifications are sourced analysis, not investment advice or a guarantee of returns."}
            </p>
            <button
              type="button"
              onClick={() => void refreshResearch()}
              disabled={!selectedSymbol || refreshing}
              className="antigravity-btn inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isVi ? "Cập nhật bản nghiên cứu" : "Refresh research"}
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {portfolioLoading || activityLoading || researchLoading ? (
          <section className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
              {isVi ? "Đang đồng bộ dữ liệu danh mục và nghiên cứu..." : "Syncing portfolio and research data..."}
            </div>
          </section>
        ) : !selectedPortfolio ? (
          <section className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-8 text-center">
            <BookOpenCheck className="mx-auto h-8 w-8 text-cyan-300" />
            <h2 className="mt-3 text-lg font-bold text-white">{isVi ? "Chưa có danh mục để nghiên cứu" : "No portfolio available for research"}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
              {isVi ? "Tạo danh mục và thêm giao dịch trước. Research workspace sẽ tự lấy tài sản từ dữ liệu đó." : "Create a portfolio and add transactions first. This workspace will use those assets automatically."}
            </p>
          </section>
        ) : assetOptions.length === 0 ? (
          <section className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-cyan-300" />
            <h2 className="mt-3 text-lg font-bold text-white">{isVi ? "Danh mục chưa có tài sản" : "This portfolio has no assets yet"}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
              {isVi ? "Thêm giao dịch vào danh mục này để tạo phạm vi nghiên cứu chính xác." : "Add a transaction to this portfolio to create an accurate research scope."}
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
                <p className="text-xs font-semibold text-slate-400">{isVi ? "Điểm tổng hợp" : "Composite score"}</p>
                <p className="mt-2 text-3xl font-black text-cyan-200">{formatScore(research?.stockScore.overallScore)}</p>
                <p className="mt-1 text-xs text-slate-500">{research?.stockScore.finalClassification ?? (isVi ? "Chưa đủ dữ liệu" : "Insufficient evidence")}</p>
              </article>
              <article className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
                <p className="text-xs font-semibold text-slate-400">{isVi ? "Độ phủ bằng chứng" : "Evidence coverage"}</p>
                <p className="mt-2 text-3xl font-black text-white">{formatPercent(research?.coverage)}</p>
                <p className="mt-1 text-xs text-slate-500">{isVi ? "Trọng số có thể chấm điểm" : "Scorable parameter weight"}</p>
              </article>
              <article className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
                <p className="text-xs font-semibold text-slate-400">{isVi ? "Độ tin cậy" : "Confidence"}</p>
                <p className="mt-2 text-3xl font-black text-white">{formatPercent(research?.confidence)}</p>
                <p className="mt-1 text-xs text-slate-500">{isVi ? "Tách biệt với điểm đầu tư" : "Separate from investment score"}</p>
              </article>
              <article className="antigravity-panel rounded-2xl border-white/5 bg-white/[0.01] p-5">
                <p className="text-xs font-semibold text-slate-400">{isVi ? "Nguồn đã gắn" : "Cited sources"}</p>
                <p className="mt-2 text-3xl font-black text-white">{citedParameters.length}</p>
                <p className="mt-1 text-xs text-slate-500">{isVi ? "Tham số có lineage nguồn" : "Parameters with source lineage"}</p>
              </article>
            </section>

            <section className="antigravity-panel overflow-hidden rounded-2xl border-white/5 bg-white/[0.01]">
              <nav className="flex gap-1 overflow-x-auto border-b border-white/[0.07] px-3" aria-label={isVi ? "Nội dung nghiên cứu" : "Research content"}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === tab.id ? "border-cyan-300 text-cyan-200" : "border-transparent text-slate-500 hover:text-slate-200"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="p-5">
                {activeTab === "overview" && (
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
                    <div>
                      <div className="flex items-center gap-2 text-white">
                        <Sparkles className="h-4 w-4 text-cyan-300" />
                        <h2 className="font-bold">{isVi ? "Trạng thái nghiên cứu" : "Research status"}</h2>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {isVi
                          ? "Kết quả được hiển thị theo mã đang thuộc danh mục đã chọn. Các điểm thiếu hoặc mâu thuẫn được giữ rõ ràng, không được bù bằng điểm cao ở phần khác."
                          : "Results are shown for the asset in the selected portfolio. Missing or conflicting evidence remains explicit and is not offset by other scores."}
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/[0.07] bg-slate-950/45 p-4">
                          <p className="text-xs text-slate-500">{isVi ? "Đã xác minh" : "Verified"}</p>
                          <p className="mt-2 text-2xl font-black text-emerald-200">{verifiedParameters}</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.07] bg-slate-950/45 p-4">
                          <p className="text-xs text-slate-500">{isVi ? "Cần làm rõ" : "Needs resolution"}</p>
                          <p className="mt-2 text-2xl font-black text-rose-200">{unresolvedParameters}</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.07] bg-slate-950/45 p-4">
                          <p className="text-xs text-slate-500">{isVi ? "Cập nhật dữ liệu" : "Data snapshot"}</p>
                          <p className="mt-2 text-sm font-bold text-white">{formatDate(research?.asOf, isVi)}</p>
                        </div>
                      </div>
                    </div>
                    <aside className="rounded-2xl border border-white/[0.07] bg-slate-950/55 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-white">{isVi ? "Cổng quản trị" : "Governance gate"}</p>
                        <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${statusTone(research?.status)}`}>{research?.status ?? "NO DATA"}</span>
                      </div>
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between gap-4"><span className="text-slate-500">{isVi ? "Phương pháp" : "Methodology"}</span><span className="text-right text-slate-200">{research?.methodologyVersion ?? "--"}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-slate-500">{isVi ? "Phiên bản dữ liệu" : "Data version"}</span><span className="text-right text-slate-200">{research?.dataVersion ?? "--"}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-slate-500">{isVi ? "Ràng buộc danh mục" : "Portfolio scope"}</span><span className="text-right text-slate-200">{selectedPortfolio.name}</span></div>
                      </div>
                    </aside>
                    {research?.warnings?.length ? (
                      <div className="xl:col-span-2 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-amber-100"><AlertTriangle className="h-4 w-4" />{isVi ? "Điểm cần lưu ý" : "Important limitations"}</div>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-50/80">
                          {research.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}

                {activeTab === "parameters" && (
                  <div>
                    <div className="flex items-center gap-2 text-white"><BarChart3 className="h-4 w-4 text-cyan-300" /><h2 className="font-bold">{isVi ? "Tham số có dữ liệu cho mã đã chọn" : "Available parameters for the selected asset"}</h2></div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{isVi ? "Chỉ hiển thị tham số được hệ thống trả về, kèm trạng thái bằng chứng và nguồn nếu có." : "Only parameters returned by the system are shown, together with evidence status and source when available."}</p>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {(research?.parameterResults ?? []).map((parameter) => (
                        <article key={parameter.parameterCode} className="rounded-2xl border border-white/[0.07] bg-slate-950/45 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div><p className="font-mono text-xs text-cyan-200">{parameter.parameterCode}</p><p className="mt-1 text-xs text-slate-500">{parameter.moduleId}</p></div>
                            <span className={`text-xs font-bold ${evidenceTone(parameter.evidenceStatus)}`}>{parameter.evidenceStatus}</span>
                          </div>
                          <p className="mt-4 text-2xl font-black text-white">{formatScore(parameter.normalizedScore)}</p>
                          <p className="mt-1 text-xs text-slate-500">{isVi ? "Chất lượng dữ liệu" : "Data quality"}: {formatPercent(parameter.dataQuality)}</p>
                          {parameter.citation?.sourceName && <p className="mt-3 truncate text-xs text-slate-300">{parameter.citation.sourceName}</p>}
                        </article>
                      ))}
                    </div>
                    {!research?.parameterResults.length && <p className="mt-5 text-sm text-slate-400">{isVi ? "Chưa có tham số nào được trả về cho tài sản này." : "No parameters have been returned for this asset yet."}</p>}
                  </div>
                )}

                {activeTab === "sources" && (
                  <div>
                    <div className="flex items-center gap-2 text-white"><ShieldCheck className="h-4 w-4 text-cyan-300" /><h2 className="font-bold">{isVi ? "Nguồn và lineage" : "Sources and lineage"}</h2></div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{isVi ? "Mỗi nguồn dưới đây gắn với tham số cụ thể. Khi không có nguồn, hệ thống giữ trạng thái thiếu dữ liệu thay vì suy đoán." : "Each source below is tied to a specific parameter. When no source is available, the system keeps the evidence gap explicit instead of guessing."}</p>
                    <div className="mt-5 space-y-3">
                      {citedParameters.map((parameter) => (
                        <article key={`${parameter.parameterCode}-${parameter.citation?.sourceName}`} className="rounded-2xl border border-white/[0.07] bg-slate-950/45 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0"><p className="font-mono text-xs text-cyan-200">{parameter.parameterCode}</p><p className="mt-1 truncate text-sm font-semibold text-white">{parameter.citation?.sourceName}</p><p className="mt-1 text-xs text-slate-500">{isVi ? "Quan sát" : "Observed"}: {formatDate(parameter.citation?.observedAt, isVi)}</p></div>
                            {parameter.citation?.sourceUrl ? <a href={parameter.citation.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/15">{isVi ? "Mở nguồn" : "Open source"}</a> : <span className="text-xs text-slate-500">{isVi ? "Không có liên kết" : "No link available"}</span>}
                          </div>
                        </article>
                      ))}
                      {citedParameters.length === 0 && <p className="rounded-2xl border border-white/[0.07] bg-slate-950/45 p-5 text-sm text-slate-400">{isVi ? "Chưa có nguồn được gắn cho tài sản này." : "No sources are attached to this asset yet."}</p>}
                    </div>
                  </div>
                )}

                {activeTab === "activity" && (
                  <div>
                    <div className="flex items-center gap-2 text-white"><BookOpenCheck className="h-4 w-4 text-cyan-300" /><h2 className="font-bold">{isVi ? "Giao dịch dùng để xác định phạm vi" : "Transactions used to determine scope"}</h2></div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{isVi ? "Đây là dữ liệu giao dịch trong danh mục đã chọn, không phải dữ liệu mẫu hoặc danh mục mặc định." : "These are transactions from the selected portfolio, not sample data or a default portfolio."}</p>
                    <div className="mt-5 overflow-x-auto rounded-2xl border border-white/[0.07]">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-950/70 text-xs text-slate-500"><tr><th className="px-4 py-3 font-semibold">{isVi ? "Ngày" : "Date"}</th><th className="px-4 py-3 font-semibold">{isVi ? "Tài sản" : "Asset"}</th><th className="px-4 py-3 font-semibold">{isVi ? "Loại" : "Type"}</th><th className="px-4 py-3 text-right font-semibold">{isVi ? "Số lượng" : "Quantity"}</th></tr></thead>
                        <tbody className="divide-y divide-white/[0.06]">
                          {[...transactions].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)).slice(0, 12).map((transaction) => <tr key={transaction.id} className="text-slate-300"><td className="px-4 py-3 text-slate-500">{formatDate(transaction.transactionDate, isVi)}</td><td className="px-4 py-3"><span className="font-semibold text-white">{transaction.assetSymbol}</span><span className="ml-2 text-xs text-slate-500">{transaction.assetName}</span></td><td className="px-4 py-3">{transaction.type}</td><td className="px-4 py-3 text-right font-mono">{Number(transaction.quantity).toLocaleString(isVi ? "vi-VN" : "en-US")}</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
