import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardData } from "../../watchlist/[id]/lib/types";
import {
  selectPrice,
  selectChangePercent,
  selectLogo,
  selectCompanyName,
  selectTicker
} from "../../watchlist/[id]/lib/selectors";

interface ExecutiveBannerProps {
  score: number;
  verdict: { label: string; tone: "buy" | "hold" | "sell" };
  symbol?: string;
  name?: string;
  data: Readonly<DashboardData> | null;
}

function ExecutiveBanner({ score, verdict, symbol = "TICKER", name = "Stock Name", data }: ExecutiveBannerProps) {
  const displaySymbol = data ? selectTicker(data) : symbol;
  const displayName = data ? selectCompanyName(data) : name;
  const livePrice = data ? selectPrice(data) : null;
  const changePercent = data ? selectChangePercent(data) : null;
  const logo = data ? selectLogo(data) : "";

  return (
    <Card className="antigravity-panel border-white/5 bg-white/[0.01]">
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt="" className="h-10 w-10 rounded-full bg-white border border-white/10" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 font-bold font-mono">
              {displaySymbol.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-white font-mono">{displaySymbol || "TICKER"}</span>
              <Badge variant="outline" className="border-cyan-400/30 text-cyan-300">
                Scoring Workstation
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-400">{displayName}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {livePrice !== null && (
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price</p>
              <p className="text-lg font-bold text-white font-mono">${livePrice.toFixed(2)}</p>
              {changePercent !== null && (
                <span className={`text-xs font-bold ${changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
                </span>
              )}
            </div>
          )}

          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Composite Score</p>
            <div className="flex items-baseline gap-1 mt-1 justify-end">
              <span className="text-3xl font-black text-white font-mono">{score.toFixed(0)}</span>
              <span className="text-xs font-bold text-slate-500">/100</span>
            </div>
          </div>

          <Badge
            className={`px-4 py-2 text-xs font-black tracking-wide rounded-full border ${
              verdict.tone === "buy"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : verdict.tone === "sell"
                ? "bg-red-500/10 text-red-400 border-red-500/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}
          >
            {verdict.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(ExecutiveBanner);
