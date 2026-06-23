"use client";

import AnalysisControls from "@/components/analysis/AnalysisControls";
import AnalysisOutput from "@/components/analysis/AnalysisOutput";
import AnalysisSidebar from "@/components/analysis/AnalysisSidebar";
import PortfolioSummary from "@/components/analysis/PortfolioSummary";
import PositionHighlights from "@/components/analysis/PositionHighlights";
import PositionsTable from "@/components/analysis/PositionsTable";
import { usePortfolioAnalysis } from "@/hooks/usePortfolioAnalysis";

export default function AnalysisPage() {
  const { state, derived, actions } = usePortfolioAnalysis();

  return (
    <div className="app-shell flex">
      <AnalysisSidebar onLogout={actions.logout} />
      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7">
            <p className="text-sm font-medium text-[#54a0ff]">Phân tích thông minh</p>
            <h2 className="mt-2 text-3xl font-black rainbow-text">AI Risk Analysis</h2>
          </header>

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

          {state.error && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{state.error}</div>}

          <PortfolioSummary positions={state.positions} derived={derived} />
          <PositionHighlights winner={derived.winner} loser={derived.loser} count={derived.pricedPositions.length} />
          <PositionsTable
            positions={state.positions}
            prices={state.prices}
            derived={derived}
            sortKey={state.sortKey}
            sortDir={state.sortDir}
            loading={state.priceLoading}
            onSort={actions.toggleSort}
            onRefresh={actions.refreshPrices}
          />
          <AnalysisOutput
            hasPositions={state.positions.length > 0}
            loading={state.analysisLoading}
            priceLoading={state.priceLoading}
            status={state.analysisStatus}
            mode={state.analysisMode}
            symbol={state.selectedSymbol}
            result={state.aiAnalysis}
            onRun={actions.runAnalysis}
          />
        </div>
      </main>
    </div>
  );
}
