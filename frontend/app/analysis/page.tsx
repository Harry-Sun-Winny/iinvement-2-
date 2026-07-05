"use client";

import { useState } from "react";
import { BookOpenText } from "lucide-react";
import AnalysisControls from "@/components/analysis/AnalysisControls";
import AnalysisOutput from "@/components/analysis/AnalysisOutput";
import Alert from "@/components/ui/Alert";
import PositionsTable from "@/components/analysis/PositionsTable";
import { usePortfolioAnalysis } from "@/hooks/usePortfolioAnalysis";
import { useJournal } from "@/hooks/useJournal";
import { JournalPanel } from "@/components/analysis/journal/JournalPanel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AnalysisPage() {
  const { state, derived, actions } = usePortfolioAnalysis();
  const [journalSymbol, setJournalSymbol] = useState<string | null>(null);
  const [portfolioJournalOpen, setPortfolioJournalOpen] = useState(false);
  const { symbolCounts } = useJournal(state.selectedId);

  return (
    <>
      <div className="flex h-full flex-1 overflow-hidden">
        <main className="h-full w-[800px] shrink-0 space-y-6 overflow-y-auto border-r border-white/5 p-6">
          {state.error && (
            <Alert variant="error">
              {state.error}
            </Alert>
          )}

          <div className="antigravity-panel p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">Risk Analyzer Setup</h2>
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
              onOpenJournal={(symbol) => setJournalSymbol(symbol)}
            />
          </div>

          <div className="antigravity-panel p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">AI Analysis Output</h2>
              <button
                onClick={() => setPortfolioJournalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/20"
              >
                <BookOpenText className="h-3.5 w-3.5" />
                Nhật ký danh mục
              </button>
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
        <div className="h-full flex-1 overflow-y-auto bg-transparent p-6" />
      </div>

      <Dialog open={journalSymbol !== null} onOpenChange={(open) => !open && setJournalSymbol(null)}>
        <DialogContent className="overflow-hidden border-white/10 bg-[#0b1020] p-0 text-white sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>Nhật ký giao dịch</DialogTitle>
            <DialogDescription>Ghi chú và nhật ký cho mã cổ phiếu</DialogDescription>
          </DialogHeader>
          {journalSymbol && (
            <JournalPanel
              symbol={journalSymbol}
              portfolioId={state.selectedId}
              aiResult={state.aiAnalysis}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={portfolioJournalOpen} onOpenChange={setPortfolioJournalOpen}>
        <DialogContent className="overflow-hidden border-white/10 bg-[#0b1020] p-0 text-white sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>Nhật ký toàn bộ danh mục</DialogTitle>
            <DialogDescription>Lưu và xem lại các lần phân tích AI cho toàn bộ danh mục</DialogDescription>
          </DialogHeader>
          <JournalPanel portfolioId={state.selectedId} aiResult={state.aiAnalysis} />
        </DialogContent>
      </Dialog>
    </>
  );
}
