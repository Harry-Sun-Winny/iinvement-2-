"use client";

import { memo } from "react";
import { Skull, Trophy } from "lucide-react";
import type { PositionSummary } from "@/types/analysis";
import { formatPercent } from "@/utils/risk";

function Highlight({ position, winner }: { position: PositionSummary; winner: boolean }) {
  const border = winner ? "border-l-rainbow-green" : "border-l-rainbow-red";
  const background = winner ? "bg-green-500/10" : "bg-red-500/10";
  const text = winner ? "text-green-400" : "text-red-400";
  return <div className={`app-panel flex items-center gap-4 p-5 ${border}`}><div className={`grid h-10 w-10 place-items-center rounded-xl ${background}`}>{winner ? <Trophy className="h-5 w-5 text-green-400" /> : <Skull className="h-5 w-5 text-red-400" />}</div><div><p className={`text-xs font-bold ${text}`}>{winner ? "WINNER" : "LOSER"}</p><p className="text-lg font-black text-white">{position.symbol}</p><p className="text-xs text-slate-400">{position.name}</p><p className={`text-sm font-bold ${text}`}>{formatPercent(position.pnlPct)}</p></div></div>;
}

function PositionHighlights({ winner, loser, count }: { winner: PositionSummary | null; loser: PositionSummary | null; count: number }) {
  if (count <= 1 || !winner || !loser) return null;
  return <div className="mb-7 grid grid-cols-2 gap-4"><Highlight position={winner} winner /><Highlight position={loser} winner={false} /></div>;
}

export default memo(PositionHighlights);
