"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, Clock3, Download, FileSpreadsheet, RefreshCw, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarFilters from "@/components/calendar/CalendarFilters";
import CalendarTable from "@/components/calendar/CalendarTable";
import WatchlistImpact from "@/components/calendar/WatchlistImpact";
import { useCalendar } from "@/hooks/useCalendar";
import { exportCalendarCsv, exportCalendarExcel } from "@/services/calendar.service";
import { CALENDAR_RANGES, CALENDAR_TABS } from "@/types/calendar";

const MarketHeatGauge = dynamic(() => import("@/components/calendar/MarketHeatGauge"), { ssr: false, loading: () => <Skeleton className="h-72 bg-white/[0.06]" /> });
const EventTimeline = dynamic(() => import("@/components/calendar/EventTimeline"), { ssr: false, loading: () => <Skeleton className="h-72 bg-white/[0.06]" /> });

export default function MarketCalendarPage() {
  const calendar = useCalendar();

  useEffect(() => {
    if (!localStorage.getItem("token")) window.location.href = "/login";
  }, []);

  const nextMajorEvent = useMemo(() => [...calendar.events]
    .sort((a, b) => {
      const impact = { High: 3, Medium: 2, Low: 1 };
      return impact[b.impact] - impact[a.impact] || `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);
    })[0], [calendar.events]);

  const summaryCards = [
    { label: "Economic Events", value: calendar.summary.economic, icon: TrendingUp, tone: "text-cyan-300" },
    { label: "Earnings Reports", value: calendar.summary.earnings, icon: Building2, tone: "text-violet-300" },
    { label: "Dividends", value: calendar.summary.dividends, icon: CalendarDays, tone: "text-emerald-300" },
    { label: "IPOs", value: calendar.summary.ipo, icon: FileSpreadsheet, tone: "text-amber-300" },
  ];

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050816]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.location.href = "/"} aria-label="Quay lại Dashboard"><ArrowLeft className="h-4 w-4" /></Button>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400 text-slate-950"><CalendarDays className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-white">Market Calendar</h1>
              <p className="truncate text-xs text-slate-500">Economic, earnings and corporate events desk</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden border-white/10 text-slate-400 md:inline-flex">{calendar.source || "Loading source"}</Badge>
            <Button variant="outline" size="sm" onClick={calendar.refresh} disabled={calendar.loading}><RefreshCw className={`h-4 w-4 ${calendar.loading ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Refresh</span></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 lg:px-8">
        <Card className="border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,.12),transparent_30%),linear-gradient(135deg,#0f172a,#070b16)]">
          <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-end lg:justify-between lg:p-7">
            <div>
              <Badge className="bg-cyan-500/15 text-cyan-300">Institutional Event Monitor</Badge>
              <h2 className="mt-4 max-w-3xl text-2xl font-semibold text-white lg:text-4xl">Ngày mai có sự kiện nào khiến danh mục biến động mạnh?</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">Theo dõi sự kiện vĩ mô, báo cáo thu nhập, cổ tức và đáo hạn có thể tác động trực tiếp tới Watchlist.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => exportCalendarCsv(calendar.filteredEvents)} disabled={!calendar.filteredEvents.length}><Download className="h-4 w-4" />CSV</Button>
              <Button variant="outline" size="sm" onClick={() => exportCalendarExcel(calendar.filteredEvents)} disabled={!calendar.filteredEvents.length}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Today's calendar summary">
          {summaryCards.map((item, index) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} whileHover={{ y: -2 }}>
              <Card className="h-full border-white/10 bg-white/[0.035]">
                <CardContent className="flex items-center justify-between p-4">
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-semibold text-white">{item.value}</p></div>
                  <div className={`rounded-lg border border-white/10 bg-slate-950/70 p-2.5 ${item.tone}`}><item.icon className="h-5 w-5" /></div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
          <Card className="border-white/10 bg-white/[0.035]">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-red-400" />Next Major Event</CardTitle><CardDescription>Sự kiện có điểm biến động dự kiến cao nhất trong khoảng đã chọn.</CardDescription></CardHeader>
            <CardContent>
              {nextMajorEvent ? <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xl font-semibold text-white">{nextMajorEvent.event}</p><p className="mt-1 text-sm text-slate-400">{nextMajorEvent.country} · {nextMajorEvent.date} · {nextMajorEvent.time}</p><div className="mt-3 flex flex-wrap gap-2">{nextMajorEvent.affectedSectors.map(sector => <Badge key={sector} variant="outline" className="border-white/10">{sector}</Badge>)}</div></div><div className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-center"><p className="text-xs uppercase tracking-wide text-red-300">Expected Volatility</p><p className="mt-1 text-3xl font-semibold text-white">{nextMajorEvent.volatilityScore}</p><p className="text-xs text-red-300">High Impact</p></div></div> : <p className="text-sm text-slate-500">Không có sự kiện lớn trong khoảng này.</p>}
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.035]">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4 text-cyan-300" />Data Window</CardTitle><CardDescription>Phạm vi dữ liệu đang phân tích.</CardDescription></CardHeader>
            <CardContent><p className="text-lg font-semibold text-white">{calendar.window.from} → {calendar.window.to}</p><p className="mt-2 text-sm text-slate-500">Updated {calendar.updatedAt ? new Date(calendar.updatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "—"}</p></CardContent>
          </Card>
        </section>

        <Card className="border-white/10 bg-white/[0.035]">
          <CardContent className="space-y-4 p-4">
            <Tabs value={calendar.category} onValueChange={value => calendar.setCategory(value as typeof calendar.category)}>
              <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto bg-slate-950/60 p-1">
                {CALENDAR_TABS.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 px-3 py-2">{tab.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Date range">
              {CALENDAR_RANGES.map(item => <Button key={item.value} variant={calendar.range === item.value ? "default" : "outline"} size="sm" className="shrink-0" onClick={() => calendar.setRange(item.value)}>{item.label}</Button>)}
            </div>
            {calendar.range === "custom" && <div className="grid gap-2 sm:max-w-lg sm:grid-cols-2"><Input type="date" value={calendar.customFrom} onChange={event => calendar.setCustomFrom(event.target.value)} aria-label="Từ ngày" /><Input type="date" value={calendar.customTo} min={calendar.customFrom} onChange={event => calendar.setCustomTo(event.target.value)} aria-label="Đến ngày" /></div>}
            <CalendarFilters search={calendar.search} onSearchChange={calendar.setSearch} filters={calendar.filters} onFilterChange={calendar.updateFilter} onReset={calendar.resetFilters} countries={calendar.options.countries} sectors={calendar.options.sectors} eventTypes={calendar.options.eventTypes} />
          </CardContent>
        </Card>

        {calendar.error && <Card className="border-red-500/20 bg-red-500/10"><CardContent className="p-4 text-sm text-red-300">{calendar.error}</CardContent></Card>}

        <motion.div key={calendar.category} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border-white/10 bg-white/[0.035]">
            <CardHeader className="border-b border-white/10"><CardTitle>{CALENDAR_TABS.find(tab => tab.value === calendar.category)?.label}</CardTitle><CardDescription>{calendar.filteredEvents.length} sự kiện sau bộ lọc · Click tiêu đề Time/Impact/Country để sort.</CardDescription></CardHeader>
            <CalendarTable category={calendar.category} events={calendar.paginatedEvents} loading={calendar.loading} page={calendar.page} pageCount={calendar.pageCount} total={calendar.filteredEvents.length} onPageChange={calendar.setPage} onSort={calendar.toggleSort} />
          </Card>
        </motion.div>

        <section className="grid gap-4 xl:grid-cols-3">
          <MarketHeatGauge value={calendar.marketHeat} />
          <div className="xl:col-span-2"><WatchlistImpact events={calendar.watchlistEvents} /></div>
        </section>
        <EventTimeline events={calendar.filteredEvents} />
      </main>
    </div>
  );
}
