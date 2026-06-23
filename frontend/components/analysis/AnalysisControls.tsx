"use client";

import { memo } from "react";
import type { Portfolio } from "@/app/lib/api";
import type { AnalysisMode, PositionSummary } from "@/types/analysis";

interface Props {
  portfolios: Portfolio[];
  selectedId: string;
  positions: PositionSummary[];
  mode: AnalysisMode;
  selectedSymbol: string;
  question: string;
  onPortfolioChange: (id: string) => void;
  onModeChange: (mode: AnalysisMode) => void;
  onSymbolChange: (symbol: string) => void;
  onQuestionChange: (question: string) => void;
}

function AnalysisControls(props: Props) {
  return (
    <div className="app-panel mb-7 p-5">
      <label className="mb-2 block text-xs font-bold text-[#54a0ff]">Chọn portfolio</label>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-950/60 p-1" role="tablist" aria-label="Analysis mode">
        {(["stock", "portfolio"] as AnalysisMode[]).map(mode => (
          <button key={mode} type="button" role="tab" aria-selected={props.mode === mode} onClick={() => props.onModeChange(mode)} className={`rounded-md px-3 py-2 text-sm font-bold transition-colors ${props.mode === mode ? "bg-[#54a0ff] text-slate-950" : "text-slate-400 hover:bg-white/5"}`}>
            {mode === "stock" ? "Single Stock" : "Portfolio Risk"}
          </button>
        ))}
      </div>
      <select value={props.selectedId} onChange={event => props.onPortfolioChange(event.target.value)} className="app-input w-full rounded-lg px-4 py-3 text-sm font-semibold">
        {props.portfolios.map(portfolio => <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>)}
      </select>
      {props.mode === "stock" && props.positions.length > 0 && (
        <div className="mt-4 grid gap-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-[#54a0ff]">Chọn cổ phiếu</label>
            <select value={props.selectedSymbol} onChange={event => props.onSymbolChange(event.target.value)} className="app-input w-full rounded-lg px-4 py-3 text-sm font-semibold">
              {props.positions.map(position => <option key={position.symbol} value={position.symbol}>{position.symbol} · {position.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-[#54a0ff]">Yêu cầu dành cho AI Analyst</label>
            <textarea value={props.question} onChange={event => props.onQuestionChange(event.target.value)} rows={3} maxLength={600} className="app-input w-full resize-y rounded-lg px-4 py-3 text-sm leading-relaxed" placeholder="Ví dụ: Phân tích catalyst và rủi ro của NVDA..." />
            <p className="mt-1 text-right text-xs text-slate-500">{props.question.length}/600</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(AnalysisControls);
