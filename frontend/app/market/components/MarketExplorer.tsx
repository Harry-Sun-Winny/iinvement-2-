"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Flame, Gauge, Layers3, LoaderCircle, RefreshCw } from "lucide-react";
import type { MarketAsset, MarketQuote } from "../types";
import {
  getHotReason,
  getHotScore,
  MARKET_EXPLORER_VIEWS,
  MARKET_EXPLORER_VIEW_BY_ID,
  type MarketExplorerGroupId,
} from "../marketExplorer";
import { formatMoney, formatPercent, getDisplayChangePercent } from "../utils";

const GROUPS: Array<{ id: MarketExplorerGroupId; vi: string; en: string; icon: typeof Flame }> = [
  { id: "stocks", vi: "Khám phá cổ phiếu", en: "Stock discovery", icon: Flame },
  { id: "commodities", vi: "Hàng hóa", en: "Commodities", icon: Layers3 },
  { id: "indices", vi: "Chỉ số", en: "Indices", icon: Gauge },
];

export function MarketExplorerNavigation({ activeViewId, isVi, onChange }: { activeViewId: string; isVi: boolean; onChange: (viewId: string) => void }) {
  const current = MARKET_EXPLORER_VIEW_BY_ID[activeViewId];
  const [activeGroup, setActiveGroup] = useState<MarketExplorerGroupId>(current?.group ?? "stocks");
  const views = MARKET_EXPLORER_VIEWS.filter((item) => item.group === activeGroup);

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--market-border)] bg-[var(--market-surface)]">
      <div className="flex overflow-x-auto border-b border-[var(--market-border)] bg-[var(--market-surface-elevated)] p-2">
        {GROUPS.map((group) => {
          const Icon = group.icon;
          const selected = activeGroup === group.id;
          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setActiveGroup(group.id)}
              className={`inline-flex min-w-max items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${selected ? "bg-[var(--market-accent-soft)] text-[var(--market-accent)]" : "text-[var(--market-text-muted)] hover:bg-[var(--market-surface-hover)] hover:text-[var(--market-text-primary)]"}`}
            >
              <Icon className="h-4 w-4" />
              {isVi ? group.vi : group.en}
              <span className="rounded-md border border-[var(--market-border)] px-1.5 py-0.5 text-[10px]">{MARKET_EXPLORER_VIEWS.filter((item) => item.group === group.id).length}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-1 p-2 sm:grid-cols-2 xl:grid-cols-3">
        {views.map((item) => {
          const selected = activeViewId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(item.id)}
              className={`group flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition active:scale-[0.99] ${selected ? "border-[var(--market-accent)]/40 bg-[var(--market-accent-soft)]" : "border-transparent hover:border-[var(--market-border)] hover:bg-[var(--market-surface-hover)]"}`}
            >
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${selected ? "text-[var(--market-accent)]" : "text-[var(--market-text-primary)]"}`}>{isVi ? item.labelVi : item.labelEn}</span>
                <span className="mt-1 block text-xs leading-4 text-[var(--market-text-muted)]">{isVi ? item.descriptionVi : item.descriptionEn}</span>
              </span>
              <ChevronRight className={`h-4 w-4 shrink-0 transition ${selected ? "text-[var(--market-accent)]" : "text-[var(--market-text-muted)] group-hover:translate-x-0.5"}`} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function getScreenReason(quote: MarketQuote, strategy: string | undefined, isVi: boolean) {
  const relativeVolume = quote.volume && quote.averageVolume ? quote.volume / quote.averageVolume : null;
  const distanceHigh = quote.price && quote.fiftyTwoWeekHigh ? Math.abs(quote.fiftyTwoWeekHigh - quote.price) / quote.fiftyTwoWeekHigh * 100 : null;
  const distanceLow = quote.price && quote.fiftyTwoWeekLow ? Math.abs(quote.price - quote.fiftyTwoWeekLow) / quote.fiftyTwoWeekLow * 100 : null;
  if (strategy === "pre") return `Pre-market ${formatPercent(quote.preMarketChangePercent)}`;
  if (strategy === "post") return `After-hours ${formatPercent(quote.postMarketChangePercent)}`;
  if (strategy === "high52" && distanceHigh != null) return isVi ? `Cách đỉnh 52 tuần ${distanceHigh.toFixed(1)}%` : `${distanceHigh.toFixed(1)}% below 52-week high`;
  if (strategy === "low52" && distanceLow != null) return isVi ? `Cách đáy 52 tuần ${distanceLow.toFixed(1)}%` : `${distanceLow.toFixed(1)}% above 52-week low`;
  if (strategy === "active" && relativeVolume != null) return isVi ? `Volume ${relativeVolume.toFixed(1)}x trung bình` : `Volume ${relativeVolume.toFixed(1)}x average`;
  if (strategy === "undervalued" || strategy === "overvalued") return `P/E ${quote.trailingPE?.toFixed(1) ?? "N/A"}`;
  return getHotReason(quote, isVi);
}

export function HotStockRadar({ assets, quotes, activeRange, activeViewId, loading, isVi, onRefresh, onSelectSymbol }: { assets: MarketAsset[]; quotes: Record<string, MarketQuote>; activeRange: string; activeViewId: string; loading: boolean; isVi: boolean; onRefresh: () => void; onSelectSymbol: (symbol: string) => void }) {
  const activeView = MARKET_EXPLORER_VIEW_BY_ID[activeViewId];
  const highlights = useMemo(() => {
    const items = assets
      .filter((asset) => quotes[asset.symbol]?.price)
      .map((asset) => ({ asset, quote: quotes[asset.symbol], score: getHotScore(quotes[asset.symbol], activeRange) }));
    if (!activeView?.strategy || activeView.strategy === "hot") items.sort((a, b) => b.score - a.score);
    return items.slice(0, 6);
  }, [activeRange, activeView?.strategy, assets, quotes]);

  const title = activeView ? (isVi ? activeView.labelVi : activeView.labelEn) : (isVi ? "Radar cổ phiếu hot" : "Hot stock radar");
  const description = activeView ? (isVi ? activeView.descriptionVi : activeView.descriptionEn) : (isVi ? "Điểm nóng theo dữ liệu thị trường." : "Market-data highlights.");

  return (
    <section key={activeViewId} aria-live="polite" className="animate-in fade-in slide-in-from-top-1 rounded-[28px] border border-[var(--market-accent)]/35 bg-[var(--market-surface)] p-4 duration-200 md:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[var(--market-accent)]">
            {activeView?.strategy === "hot" ? <Flame className="h-4 w-4" /> : <Gauge className="h-4 w-4" />}
            <h2 className="text-sm font-bold">{title}</h2>
            <span className="rounded-md border border-[var(--market-accent)]/30 bg-[var(--market-accent-soft)] px-2 py-0.5 text-[10px] font-bold">{assets.length} {isVi ? "mã" : "symbols"}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--market-text-muted)]">{description}</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--market-border)] bg-[var(--market-surface-elevated)] px-3 py-2 text-[11px] font-semibold text-[var(--market-text-secondary)] transition hover:border-[var(--market-accent)]/40 hover:text-[var(--market-accent)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
          {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[var(--market-accent)]" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? (isVi ? "Đang áp dụng bộ lọc..." : "Applying screen...") : (isVi ? "Làm mới kết quả" : "Refresh results")}
        </button>
      </div>

      {highlights.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--market-border)] bg-[var(--market-surface-elevated)] px-4 py-7 text-center">
          <p className="text-sm font-semibold text-[var(--market-text-primary)]">{loading ? (isVi ? "Đang lấy dữ liệu phù hợp" : "Loading matching data") : (isVi ? "Chưa có mã đáp ứng tiêu chí" : "No symbols currently match")}</p>
          <p className="mt-1 text-xs text-[var(--market-text-muted)]">{isVi ? "Thử đổi khung thời gian hoặc quay lại sau khi thị trường cập nhật." : "Try another range or check again after the next market refresh."}</p>
        </div>
      ) : <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {highlights.map(({ asset, quote, score }, index) => {
          const change = getDisplayChangePercent(quote, activeRange);
          const positive = (change ?? 0) >= 0;
          return (
            <button key={asset.symbol} type="button" onClick={() => onSelectSymbol(asset.symbol)} className="flex items-center gap-3 rounded-2xl border border-[var(--market-border)] bg-[var(--market-surface-elevated)] p-3 text-left transition hover:border-[var(--market-accent)]/45 hover:bg-[var(--market-surface-hover)] active:scale-[0.98]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--market-accent-soft)] text-xs font-black text-[var(--market-accent)]">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2"><span className="font-bold text-[var(--market-text-primary)]">{asset.symbol}</span><span className={`text-xs font-bold ${positive ? "text-[var(--market-positive)]" : "text-[var(--market-negative)]"}`}>{formatPercent(change)}</span></span>
                <span className="mt-0.5 block truncate text-xs text-[var(--market-text-muted)]">{getScreenReason(quote, activeView?.strategy, isVi)}</span>
                <span className="mt-1 flex items-center justify-between text-[11px] text-[var(--market-text-secondary)]"><span>{formatMoney(quote.price, quote.currency || "USD")}</span><span>{activeView?.strategy === "hot" ? `${isVi ? "Nhiệt" : "Heat"} ${score}` : `${isVi ? "Hạng" : "Rank"} ${index + 1}`}</span></span>
              </span>
            </button>
          );
        })}
      </div>}
    </section>
  );
}
