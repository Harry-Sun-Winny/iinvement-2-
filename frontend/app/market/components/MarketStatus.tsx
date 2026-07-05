import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock3 } from "lucide-react";

export default function MarketStatus() {
  return (
    <Card className="antigravity-panel border-white/5 bg-white/[0.01]">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
            <Clock3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">US Market Status</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Trading hours: 09:30 - 16:00 EST</p>
          </div>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 font-bold text-[10px]">
          OPEN
        </Badge>
      </CardContent>
    </Card>
  );
}
