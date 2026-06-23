"use client";

import { memo } from "react";
import { AlertTriangle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketCalendarEvent } from "@/types/calendar";

function WatchlistImpact({ events }: { events: MarketCalendarEvent[] }) {
  return (
    <Card className="h-full border-white/10 bg-white/[0.035]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4 text-cyan-300" />Watchlist Impact</CardTitle>
        <CardDescription>{events.length} sự kiện có thể ảnh hưởng mã đang theo dõi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">Chưa có sự kiện trùng với Watchlist trong khoảng này.</div>
        ) : events.slice(0, 6).map(event => (
          <div key={event.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-slate-950/45 p-3 transition-colors hover:border-cyan-400/25">
            <div className="flex min-w-0 gap-3">
              <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${event.impact === "High" ? "text-red-400" : "text-amber-300"}`} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{event.symbol} · {event.event}</p>
                <p className="mt-1 text-xs text-slate-500">{event.date} {event.time} · {event.session || event.eventType}</p>
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 border-white/10">{event.impact}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default memo(WatchlistImpact);
