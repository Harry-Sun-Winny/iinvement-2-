import React, { useState, useMemo } from "react";
import MiniSparkline from "./MiniSparkline";

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  changeRange: number | null;
  changePctRange: number | null;
  dataQuality?: {
    status: "OK" | "WARN" | "ERROR";
    checks: string[];
    sources: string[];
    unavailableSources: string[];
    primarySource: string;
    fallbackUsed: boolean;
    maxDeviationPercent: number | null;
  };
}

interface MarketTableProps {
  symbols: { symbol: string; name: string }[];
  data: Record<string, MarketItem>;
  activeRange: string;
}

type SortKey = "symbol" | "price" | "changePercent";

export default function MarketTable({ symbols, data, activeRange }: MarketTableProps) {
  const [colWidths, setColWidths] = useState({
    name: 200,
    price: 120,
    change: 120,
    changePct: 180,
    quality: 150,
  });

  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function getChange(d: MarketItem) { return activeRange === "1d" ? d.change : (d.changeRange ?? null); }
  function getChangePct(d: MarketItem) { return activeRange === "1d" ? d.changePercent : (d.changePctRange ?? null); }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedSymbols = useMemo(() => {
    const list = [...symbols];
    list.sort((a, b) => {
      const itemA = data[a.symbol];
      const itemB = data[b.symbol];

      let valA: any = a.symbol;
      let valB: any = b.symbol;

      if (sortKey === "price") {
        valA = itemA ? itemA.price : 0;
        valB = itemB ? itemB.price : 0;
      } else if (sortKey === "changePercent") {
        valA = itemA ? (getChangePct(itemA) ?? 0) : 0;
        valB = itemB ? (getChangePct(itemB) ?? 0) : 0;
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [symbols, data, sortKey, sortDir, activeRange]);

  const startResize = (col: keyof typeof colWidths, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[col];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColWidths((prev) => ({
        ...prev,
        [col]: Math.max(80, startWidth + deltaX),
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const gridTemplate = `${colWidths.name}px ${colWidths.price}px ${colWidths.change}px ${colWidths.changePct}px ${colWidths.quality}px`;

  return (
    <div className="w-full">
      {/* Sticky Table Header */}
      <div
        className="sticky top-0 z-20 bg-[#16131D] border-b border-white/10 text-slate-400 font-bold text-xs uppercase tracking-wider select-none"
        style={{ display: "grid", gridTemplateColumns: gridTemplate }}
      >
        {[
          { label: "Tên", key: "symbol" as const, resizable: "name" as const },
          { label: "Giá", key: "price" as const, resizable: "price" as const, alignRight: true },
          { label: "Thay đổi", key: null, resizable: "change" as const, alignRight: true },
          { label: "% Thay đổi", key: "changePercent" as const, resizable: "changePct" as const, alignRight: true },
          { label: "Dữ liệu", key: null, resizable: "quality" as const, alignRight: true },
        ].map((col, idx) => (
          <div
            key={idx}
            className={`py-3 px-2 flex items-center relative group ${col.alignRight ? "justify-end" : "justify-start"}`}
          >
            {col.key ? (
              <button
                onClick={() => handleSort(col.key!)}
                className="hover:text-white transition-colors flex items-center gap-1 font-bold"
              >
                {col.label}
                <span className="text-[9px] opacity-60">
                  {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </button>
            ) : (
              <span>{col.label}</span>
            )}
            {/* Draggable resize handle */}
            <div
              onMouseDown={(e) => startResize(col.resizable, e)}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-30"
            />
          </div>
        ))}
      </div>

      {/* Table Body */}
      <div className="divide-y divide-white/5">
        {sortedSymbols.map(({ symbol, name }) => {
          const d = data[symbol];
          const chg = d ? getChange(d) : null;
          const chgPct = d ? getChangePct(d) : null;

          return (
            <div
              key={symbol}
              className="items-center py-2 transition-colors hover:bg-white/[0.02] text-xs"
              style={{ display: "grid", gridTemplateColumns: gridTemplate }}
            >
              {/* Tên */}
              <div className="flex items-center gap-2.5 min-w-0 px-2">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-white/5 text-[10px] font-black text-white">
                  {symbol.replace("^", "").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{symbol.replace("^", "")}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{name}</p>
                </div>
              </div>

              {/* Giá */}
              <p className="text-right font-semibold text-white font-mono px-2">
                {d ? d.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
              </p>

              {/* Thay đổi */}
              <p className={`text-right font-semibold font-mono px-2 ${chg == null ? "text-slate-500" : chg >= 0 ? "text-green-400" : "text-red-400"}`}>
                {chg != null ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}` : "—"}
              </p>

              {/* % Thay đổi & Sparkline */}
              <div className="text-right flex items-center justify-end gap-2 px-2">
                {chgPct != null ? (
                  <>
                    <MiniSparkline />
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${chgPct >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {chgPct >= 0 ? "▲" : "▼"} {Math.abs(chgPct).toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-500">—</span>
                )}
              </div>

              {/* Dữ liệu Quality */}
              <div className="text-right px-2">
                {d?.dataQuality ? (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${d.dataQuality.status === "OK" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-300"}`}>
                    {d.dataQuality.status === "OK" ? "OK" : "WARN"} · {d.dataQuality.primarySource}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
