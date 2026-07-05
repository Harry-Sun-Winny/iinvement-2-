"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, Clock3, Download, FileSpreadsheet, RefreshCw, TrendingUp } from "lucide-react";

import Alert from "@/components/ui/Alert";
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
    <div className="flex flex-1 h-full overflow-hidden">
      <main className="w-[800px] shrink-0 border-r border-white/5 h-full overflow-y-auto p-6 space-y-6">
        {calendar.error && (
          <Alert variant="error">
            {calendar.error}
          </Alert>
        )}

        <div className="antigravity-panel antigravity-float-slow overflow-hidden">
          {/* Embedded Header Controls */}
          <div className="flex flex-col border-b border-white/5 p-6 gap-4 bg-white/[0.01]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">Lịch thị trường</h2>
                
                {/* Category switcher tabs inside header */}
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                  {CALENDAR_TABS.map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => calendar.setCategory(tab.value as any)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-300 ${
                        calendar.category === tab.value
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CSV / Excel Download Actions in Header */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => exportCalendarCsv(calendar.filteredEvents)} disabled={!calendar.filteredEvents.length}>
                  <Download className="h-3 w-3 mr-1" /> CSV
                </Button>
                <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => exportCalendarExcel(calendar.filteredEvents)} disabled={!calendar.filteredEvents.length}>
                  <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
                </Button>
                <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={calendar.refresh} disabled={calendar.loading}>
                  <RefreshCw className={`h-3 w-3 mr-1 ${calendar.loading ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </div>
            </div>

            {/* Date Filters & Search inside Header */}
            <div className="flex flex-col gap-3 mt-2 border-t border-white/5 pt-4">
              <div className="flex flex-wrap gap-1.5" aria-label="Date range">
                {CALENDAR_RANGES.map(item => (
                  <button
                    key={item.value}
                    onClick={() => calendar.setRange(item.value)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 ${
                      calendar.range === item.value
                        ? "bg-white/10 text-white shadow-sm border border-white/10"
                        : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {calendar.range === "custom" && (
                <div className="grid gap-2 sm:max-w-lg sm:grid-cols-2 mt-2">
                  <Input type="date" value={calendar.customFrom} onChange={event => calendar.setCustomFrom(event.target.value)} aria-label="Từ ngày" className="antigravity-input text-xs" />
                  <Input type="date" value={calendar.customTo} min={calendar.customFrom} onChange={event => calendar.setCustomTo(event.target.value)} aria-label="Đến ngày" className="antigravity-input text-xs" />
                </div>
              )}

              <div className="mt-2">
                <CalendarFilters
                  search={calendar.search}
                  onSearchChange={calendar.setSearch}
                  filters={calendar.filters}
                  onFilterChange={calendar.updateFilter}
                  onReset={calendar.resetFilters}
                  countries={calendar.options.countries}
                  sectors={calendar.options.sectors}
                  eventTypes={calendar.options.eventTypes}
                />
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="p-6">
            <CalendarTable
              category={calendar.category}
              events={calendar.paginatedEvents}
              loading={calendar.loading}
              page={calendar.page}
              pageCount={calendar.pageCount}
              total={calendar.filteredEvents.length}
              onPageChange={calendar.setPage}
              onSort={calendar.toggleSort}
            />
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-4">
          Institutional macro analysis console · Updated {calendar.updatedAt ? new Date(calendar.updatedAt).toLocaleTimeString("vi-VN") : "—"}
        </p>
      </main>
      <div className="flex-1 h-full overflow-y-auto p-6 bg-transparent" />
    </div>
  );
}
