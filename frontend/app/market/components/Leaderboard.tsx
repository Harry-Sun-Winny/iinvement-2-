import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Leaderboard() {
  const gainers = [
    { symbol: "NVDA", price: 125.80, change: 4.82 },
    { symbol: "TSLA", price: 210.45, change: 3.15 },
  ];

  const losers = [
    { symbol: "AMZN", price: 185.10, change: -2.40 },
    { symbol: "NFLX", price: 620.50, change: -1.85 },
  ];

  return (
    <Card className="antigravity-panel border-white/5 bg-white/[0.01]">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Market Leaders (Active Tickers)
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 py-4">
        {/* Gainers */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-green-400/80 uppercase tracking-widest pl-1 mb-2">Gainers</p>
          {gainers.map((g, i) => (
            <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 flex justify-between items-center text-xs">
              <span className="font-mono font-bold text-white">{g.symbol}</span>
              <span className="font-mono font-bold text-green-400">+{g.change}%</span>
            </div>
          ))}
        </div>

        {/* Losers */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-red-400/80 uppercase tracking-widest pl-1 mb-2">Losers</p>
          {losers.map((l, i) => (
            <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-lg p-2 flex justify-between items-center text-xs">
              <span className="font-mono font-bold text-white">{l.symbol}</span>
              <span className="font-mono font-bold text-red-400">{l.change}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
