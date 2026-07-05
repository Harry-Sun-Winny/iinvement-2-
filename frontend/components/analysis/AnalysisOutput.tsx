"use client";

import { memo } from "react";
import { Bot, Zap, Save } from "lucide-react";
import type { AnalysisMode } from "@/types/analysis";
import { useRef } from "react";
import { useJournal } from "@/hooks/useJournal";

interface Props {
  hasPositions: boolean;
  loading: boolean;
  priceLoading: boolean;
  status: string;
  mode: AnalysisMode;
  symbol: string;
  result: string;
  onRun: () => void;
  portfolioId: string;
}

function AnalysisOutput(props: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { saveAIAnalysis } = useJournal(props.portfolioId, props.symbol);

  const handleSaveToJournal = () => {
    saveAIAnalysis(props.result, contentRef);
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(3)}</h2>;
      if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-white mt-6 mb-3">{line.slice(2)}</h1>;
      if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 mb-1">{line.slice(2)}</li>;
      if (line.trim() === '') return <br key={i} />;
      
      // Simple bold replacement
      const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
      return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: boldText }} />;
    });
  };

  return <div ref={contentRef}>
    {props.hasPositions && <button onClick={props.onRun} disabled={props.loading || props.priceLoading || (props.mode === "stock" && !props.symbol)} className="rainbow-btn mb-7 w-full disabled:opacity-50"><span className="inline-flex items-center gap-2"><Zap className="h-4 w-4" />{props.loading ? props.status || "AI đang phân tích..." : props.mode === "stock" ? `Phân tích ${props.symbol || "cổ phiếu"}` : "Phân tích rủi ro danh mục"}</span></button>}
    {props.result && <div className="app-panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Bot className="h-5 w-5 text-[#54a0ff]" /><h3 className="font-black rainbow-text">Kết quả phân tích AI</h3></div>
        <button onClick={handleSaveToJournal} className="inline-flex items-center gap-1 text-xs font-bold text-[#54a0ff] hover:text-white">
          <Save className="h-3 w-3" /> 📓 Lưu vào nhật ký
        </button>
      </div>
      <div className="text-sm leading-relaxed text-slate-300">
        {renderMarkdown(props.result)}
      </div>
    </div>}
  </div>;
}


export default memo(AnalysisOutput);
