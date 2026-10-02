import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/components/providers/I18nProvider";
import { MarketLeaderboardItem } from "../types";
import { formatMoney, formatPercent } from "../utils";

interface LeaderboardProps {
  gainers: MarketLeaderboardItem[];
  losers: MarketLeaderboardItem[];
  onSelectSymbol?: (symbol: string) => void;
}

function LeaderList({
  items,
  emptyLabel,
  tone,
  onSelectSymbol,
}: {
  items: MarketLeaderboardItem[];
  emptyLabel: string;
  tone: "gain" | "loss";
  onSelectSymbol?: (symbol: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.symbol}
          onClick={() => onSelectSymbol?.(item.symbol)}
          className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/15 hover:bg-white/[0.04]"
        >
          <div>
            <p className="text-sm font-semibold text-white">{item.symbol}</p>
            <p className="text-xs text-slate-400">{item.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-200">{formatMoney(item.price)}</p>
            <p className={`text-xs font-semibold ${tone === "gain" ? "text-emerald-300" : "text-rose-300"}`}>
              {formatPercent(item.changePercent)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function Leaderboard({ gainers, losers, onSelectSymbol }: LeaderboardProps) {
  const { language } = useTranslation();
  const isVi = language === "vi";

  return (
    <Card className="border-white/10 bg-[#0e1620]">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
          {isVi ? "Dẫn dắt theo phạm vi đang xem" : "Leaders In Current View"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
            {isVi ? "Tăng mạnh" : "Top gainers"}
          </p>
          <LeaderList
            items={gainers}
            emptyLabel={isVi ? "Không có mã tăng giá." : "No gainers in view."}
            tone="gain"
            onSelectSymbol={onSelectSymbol}
          />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-300/80">
            {isVi ? "Giảm mạnh" : "Top losers"}
          </p>
          <LeaderList
            items={losers}
            emptyLabel={isVi ? "Không có mã giảm giá." : "No losers in view."}
            tone="loss"
            onSelectSymbol={onSelectSymbol}
          />
        </div>
      </CardContent>
    </Card>
  );
}
