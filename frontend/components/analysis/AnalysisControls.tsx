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
    <div className="app-panel relative overflow-hidden rounded-[24px] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      {/* Subtle top indicator line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      
      <div className="space-y-5">
        {/* Selection mode tab control */}
        <div>
          <label className="mb-2.5 block text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
            Chế độ phân tích
          </label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950/60 p-1 border border-white/5" role="tablist" aria-label="Analysis mode">
            {(["stock", "portfolio"] as AnalysisMode[]).map(mode => {
              const isActive = props.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => props.onModeChange(mode)}
                  className={`rounded-lg py-2.5 text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.08)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border border-transparent"
                  }`}
                >
                  {mode === "stock" ? "Single Stock" : "Portfolio Risk"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Portfolio Select */}
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
            Chọn danh mục
          </label>
          <div className="relative">
            <select
              value={props.selectedId}
              onChange={event => props.onPortfolioChange(event.target.value)}
              className="app-input w-full appearance-none rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 hover:border-slate-400 focus:outline-none"
            >
              {props.portfolios.map(portfolio => (
                <option key={portfolio.id} value={portfolio.id} className="bg-[#0b0c16] text-slate-300">
                  {portfolio.name}
                </option>
              ))}
            </select>
            {/* Custom dropdown arrow */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Conditional stock selection & prompt inputs */}
        {props.mode === "stock" && props.positions.length > 0 && (
          <div className="space-y-5 pt-1">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                Chọn cổ phiếu phân tích
              </label>
              <div className="relative">
                <select
                  value={props.selectedSymbol}
                  onChange={event => props.onSymbolChange(event.target.value)}
                  className="app-input w-full appearance-none rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 hover:border-slate-400 focus:outline-none"
                >
                  {props.positions.map(position => (
                    <option key={position.symbol} value={position.symbol} className="bg-[#0b0c16] text-slate-300">
                      {position.symbol} · {position.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                  Yêu cầu dành cho AI Analyst
                </label>
                <span className="text-[10px] font-semibold text-slate-600">
                  {props.question.length}/600
                </span>
              </div>
              <textarea
                value={props.question}
                onChange={event => props.onQuestionChange(event.target.value)}
                rows={3}
                maxLength={600}
                className="app-input w-full resize-none rounded-xl px-4 py-3 text-sm leading-relaxed transition-all duration-300 hover:border-slate-400 focus:outline-none"
                placeholder="Ví dụ: Phân tích catalyst và rủi ro chính của mã này..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(AnalysisControls);
