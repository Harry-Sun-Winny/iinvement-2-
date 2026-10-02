"use client";

import { useState } from "react";
import { Check, Clipboard, RefreshCw } from "lucide-react";
import { HoldingExt } from "@/app/holdings/page";

export function ValuationTab({ holding, marketData }: { holding: HoldingExt, marketData?: any }) {
  const [peerSymbols, setPeerSymbols] = useState("");
  const [peers, setPeers] = useState<Array<{ symbol: string; pe?: number; pb?: number; roe?: number }>>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [copied, setCopied] = useState(false);
  const formatNum = (num: number | undefined | null, prefix = "", suffix = "") => num != null ? `${prefix}${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}` : "Chưa có";
  const loadPeers = async () => {
    const symbols = peerSymbols.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 4);
    if (!symbols.length) return;
    setLoadingPeers(true);
    setPeers(await Promise.all(symbols.map(async symbol => { try { const r = await fetch(`/api/yahoo-details?symbol=${encodeURIComponent(symbol)}`); return r.ok ? { symbol, ...(await r.json()) } : { symbol }; } catch { return { symbol }; } })));
    setLoadingPeers(false);
  };
  const copyPrompt = async () => {
    const prompt = `Bạn là điều phối viên phân tích đa AI cho mã ${holding.symbol}. Hãy tìm tối đa 4 mã cùng ngành trên Yahoo Finance, sau đó phân công đúng vai trò và trả lời theo từng phần, không gộp chung:

[AI 1 - DATA SCREENER]
Nhiệm vụ: xác nhận ticker, ngành, sàn và lấy P/E, Forward P/E, P/B, P/S, EV/EBITDA, ROE, EPS. Ghi rõ nguồn và ngày dữ liệu. Không đưa khuyến nghị.

[AI 2 - FUNDAMENTAL ANALYST]
Nhiệm vụ: so sánh tăng trưởng, biên lợi nhuận, chất lượng lợi nhuận và định giá của ${holding.symbol} với từng peer. Nêu 3 điểm nổi bật, kèm dữ liệu hỗ trợ.

[AI 3 - RISK / RED-TEAM REVIEWER]
Nhiệm vụ: phản biện kết luận của AI 2, tìm dữ liệu thiếu, bẫy định giá, khác biệt ngành và điều kiện khiến phép so sánh sai. Không được dùng điểm trung bình để che giấu bất đồng.

[AI 4 - MARKET CONTEXT REVIEWER]
Nhiệm vụ: kiểm tra bối cảnh ngành, chu kỳ và tin tức gần đây có thể làm các chỉ số không còn tương đồng. Tách fact, inference và assumption.

[FINAL SYNTHESIS]
Tổng hợp thành bảng: ticker | vai trò trong nhóm | P/E | P/B | ROE | luận điểm chính | rủi ro | dữ liệu cần xác minh. Kết luận có điều kiện cho ${holding.symbol}; không viết như lời khuyên tài chính tuyệt đối. Nếu không có dữ liệu, ghi “thiếu dữ liệu”, không tự đoán.`;
    await navigator.clipboard?.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };
  const aiRoles = [
    ["01", "Data screener", "Xác nhận ticker và lấy chỉ số"],
    ["02", "Fundamental analyst", "Đọc chất lượng và định giá"],
    ["03", "Risk / red-team", "Tìm bẫy và phản biện"],
    ["04", "Market context", "Kiểm tra ngành và chu kỳ"],
  ];
  const CopyIcon = copied ? Check : Clipboard;
  return <div className="space-y-6"><div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><MetricCard label="P/E Ratio" value={formatNum(marketData?.pe)} /><MetricCard label="Forward P/E" value={formatNum(marketData?.forwardPe)} /><MetricCard label="PEG Ratio" value={formatNum(marketData?.peg)} /><MetricCard label="P/B Ratio" value={formatNum(marketData?.pb)} /><MetricCard label="P/S Ratio" value={formatNum(marketData?.ps)} /><MetricCard label="EV / EBITDA" value={formatNum(marketData?.evEbitda)} /><MetricCard label="ROE" value={formatNum(marketData?.roe, "", "%")} /><MetricCard label="EPS (TTM)" value={formatNum(marketData?.eps, "$")} /></div><div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 sm:p-5"><div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">Peer comparison</p><span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">4 vai trò AI</span></div><p className="mt-2 max-w-xl text-sm leading-5 text-slate-400">So sánh {holding.symbol} với tối đa 4 mã cùng ngành, có phân vai rõ để mỗi AI xử lý một góc nhìn.</p></div><button type="button" onClick={copyPrompt} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20 active:scale-[0.98]"><CopyIcon className="h-3.5 w-3.5" /> {copied ? "Đã sao chép workflow" : "Sao chép workflow AI"}</button></div><div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{aiRoles.map(([number, title, detail]) => <div key={number} className="rounded-lg border border-white/8 bg-slate-950/35 p-3"><div className="flex items-center gap-2"><span className="text-[10px] font-bold text-cyan-300">{number}</span><span className="text-xs font-semibold text-slate-200">{title}</span></div><p className="mt-1.5 text-[11px] leading-4 text-slate-500">{detail}</p></div>)}</div><div className="flex flex-col gap-2 sm:flex-row"><input aria-label="Ticker cùng ngành" value={peerSymbols} onChange={e => setPeerSymbols(e.target.value)} onKeyDown={e => e.key === "Enter" && loadPeers()} placeholder="Nhập mã, ví dụ: MSFT, GOOGL, AMZN" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10" /><button type="button" disabled={!peerSymbols.trim() || loadingPeers} onClick={loadPeers} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loadingPeers ? "animate-spin" : ""}`} /> {loadingPeers ? "Đang tải" : "So sánh"}</button></div>{peers.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{peers.map(peer => <div key={peer.symbol} className="rounded-lg border border-white/8 bg-slate-950/35 p-3"><p className="font-bold text-cyan-200">{peer.symbol}</p><div className="mt-2 grid grid-cols-2 gap-y-1 text-xs"><span className="text-slate-500">P/E</span><span className="text-right text-slate-200">{formatNum(peer.pe)}</span><span className="text-slate-500">P/B</span><span className="text-right text-slate-200">{formatNum(peer.pb)}</span><span className="text-slate-500">ROE</span><span className="text-right text-slate-200">{formatNum(peer.roe, "", "%")}</span></div></div>)}</div> : <div className="mt-4 rounded-lg border border-dashed border-white/10 bg-white/[0.015] px-4 py-5 text-center"><p className="text-sm font-medium text-slate-300">Chưa có nhóm so sánh</p><p className="mt-1 text-xs text-slate-500">Nhập ticker để tải số liệu, hoặc sao chép workflow để giao việc rõ cho từng AI.</p></div>}</div></div>;
}
function MetricCard({ label, value }: { label: string, value: string }) { return <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors"><p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{label}</p><p className="text-xl font-bold text-slate-200">{value}</p></div>; }
