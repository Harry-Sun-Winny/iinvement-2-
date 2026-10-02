import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/components/providers/I18nProvider";
import { SectorSnapshot } from "../types";
import { formatPercent } from "../utils";

interface SectorPerformanceProps {
  items: SectorSnapshot[];
  onSelectSymbol?: (symbol: string) => void;
}

export default function SectorPerformance({ items, onSelectSymbol }: SectorPerformanceProps) {
  const { language } = useTranslation();
  const isVi = language === "vi";

  return (
    <Card className="border-white/10 bg-[#0e1620]">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
          {isVi ? "Nhịp ngành (1D)" : "Sector Pulse (1D)"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
            {isVi ? "Chưa có dữ liệu nhóm ngành." : "No sector data yet."}
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.symbol}
              onClick={() => onSelectSymbol?.(item.symbol)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/15 hover:bg-white/[0.04]"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.symbol}</p>
              </div>
              <span className={`text-sm font-semibold ${item.changePercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {formatPercent(item.changePercent)}
              </span>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
