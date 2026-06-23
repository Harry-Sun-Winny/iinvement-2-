"use client";

import { memo } from "react";
import { Bot, Zap } from "lucide-react";
import type { AnalysisMode } from "@/types/analysis";

interface Props {
  hasPositions: boolean;
  loading: boolean;
  priceLoading: boolean;
  status: string;
  mode: AnalysisMode;
  symbol: string;
  result: string;
  onRun: () => void;
}

function AnalysisOutput(props: Props) {
  return <>
    {props.hasPositions && <button onClick={props.onRun} disabled={props.loading || props.priceLoading || (props.mode === "stock" && !props.symbol)} className="rainbow-btn mb-7 w-full disabled:opacity-50"><span className="inline-flex items-center gap-2"><Zap className="h-4 w-4" />{props.loading ? props.status || "AI đang phân tích..." : props.mode === "stock" ? `Phân tích ${props.symbol || "cổ phiếu"}` : "Phân tích rủi ro danh mục"}</span></button>}
    {props.result && <div className="app-panel p-6"><div className="mb-4 flex items-center gap-2"><Bot className="h-5 w-5 text-[#54a0ff]" /><h3 className="font-black rainbow-text">Kết quả phân tích AI</h3></div><div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{props.result}</div></div>}
  </>;
}

export default memo(AnalysisOutput);
