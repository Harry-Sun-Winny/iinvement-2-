"use client";

import React from "react";
import { Smile, Frown, Meh, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface SentimentStock {
  ticker: string;
  name: string;
  score: number;
}

const SENTIMENT_MOCK: SentimentStock[] = [
  { ticker: "VNM", name: "Vinamilk", score: 55 },
  { ticker: "FPT", name: "FPT Corporation", score: 82 },
  { ticker: "HPG", name: "Hòa Phát Group", score: 68 },
  { ticker: "VCB", name: "Vietcombank", score: 74 },
  { ticker: "MWG", name: "Thế Giới Di Động", score: 42 },
  { ticker: "GAS", name: "PV GAS", score: 61 },
];

import type { PositionSummary } from "@/types/analysis";

export default function SentimentAnalysis({ positions }: { positions: PositionSummary[] }) {
  const dynamicMock = React.useMemo(() => {
    if (!positions || positions.length === 0) return SENTIMENT_MOCK;
    return positions.map((p) => {
      const mock = SENTIMENT_MOCK.find((m) => m.ticker === p.symbol);
      if (mock) return mock;
      return { ticker: p.symbol, name: p.name || p.symbol, score: 50 };
    });
  }, [positions]);
  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">Fear & Greed Index</div>
          <div className="text-2xl font-bold text-amber-400">72</div>
          <div className="text-[11px] text-amber-400 mt-1 font-medium">GREED — Tham lam</div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">Tâm lý nhà đầu tư</div>
          <div className="text-2xl font-bold text-emerald-400">Tích cực</div>
          <div className="text-[11px] text-[#6B7FA3] mt-1">Bull/Bear: 64% / 36%</div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">Tin tức tổng hợp (AI)</div>
          <div className="text-2xl font-bold text-emerald-400">+0.74</div>
          <div className="text-[11px] text-[#6B7FA3] mt-1">Thang điểm -1 đến +1</div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">Short Interest (TB)</div>
          <div className="text-2xl font-bold text-emerald-400">1.2%</div>
          <div className="text-[11px] text-[#6B7FA3] mt-1">Rất thấp — Ít bearish</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-3">Chỉ số tâm lý thị trường</div>
          <div className="space-y-2">
            {[
              { lbl: "VIX (Chỉ số sợ hãi)", val: "14.2 — Thấp", status: "pos" },
              { lbl: "Put/Call Ratio", val: "0.72 — Bull", status: "pos" },
              { lbl: "AAII Bull%", val: "64.1%", status: "pos" },
              { lbl: "Margin Debt", val: "↑ Tăng 8%", status: "amb" },
              { lbl: "Smart Money Flow", val: "Đang MUA", status: "pos" },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-[#6B7FA3]">{row.lbl}</span>
                <span className={`text-xs font-medium ${row.status === "pos" ? "text-emerald-400" : "text-amber-400"}`}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-3">Phân tích mạng xã hội (AI)</div>
          <div className="space-y-2">
            {[
              { lbl: "Reddit /r/stocks", val: "Rất tích cực", status: "pos" },
              { lbl: "Twitter/X $TICKER", val: "Tích cực", status: "pos" },
              { lbl: "StockTwits", val: "Trung tính", status: "amb" },
              { lbl: "Google Trends", val: "↑ +42% tuần", status: "amb" },
              { lbl: "Analyst đồng thuận", val: "BUY (18/21)", status: "pos" },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-[#6B7FA3]">{row.lbl}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${row.status === "pos" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-3">Tin tức quan trọng (AI)</div>
          <div className="space-y-3">
            {[
              { text: "Doanh thu AI chip kỷ lục Q1", type: "pos" },
              { text: "FED giữ nguyên lãi suất", type: "pos" },
              { text: "Căng thẳng thương mại leo thang", type: "neg" },
              { text: "Apple AI features ra mắt", type: "pos" },
            ].map((news, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${news.type === "pos" ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span className="text-xs text-[#E7E9EE] leading-relaxed">{news.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-4">Insider Trading (30 ngày)</div>
          <div className="space-y-2">
            {[
              { ticker: "VNM", action: "CEO mua", val: "+$8.2M", type: "pos" },
              { ticker: "FPT", action: "CFO mua", val: "+$2.1M", type: "pos" },
              { ticker: "HPG", action: "Director bán", val: "-$5.6M", type: "neg" },
              { ticker: "VCB", action: "COO mua", val: "+$3.4M", type: "pos" },
            ].map((trade, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-[#E7E9EE]">{trade.ticker}</span>
                  <span className="text-xs text-[#6B7FA3]">{trade.action}</span>
                </div>
                <span className={`text-xs font-medium ${trade.type === "pos" ? "text-emerald-400" : "text-rose-400"}`}>{trade.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-4">Tâm lý theo mã cổ phiếu</div>
          <div className="space-y-4">
            {dynamicMock.map((s) => (
              <div key={s.ticker} className="space-y-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#E7E9EE]">{s.ticker}</span>
                  <span className="text-[#6B7FA3]">{s.score}/100</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${s.score > 70 ? "bg-emerald-400" : s.score > 50 ? "bg-amber-400" : "bg-rose-400"}`}
                    style={{ width: `${s.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
