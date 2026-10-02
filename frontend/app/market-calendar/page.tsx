"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, Clock3, Download, FileSpreadsheet, RefreshCw, TrendingUp } from "lucide-react";

import Alert from "@/components/ui/Alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/providers/I18nProvider";
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
  const { t } = useTranslation();
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
    { label: t("calendar.economic"), value: calendar.summary.economic, icon: TrendingUp, tone: "text-cyan-300" },
    { label: t("calendar.earnings"), value: calendar.summary.earnings, icon: Building2, tone: "text-violet-300" },
    { label: t("calendar.dividends"), value: calendar.summary.dividends, icon: CalendarDays, tone: "text-emerald-300" },
    { label: t("calendar.ipo"), value: calendar.summary.ipo, icon: FileSpreadsheet, tone: "text-amber-300" },
  ];

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <main className="w-[820px] shrink-0 border-r border-white/5 h-full overflow-y-auto p-6 space-y-6">
        {calendar.error && (
          <Alert variant="error">
            {calendar.error}
          </Alert>
        )}

        <div className="antigravity-panel antigravity-float-slow overflow-hidden">
          {/* Embedded Header Controls */}
          <div className="flex flex-col border-b border-white/5 p-6 gap-4 bg-white/[0.01]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="shrink-0 text-sm font-bold text-white tracking-widest uppercase">{t("calendar.title")}</h2>

                {/* CSV / Excel Download Actions in Header */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => exportCalendarCsv(calendar.filteredEvents)} disabled={!calendar.filteredEvents.length}>
                    <Download className="h-3 w-3 mr-1" /> CSV
                  </Button>
                  <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={() => exportCalendarExcel(calendar.filteredEvents)} disabled={!calendar.filteredEvents.length}>
                    <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
                  </Button>
                  <Button variant="ghost" size="sm" className="antigravity-btn text-xs" onClick={calendar.refresh} disabled={calendar.loading}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${calendar.loading ? "animate-spin" : ""}`} /> {t("common.refresh")}
                  </Button>
                </div>
              </div>

              {/* Category switcher: full-width row so every label remains readable */}
              <div role="tablist" aria-label={t("calendar.categoryTabs")} className="flex w-full min-w-0 gap-1 overflow-x-auto rounded-lg border border-white/5 bg-white/5 p-1 no-scrollbar">
                  {CALENDAR_TABS.map(tab => (
                    <button
                      key={tab.value}
                      type="button"
                      role="tab"
                      aria-selected={calendar.category === tab.value}
                      onClick={() => calendar.setCategory(tab.value)}
                      className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-300 ${
                        calendar.category === tab.value
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {t(tab.labelKey)}
                    </button>
                  ))}
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
            {calendar.category === "economic" ? (
              <div className="w-full h-[650px] rounded-lg overflow-hidden border border-white/5 bg-black/20">
                <iframe
                  src="https://sslecal2.forexprostools.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=110,43,17,42,5,22,12,39,14,10,35,4,36,122,25,26,41,48,37,121,9,7,11,8,46,6,107,51,52,53,38,72,45,15,84,75,93,56,80,59,92,102,60,97,68,96,89,85,87,19,90,111,113,116,117,119,125,123,124,130,129,138,139,143,142,145,147,159,152,155,160,172,163,174,180,188,187,191,192,201,199,203,205,212,213,214,217,222,224,226,227,228,230,233,235,234,236,238,240,239,243,245,242,246,247,249,250,251,255,254,258,260,261,262,263,264,265,266,270,271,273,277,276,275,278,280,284,285,286,287,288,290,292,294,295,296,299,298,300,301,302,305,306,308,310,311,313,314,315,316,317,318,321,324,325,326,327,330,332,333,334,335,336,339,340,342,345,346,348,349,350,351,353,354,357,358,360,361,363,364,367,369,370,373,374,375,376,378,380,381,382,384,385,387,388,390,392,393,394,396,397,398,400,401,403,404,406,408,410,412,414,416,418,420,422,424,426,428,430,432,434,436,438,440,442,444,446,448,450,452,454,456,458,460,462,464,466,468,470,472,474,476,478,480,482,484,486,488,490,492,494,496,498,500,502,504,506,508,510,512,514,516,518,520,522,524,526,528,530,532,534,536,538,540,542,544,546,548,550,552,554,556,558,560,562,564,566,568,570,572,574,576,578,580,582,584,586,588,590,592,594,596,598,600,602,604,606,608,610,612,614,616,618,620,622,624,626,628,630,632,634,636,638,640,642,644,646,648,650,652,654,656,658,660,662,664,666,670,668,672,674,676,678,680,682,684,686,688,690,692,694,696,698,700,702,704,706,708,710,712,714,716,718,720,722,724,726,728,730,732,734,736,738,740,742,744,746,748,750,752,754,756,758,760,762,764,766,768,770,772,774,776,778,780,782,784,786,788,790,792,794,796,798,800,802,804,806,808,810,812,814,816,818,820,822,824,826,828,830,832,834,836,838,840,842,844,846,848,850,852,854,856,858,860,862,864,866,868,870,872,874,876,878,880,882,884,886,888,890,892,894,896,898,900,902,904,906,908,910,912,914,916,918,920,922,924,926,928,930,932,934,936,938,940,942,944,946,948,950,952,954,956,958,960,962,964,966,968,970,972,974,976,978,980,982,984,986,988,990,992,994,996,998,1000&calType=day&timeZone=55&lang=1"
                  width="100%"
                  height="100%"
                  style={{ filter: "invert(90%) hue-rotate(180deg) brightness(95%) contrast(110%)", border: "0" }}
                />
              </div>
            ) : (
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
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-4">
          Institutional macro analysis console · Nguồn: <span className={calendar.source === "Curated fallback" ? "text-amber-400/60" : "text-emerald-400/80"}>{calendar.source || "—"}</span> · Updated {calendar.updatedAt ? new Date(calendar.updatedAt).toLocaleTimeString("vi-VN") : "—"}
        </p>
      </main>
      
      {/* Right Analytics Workspace */}
      <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 z-10">
        <MarketHeatGauge value={calendar.marketHeat} />
        <WatchlistImpact events={calendar.events} />
        <EventTimeline events={calendar.events} />
      </div>
    </div>
  );
}
