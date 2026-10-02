"use client";

import { useEffect, useState } from "react";
import { BookOpenText } from "lucide-react";
import AnalysisControls from "@/components/analysis/AnalysisControls";
import AnalysisOutput from "@/components/analysis/AnalysisOutput";
import Alert from "@/components/ui/Alert";
import PositionsTable from "@/components/analysis/PositionsTable";
import { usePortfolioAnalysis } from "@/hooks/usePortfolioAnalysis";
import { useJournal } from "@/hooks/useJournal";
import { JournalPanel } from "@/components/analysis/journal/JournalPanel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/components/providers/I18nProvider";

export default function AnalysisPage() {
  const { t } = useTranslation();
  const { state, derived, actions } = usePortfolioAnalysis();
  const [activeJournalTab, setActiveJournalTab] = useState<"portfolio" | "stock" | "appraisal">("portfolio");
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);
  const { symbolCounts } = useJournal(state.selectedId);

  // Sync selectedStockSymbol with active symbol selection from setup controls
  useEffect(() => {
    if (state.selectedSymbol) {
      setSelectedStockSymbol(state.selectedSymbol);
    }
  }, [state.selectedSymbol]);

  const handleOpenStockJournal = (symbol: string) => {
    setSelectedStockSymbol(symbol);
    setActiveJournalTab("stock");
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <main className="h-full w-[820px] shrink-0 space-y-6 overflow-y-auto border-r border-white/5 p-6">
        {state.error && (
          <Alert variant="error">
            {state.error}
          </Alert>
        )}

        <div className="antigravity-panel p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">{t("analysis.setupTitle")}</h2>
          <AnalysisControls
            portfolios={state.portfolios}
            selectedId={state.selectedId}
            positions={state.positions}
            mode={state.analysisMode}
            selectedSymbol={state.selectedSymbol}
            question={state.stockQuestion}
            onPortfolioChange={actions.selectPortfolio}
            onModeChange={actions.setMode}
            onSymbolChange={actions.selectSymbol}
            onQuestionChange={actions.setQuestion}
          />
        </div>

        <div className="antigravity-panel p-6">
          <PositionsTable
            positions={state.positions}
            prices={state.prices}
            derived={derived}
            sortKey={state.sortKey}
            sortDir={state.sortDir}
            loading={state.priceLoading}
            onSort={actions.toggleSort}
            onRefresh={actions.refreshPrices}
            symbolCounts={symbolCounts}
            onOpenJournal={handleOpenStockJournal}
          />
        </div>

        <div className="antigravity-panel p-6">
          <div className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">{t("analysis.outputTitle")}</h2>
          </div>
          <AnalysisOutput
            hasPositions={state.positions.length > 0}
            loading={state.analysisLoading}
            priceLoading={state.priceLoading}
            status={state.analysisStatus}
            mode={state.analysisMode}
            symbol={state.selectedSymbol}
            result={state.aiAnalysis}
            onRun={actions.runAnalysis}
            portfolioId={state.selectedId}
          />
        </div>
      </main>

      <div className="flex-1 h-full overflow-y-auto bg-transparent p-6 flex flex-col space-y-4">
        {/* Toggle between Portfolio and Stock Journal */}
        <div className="grid grid-cols-3 bg-slate-950/60 p-1 rounded-xl border border-white/5 select-none shrink-0" role="tablist">
          <button
            role="tab"
            aria-selected={activeJournalTab === "portfolio"}
            onClick={() => setActiveJournalTab("portfolio")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-300 ${
              activeJournalTab === "portfolio"
                ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.08)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border border-transparent"
            }`}
          >
            📂 {t("analysis.portfolioJournal")}
          </button>
          <button
            role="tab"
            aria-selected={activeJournalTab === "appraisal"}
            onClick={() => setActiveJournalTab("appraisal")}
            className={`rounded-lg py-2 text-xs font-bold transition-all duration-300 ${
              activeJournalTab === "appraisal"
                ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.08)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border border-transparent"
            }`}
          >
            Nhật ký thẩm định
          </button>
          <button
            role="tab"
            aria-selected={activeJournalTab === "stock"}
            onClick={() => {
              setActiveJournalTab("stock");
              if (!selectedStockSymbol && state.positions.length > 0) {
                setSelectedStockSymbol(state.positions[0].symbol);
              }
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-300 ${
              activeJournalTab === "stock"
                ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.08)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border border-transparent"
            }`}
          >
            📘 {t("analysis.stockJournal")}
          </button>
        </div>

        <div className="antigravity-panel p-6 flex-1 min-h-0 overflow-y-auto">
          {activeJournalTab === "portfolio" ? (
            <div>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">{t("analysis.portfolioJournal")}</h2>
              <JournalPanel portfolioId={state.selectedId} mode="journal" />
            </div>
          ) : activeJournalTab === "appraisal" ? (
            <div>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">Nhật ký thẩm định</h2>
              <p className="mb-4 text-xs leading-5 text-slate-400">Lưu riêng báo cáo AI đã tạo để đối chiếu luận điểm, dữ liệu và quyết định theo thời gian.</p>
              <JournalPanel portfolioId={state.selectedId} aiResult={state.aiAnalysis} mode="history" />
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                  {t("analysis.stockJournal")} {selectedStockSymbol ? `· ${selectedStockSymbol}` : ""}
                </h2>
                {state.positions.length > 0 && (
                  <select
                    value={selectedStockSymbol ?? ""}
                    onChange={(e) => setSelectedStockSymbol(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-lg text-xs px-2 py-1.5 font-bold text-white focus:outline-none"
                  >
                    {state.positions.map((pos) => (
                      <option key={pos.symbol} value={pos.symbol}>
                        {pos.symbol}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedStockSymbol ? (
                <JournalPanel
                  symbol={selectedStockSymbol}
                  portfolioId={state.selectedId}
                  aiResult={state.aiAnalysis}
                />
              ) : (
                <p className="text-sm text-slate-500 italic mt-4 text-center">
                  {t("analysis.noStockPositions")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
