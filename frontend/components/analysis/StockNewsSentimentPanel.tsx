"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CircleAlert, Newspaper, Plus, RefreshCw, X } from "lucide-react";

type NewsItem = {
  symbol: string;
  source: string;
  title: string;
  summary?: string;
  url: string;
  publishedAt: string;
};

type NewsTone = "positive" | "negative" | "neutral";

const POSITIVE = /beat|beats|upgrade|growth|record|partnership|approval|buyback|raises|strong|outperform|tăng|vượt|kỷ lục|hợp tác|phê duyệt|mua lại|tích cực/i;
const NEGATIVE = /miss|downgrade|lawsuit|probe|layoff|cuts|warning|weak|fall|decline|risk|fraud|recall|giảm|kiện|điều tra|sa thải|cảnh báo|rủi ro|phạt/i;

function getTone(item: NewsItem): NewsTone {
  const text = `${item.title} ${item.summary ?? ""}`;
  if (NEGATIVE.test(text)) return "negative";
  if (POSITIVE.test(text)) return "positive";
  return "neutral";
}

export function StockNewsSentimentPanel({
  symbols,
  isVi,
  onContextChange,
}: {
  symbols: string[];
  isVi: boolean;
  onContextChange?: (value: string) => void;
}) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualSymbol, setManualSymbol] = useState("");
  const [manualSymbols, setManualSymbols] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const symbolsKey = symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean).join("|");
  const normalizedSymbols = useMemo(() => [...new Set([...(symbolsKey ? symbolsKey.split("|") : []), ...manualSymbols])].slice(0, 8), [manualSymbols, symbolsKey]);
  const addSymbol = () => {
    const next = manualSymbol.trim().toUpperCase();
    if (!/^[A-Z0-9.-]{1,20}$/.test(next)) return;
    setManualSymbols((current) => current.includes(next) ? current : [...current, next].slice(0, 8));
    setManualSymbol("");
  };

  useEffect(() => {
    if (!normalizedSymbols.length) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    Promise.all(normalizedSymbols.map(async (symbol) => {
      try {
        const response = await fetch(`/api/stock-news?symbol=${encodeURIComponent(symbol)}`);
        const data = await response.json();
        return Array.isArray(data) ? data as NewsItem[] : [];
      } catch {
        return [] as NewsItem[];
      }
    })).then((groups) => {
      if (cancelled) return;
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const deduped = [...new Map(groups.flat().filter((item) => new Date(item.publishedAt).getTime() >= weekAgo).map((item) => [item.url, item])).values()]
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 8);
      setItems(deduped);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [normalizedSymbols, refreshKey]);

  useEffect(() => {
    if (!onContextChange) return;
    const context = items.length
      ? items.map((item) => `[${item.symbol}] ${getTone(item).toUpperCase()} | ${item.publishedAt} | ${item.title} | ${item.source}`).join("\n")
      : "Chưa có tin tức gần đây để đưa vào phân tích.";
    onContextChange(context);
  }, [items, onContextChange]);

  const groups = useMemo(() => ({
    positive: items.filter((item) => getTone(item) === "positive"),
    negative: items.filter((item) => getTone(item) === "negative"),
    neutral: items.filter((item) => getTone(item) === "neutral"),
  }), [items]);

  return (
    <section className="antigravity-panel rounded-2xl border border-white/5 bg-white/[0.01] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-white"><Newspaper className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-bold uppercase tracking-[0.2em]">{isVi ? "Tin tức theo mã" : "Ticker news"}</h2></div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{isVi ? "Phân loại sơ bộ theo tiêu đề trong 7 ngày gần đây. Tin tức liên quan không đồng nghĩa là nguyên nhân biến động giá." : "Headline-level classification from the last 7 days. Related news does not establish price causality."}</p>
        </div>
        <div className="flex gap-2 text-[10px] font-bold">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-200">+ {groups.positive.length}</span>
          <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-1 text-rose-200">− {groups.negative.length}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input value={manualSymbol} onChange={(event) => setManualSymbol(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSymbol()} placeholder={isVi ? "Nhập mã, ví dụ: NVDA hoặc FPT" : "Enter a ticker, e.g. NVDA or FPT"} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50" />
        <button type="button" onClick={addSymbol} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100"><Plus className="h-3.5 w-3.5" />{isVi ? "Thêm mã" : "Add ticker"}</button>
        <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={!normalizedSymbols.length || loading} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />{isVi ? "Tải lại" : "Refresh"}</button>
      </div>
      {normalizedSymbols.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{normalizedSymbols.map((symbol) => <span key={symbol} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/55 px-2.5 py-1 text-[10px] font-bold text-slate-200">{symbol}{manualSymbols.includes(symbol) && <button type="button" onClick={() => setManualSymbols((current) => current.filter((item) => item !== symbol))} className="text-slate-500 hover:text-rose-300" aria-label={`Remove ${symbol}`}><X className="h-3 w-3" /></button>}</span>)}</div>}
      {loading ? <p className="mt-4 text-xs text-slate-500">{isVi ? "Đang tải tin theo các mã..." : "Loading ticker news..."}</p> : normalizedSymbols.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-white/10 px-3 py-3 text-xs text-slate-500">{isVi ? "Nhập một mã ở trên để tải và phân loại tin tức. Khi chọn cổ phiếu ở hồ sơ thẩm định, mã sẽ tự xuất hiện tại đây." : "Enter a ticker above to load and classify news. Choosing a stock in the review will add it here automatically."}</p> : items.length === 0 ? <p className="mt-4 text-xs text-slate-500">{isVi ? "Không tìm thấy tin trong 7 ngày gần đây cho các mã đã chọn. Bạn có thể tải lại hoặc thử mã giao dịch khác." : "No news found for the selected tickers in the past 7 days. Refresh or try a different trading symbol."}</p> : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {[...groups.negative, ...groups.positive, ...groups.neutral].slice(0, 6).map((item) => {
            const tone = getTone(item);
            const toneClass = tone === "negative" ? "border-rose-400/15 bg-rose-400/[0.04]" : tone === "positive" ? "border-emerald-400/15 bg-emerald-400/[0.04]" : "border-white/5 bg-slate-950/45";
            const label = tone === "negative" ? (isVi ? "Rủi ro" : "Risk") : tone === "positive" ? (isVi ? "Tích cực" : "Positive") : (isVi ? "Trung tính" : "Neutral");
            return <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className={`block rounded-xl border p-3 transition hover:border-cyan-300/30 ${toneClass}`}>
              <div className="flex items-center justify-between gap-3 text-[10px]"><span className="font-bold text-slate-200">{item.symbol}</span><span className="text-slate-500">{label} · {item.source}</span></div>
              <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-200">{item.title}</p>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-cyan-300/80">{new Date(item.publishedAt).toLocaleDateString(isVi ? "vi-VN" : "en-US")} <ArrowUpRight className="h-3 w-3" /></p>
            </a>;
          })}
        </div>
      )}
      {groups.negative.length > 0 && <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-rose-200/80"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{isVi ? "Các tiêu đề rủi ro cần được kiểm tra với nguồn gốc trước khi đưa vào luận điểm đầu tư." : "Risk headlines require source verification before they influence an investment thesis."}</p>}
    </section>
  );
}
