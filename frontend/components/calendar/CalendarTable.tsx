"use client";

import { memo, ReactNode } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCategory, CalendarSortKey, MarketCalendarEvent } from "@/types/calendar";
import { CalendarEmptyState, CalendarSkeleton } from "./CalendarSkeleton";

interface CalendarTableProps {
  category: CalendarCategory;
  events: MarketCalendarEvent[];
  loading: boolean;
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
  onSort: (key: CalendarSortKey) => void;
}

function compact(value?: number | null, currency = true) {
  if (value == null || !Number.isFinite(value)) return "—";
  const prefix = currency ? "$" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${prefix}${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(2)}M`;
  return `${prefix}${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function ImpactBadge({ impact }: { impact: MarketCalendarEvent["impact"] }) {
  return (
    <Badge variant="outline" className={impact === "High" ? "border-red-500/30 bg-red-500/10 text-red-300" : impact === "Medium" ? "border-amber-400/30 bg-amber-400/10 text-amber-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}>
      {impact}
    </Badge>
  );
}

function SortHead({ label, sortKey, onSort, align = "left" }: { label: string; sortKey: CalendarSortKey; onSort: (key: CalendarSortKey) => void; align?: "left" | "right" }) {
  return <TableHead className={align === "right" ? "text-right" : ""}><button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1.5 hover:text-white" aria-label={`Sort by ${label}`}>{label}<ArrowUpDown className="h-3 w-3" /></button></TableHead>;
}

function headers(category: CalendarCategory, onSort: (key: CalendarSortKey) => void): ReactNode {
  if (category === "earnings") return <><SortHead label="Time" sortKey="time" onSort={onSort} /><TableHead>Symbol</TableHead><TableHead>Company</TableHead><TableHead>Session</TableHead><TableHead className="text-right">EPS Est</TableHead><TableHead className="text-right">EPS Actual</TableHead><TableHead className="text-right">Revenue Est</TableHead><TableHead className="text-right">Revenue Actual</TableHead><TableHead className="text-right">Surprise</TableHead></>;
  if (category === "dividends") return <><TableHead>Symbol</TableHead><TableHead>Company</TableHead><TableHead>Ex-Date</TableHead><TableHead>Pay Date</TableHead><TableHead className="text-right">Dividend</TableHead><TableHead className="text-right">Yield</TableHead></>;
  if (category === "splits") return <><TableHead>Symbol</TableHead><TableHead>Company</TableHead><TableHead>Ratio</TableHead><TableHead>Ex-Date</TableHead><SortHead label="Impact" sortKey="impact" onSort={onSort} /></>;
  if (category === "ipo") return <><TableHead>Company</TableHead><TableHead>Ticker</TableHead><TableHead>Exchange</TableHead><TableHead>IPO Date</TableHead><TableHead>Price Range</TableHead><TableHead>Sector</TableHead><SortHead label="Impact" sortKey="impact" onSort={onSort} /></>;
  if (category === "options") return <><SortHead label="Time" sortKey="time" onSort={onSort} /><TableHead>Event</TableHead><TableHead>Date</TableHead><SortHead label="Impact" sortKey="impact" onSort={onSort} /><TableHead>Affected Sectors</TableHead></>;
  if (category === "holidays") return <><TableHead>Date</TableHead><TableHead>Holiday</TableHead><SortHead label="Country" sortKey="country" onSort={onSort} /><TableHead>Exchange</TableHead><TableHead>Status</TableHead></>;
  return <><SortHead label="Time" sortKey="time" onSort={onSort} /><TableHead>Event</TableHead><SortHead label="Country" sortKey="country" onSort={onSort} /><SortHead label="Impact" sortKey="impact" onSort={onSort} /><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Forecast</TableHead><TableHead className="text-right">Previous</TableHead></>;
}

function cells(category: CalendarCategory, event: MarketCalendarEvent): ReactNode {
  if (category === "earnings") return <><TableCell><span className="font-medium text-white">{event.time}</span><span className="block text-xs text-slate-500">{event.date}</span></TableCell><TableCell className="font-semibold text-cyan-300">{event.symbol}</TableCell><TableCell>{event.company}</TableCell><TableCell><Badge variant="outline" className="border-white/10">{event.session}</Badge></TableCell><TableCell className="text-right">{compact(event.epsEstimate, false)}</TableCell><TableCell className="text-right">{compact(event.epsActual, false)}</TableCell><TableCell className="text-right">{compact(event.revenueEstimate)}</TableCell><TableCell className="text-right">{compact(event.revenueActual)}</TableCell><TableCell className={`text-right font-medium ${(event.surprise ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{event.surprise == null ? "—" : `${event.surprise >= 0 ? "+" : ""}${event.surprise.toFixed(2)}%`}</TableCell></>;
  if (category === "dividends") return <><TableCell className="font-semibold text-cyan-300">{event.symbol}</TableCell><TableCell>{event.company}</TableCell><TableCell>{event.exDate}</TableCell><TableCell>{event.payDate}</TableCell><TableCell className="text-right text-emerald-400">{compact(event.dividend)}</TableCell><TableCell className="text-right">{event.yield == null ? "—" : `${event.yield.toFixed(2)}%`}</TableCell></>;
  if (category === "splits") return <><TableCell className="font-semibold text-cyan-300">{event.symbol}</TableCell><TableCell>{event.company}</TableCell><TableCell className="font-medium text-white">{event.ratio}</TableCell><TableCell>{event.exDate}</TableCell><TableCell><ImpactBadge impact={event.impact} /></TableCell></>;
  if (category === "ipo") return <><TableCell className="font-medium text-white">{event.company}</TableCell><TableCell className="font-semibold text-cyan-300">{event.symbol}</TableCell><TableCell>{event.exchange}</TableCell><TableCell>{event.date}</TableCell><TableCell>{event.priceRange}</TableCell><TableCell>{event.sector}</TableCell><TableCell><ImpactBadge impact={event.impact} /></TableCell></>;
  if (category === "options") return <><TableCell><span className="font-medium text-white">{event.time}</span></TableCell><TableCell>{event.event}</TableCell><TableCell>{event.date}</TableCell><TableCell><ImpactBadge impact={event.impact} /></TableCell><TableCell>{event.affectedSectors.join(", ")}</TableCell></>;
  if (category === "holidays") return <><TableCell>{event.date}</TableCell><TableCell className="font-medium text-white">{event.event}</TableCell><TableCell><span className="mr-2 rounded bg-white/[0.06] px-1.5 py-0.5 text-xs">{event.countryCode}</span>{event.country}</TableCell><TableCell>{event.exchange}</TableCell><TableCell><Badge variant="outline" className="border-slate-500/30 text-slate-300">Closed</Badge></TableCell></>;
  return <><TableCell><span className="font-medium text-white">{event.time}</span><span className="block text-xs text-slate-500">{event.date}</span></TableCell><TableCell><p className="font-medium text-white">{event.event}</p><p className="mt-0.5 text-xs text-slate-500">{event.eventType}</p></TableCell><TableCell><span className="mr-2 rounded bg-white/[0.06] px-1.5 py-0.5 text-xs">{event.countryCode}</span>{event.country}</TableCell><TableCell><ImpactBadge impact={event.impact} /></TableCell><TableCell className="text-right font-medium text-white">{event.actual ?? "—"}</TableCell><TableCell className="text-right">{event.forecast ?? "—"}</TableCell><TableCell className="text-right text-slate-400">{event.previous ?? "—"}</TableCell></>;
}

function CalendarTable({ category, events, loading, page, pageCount, total, onPageChange, onSort }: CalendarTableProps) {
  if (loading) return <CalendarSkeleton />;
  if (!events.length) return <CalendarEmptyState />;

  return (
    <div>
      <div className="max-h-[620px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[#0b1020]">
            <TableRow className="border-white/10 hover:bg-transparent">{headers(category, onSort)}</TableRow>
          </TableHeader>
          <TableBody>
            {events.map(event => <TableRow key={event.id} className="border-white/[0.07] transition-colors hover:bg-cyan-400/[0.035]">{cells(category, event)}</TableRow>)}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>{total} sự kiện · Trang {page}/{pageCount}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Trang trước"><ChevronLeft className="h-4 w-4" />Trước</Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page >= pageCount} aria-label="Trang sau">Sau<ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

export default memo(CalendarTable);
