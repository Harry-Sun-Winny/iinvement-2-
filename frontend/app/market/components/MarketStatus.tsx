"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock3 } from "lucide-react";
import { useTranslation } from "@/components/providers/I18nProvider";
import { formatAsOf } from "../utils";

interface MarketStatusProps {
  lastUpdatedAt?: string | null;
}

type SessionState = {
  label: string;
  tone: string;
  dot: string;
};

function getEasternParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return { weekday, totalMinutes: hour * 60 + minute };
}

function resolveSession(isVi: boolean, now: Date): SessionState {
  const { weekday, totalMinutes } = getEasternParts(now);
  const isWeekend = weekday === "Sat" || weekday === "Sun";

  if (isWeekend) {
    return {
      label: isVi ? "Đóng cửa cuối tuần" : "Weekend",
      tone: "border-white/10 bg-white/5 text-slate-300",
      dot: "bg-slate-400",
    };
  }

  if (totalMinutes < 240) {
    return {
      label: isVi ? "Ngoài giờ" : "After hours",
      tone: "border-violet-500/20 bg-violet-500/10 text-violet-200",
      dot: "bg-violet-400",
    };
  }

  if (totalMinutes < 570) {
    return {
      label: isVi ? "Trước giờ mở cửa" : "Pre-market",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-200",
      dot: "bg-amber-400",
    };
  }

  if (totalMinutes < 960) {
    return {
      label: isVi ? "Đang mở cửa" : "Open",
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
      dot: "bg-emerald-400",
    };
  }

  return {
    label: isVi ? "Ngoài giờ" : "After hours",
    tone: "border-violet-500/20 bg-violet-500/10 text-violet-200",
    dot: "bg-violet-400",
  };
}

export default function MarketStatus({ lastUpdatedAt }: MarketStatusProps) {
  const { language } = useTranslation();
  const isVi = language === "vi";
  // The prerendered page and hydration can belong to different sessions.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const session = useMemo(() => now ? resolveSession(isVi, now) : {
    label: "—",
    tone: "border-white/10 bg-white/5 text-slate-300",
    dot: "bg-slate-400",
  }, [isVi, now]);

  return (
    <Card className="border-white/10 bg-[#0e1620]">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/5 p-2 text-slate-200">
            <Clock3 className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              {isVi ? "Phiên Mỹ" : "US Session"}
            </h3>
            <p className="text-sm text-white">
              {isVi ? "09:30 - 16:00 ET, theo dõi thêm pre-market và after-hours" : "09:30 - 16:00 ET, plus pre-market and after hours"}
            </p>
            <p className="text-xs text-slate-400">
              {isVi ? "Lần cập nhật gần nhất:" : "Last refreshed:"} {formatAsOf(lastUpdatedAt)}
            </p>
          </div>
        </div>

        <Badge className={`inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold ${session.tone}`}>
          <span className={`h-2 w-2 rounded-full ${session.dot}`} />
          {session.label}
        </Badge>
      </CardContent>
    </Card>
  );
}
