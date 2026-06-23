"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketCalendarEvent } from "@/types/calendar";

function EventTimeline({ events }: { events: MarketCalendarEvent[] }) {
  const timeline = [...events].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 8);
  return (
    <Card className="h-full border-white/10 bg-white/[0.035]">
      <CardHeader>
        <CardTitle className="text-base">Event Timeline</CardTitle>
        <CardDescription>Các mốc quan trọng sắp tới theo thứ tự thời gian.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0 before:absolute before:bottom-2 before:left-[51px] before:top-2 before:w-px before:bg-white/10">
          {timeline.map(event => (
            <div key={event.id} className="relative flex gap-4 py-2.5">
              <time className="w-10 shrink-0 pt-0.5 text-xs font-medium text-slate-400">{event.time}</time>
              <span className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-[#090d1a] ${event.impact === "High" ? "bg-red-500" : event.impact === "Medium" ? "bg-amber-400" : "bg-emerald-500"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{event.symbol ? `${event.symbol} · ` : ""}{event.event}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{event.date}</span><span>{event.countryCode}</span>
                  <Badge variant="outline" className="h-5 border-white/10 text-[10px]">Volatility {event.volatilityScore}/100</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(EventTimeline);
