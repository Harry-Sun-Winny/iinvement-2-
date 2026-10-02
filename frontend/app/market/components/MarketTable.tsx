import React, { useMemo, useState } from "react";
import { useTranslation } from "@/components/providers/I18nProvider";
import MiniSparkline from "./MiniSparkline";
import { MarketAsset, MarketQuote } from "../types";
import { formatAsOf, formatMoney, formatPercent, getDisplayChange, getDisplayChangePercent } from "../utils";

interface MarketTableProps {
  symbols: MarketAsset[];
  data: Record<string, MarketQuote>;
  activeRange: string;
  selectedSymbol?: string | null;
  onSelectSymbol?: (symbol: string) => void;
}

type SortKey = "symbol" | "price" | "change" | "changePct";

export default function MarketTable({
  symbols,
  data,
  activeRange,
  selectedSymbol,
  onSelectSymbol,
}: MarketTableProps) {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const [sortKey, setSortKey] = useState<SortKey>("changePct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir(key === "symbol" ? "asc" : "desc");
  }

  const rows = useMemo(() => {
    const items = symbols.map((symbol) => {
      const quote = data[symbol.symbol];
      return {
        asset: symbol,
        quote,
        displayChange: quote ? getDisplayChange(quote, activeRange) : null,
        displayChangePct: quote ? getDisplayChangePercent(quote, activeRange) : null,
      };
    });

    items.sort((a, b) => {
      let aValue: string | number = a.asset.symbol;
      let bValue: string | number = b.asset.symbol;

      if (sortKey === "price") {
        aValue = a.quote?.price ?? Number.NEGATIVE_INFINITY;
        bValue = b.quote?.price ?? Number.NEGATIVE_INFINITY;
      } else if (sortKey === "change") {
        aValue = a.displayChange ?? Number.NEGATIVE_INFINITY;
        bValue = b.displayChange ?? Number.NEGATIVE_INFINITY;
      } else if (sortKey === "changePct") {
        aValue = a.displayChangePct ?? Number.NEGATIVE_INFINITY;
        bValue = b.displayChangePct ?? Number.NEGATIVE_INFINITY;
      }

      if (aValue < bValue) return sortDir === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return items;
  }, [symbols, data, activeRange, sortKey, sortDir]);

  const headers: Array<{ key: SortKey | null; label: string; align?: "left" | "right" }> = [
    { key: "symbol", label: isVi ? "Tài sản" : "Asset" },
    { key: "price", label: isVi ? "Giá" : "Price", align: "right" },
    { key: "change", label: isVi ? "Biến động" : "Move", align: "right" },
    { key: "changePct", label: isVi ? "% / xu hướng" : "% / trend", align: "right" },
    { key: null, label: isVi ? "Tín hiệu" : "Signals" },
    { key: null, label: isVi ? "Nguồn & thời gian" : "Source & freshness" },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--market-border)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--market-border)]">
          <thead className="bg-[var(--market-surface-elevated)]">
            <tr>
              {headers.map((header) => (
                <th
                  key={header.label}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--market-text-muted)] ${header.align === "right" ? "text-right" : "text-left"}`}
                >
                  {header.key ? (
                    <button
                      onClick={() => handleSort(header.key!)}
                      className="inline-flex items-center gap-1 transition hover:text-[var(--market-text-primary)]"
                    >
                      {header.label}
                      <span className="text-[10px]">
                        {sortKey === header.key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    header.label
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--market-border)] bg-[var(--market-surface)]">
            {rows.map(({ asset, quote, displayChange, displayChangePct }) => {
              const isPositive = (displayChangePct ?? 0) >= 0;
              const isActive = selectedSymbol?.toUpperCase() === asset.symbol.toUpperCase();

              return (
                <tr
                  key={asset.symbol}
                  onClick={() => onSelectSymbol?.(asset.symbol)}
                  className={`cursor-pointer transition ${isActive ? "bg-[var(--market-selection)] border-l-2 border-l-[var(--market-accent)]" : "hover:bg-[var(--market-surface-hover)]"}`}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[var(--market-border)] bg-white/[0.04] text-xs font-semibold text-[var(--market-text-primary)]">
                        {asset.symbol.replace("^", "").slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--market-text-primary)]">{asset.symbol.replace("^", "")}</p>
                        <p className="truncate text-xs text-[var(--market-text-muted)]">{asset.name}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right text-sm font-medium text-[var(--market-text-primary)]">
                    {formatMoney(quote?.price, quote?.currency || "USD")}
                  </td>

                  <td className={`px-4 py-4 text-right text-sm font-semibold ${isPositive ? "text-[var(--market-positive)]" : "text-[var(--market-negative)]"}`}>
                    {displayChange != null && Number.isFinite(displayChange)
                      ? `${displayChange >= 0 ? "+" : ""}${displayChange.toFixed(2)}`
                      : "—"}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <MiniSparkline points={quote?.sparkline} positive={isPositive} />
                      <span className={`min-w-[72px] text-right text-sm font-semibold ${isPositive ? "text-[var(--market-positive)]" : "text-[var(--market-negative)]"}`}>
                        {formatPercent(displayChangePct)}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex min-w-[132px] flex-wrap gap-1.5 text-[11px]">
                      {quote?.volume && quote?.averageVolume ? (
                        <span className="rounded-md bg-[var(--market-accent-soft)] px-1.5 py-1 font-semibold text-[var(--market-accent)]">
                          Vol {(quote.volume / quote.averageVolume).toFixed(1)}x
                        </span>
                      ) : null}
                      {quote?.trailingPE ? (
                        <span className="rounded-md border border-[var(--market-border)] px-1.5 py-1 text-[var(--market-text-secondary)]">P/E {quote.trailingPE.toFixed(1)}</span>
                      ) : null}
                      {quote?.fiftyTwoWeekHigh && quote?.price ? (
                        <span className="rounded-md border border-[var(--market-border)] px-1.5 py-1 text-[var(--market-text-secondary)]">
                          {Math.abs(quote.fiftyTwoWeekHigh - quote.price) / quote.fiftyTwoWeekHigh <= 0.03 ? (isVi ? "Sát đỉnh 52T" : "Near 52W high") : (isVi ? "Có biên 52T" : "52W range")}
                        </span>
                      ) : null}
                      {!quote?.volume && !quote?.trailingPE && !quote?.fiftyTwoWeekHigh ? <span className="text-[var(--market-text-muted)]">—</span> : null}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1 text-sm">
                      <p className="text-[var(--market-text-primary)]">
                        {quote?.dataQuality?.primarySource || "—"}
                      </p>
                      <p className="text-xs text-[var(--market-text-muted)]">
                        {formatAsOf(quote?.asOf)}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
