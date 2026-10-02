"use client";

import { memo, ReactNode } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCategory, CalendarSortKey, MarketCalendarEvent } from "@/types/calendar";
import { CalendarEmptyState, CalendarSkeleton } from "./CalendarSkeleton";
import { useTranslation } from "@/components/providers/I18nProvider";

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
  return `${prefix}${Number(value.toFixed(2))}`;
}

const KNOWN_COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  AMZN: "Amazon.com, Inc.",
  AVGO: "Broadcom Inc.",
  BCS: "Barclays PLC",
  CARR: "Carrier Global Corporation",
  COST: "Costco Wholesale Corporation",
  GOOGL: "Alphabet Inc.",
  GSK: "GSK plc",
  JPM: "JPMorgan Chase & Co.",
  META: "Meta Platforms, Inc.",
  MSFT: "Microsoft Corporation",
  NFLX: "Netflix, Inc.",
  NVDA: "NVIDIA Corporation",
  PFE: "Pfizer Inc.",
  PLTR: "Palantir Technologies Inc.",
  TSM: "Taiwan Semiconductor Manufacturing",
  TSLA: "Tesla, Inc.",
};

export function getCompanyDisplayName(event: Pick<MarketCalendarEvent, "company" | "symbol" | "event">) {
  const symbol = event.symbol?.trim().toUpperCase() ?? "";
  const company = event.company?.trim();
  if (company && company.toUpperCase() !== symbol) return company;
  if (symbol && KNOWN_COMPANY_NAMES[symbol]) return KNOWN_COMPANY_NAMES[symbol];
  const eventName = event.event?.replace(/\s+(Quarterly Earnings|Earnings|Dividend Ex-Date|Stock Split|IPO)$/i, "").trim();
  return eventName || company || symbol || "—";
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

function headers(category: CalendarCategory, onSort: (key: CalendarSortKey) => void, t: any): ReactNode {
  if (category === "earnings") return <><SortHead label={t("calendar.time")} sortKey="time" onSort={onSort} /><TableHead>{t("calendar.symbol")}</TableHead><TableHead>{t("watchlist.companyName")}</TableHead><TableHead>{t("calendar.session")}</TableHead><TableHead className="text-right">{t("calendar.epsEstimated")}</TableHead><TableHead className="text-right">{t("calendar.epsActual")}</TableHead><TableHead className="text-right">{t("calendar.revenueEstimated")}</TableHead><TableHead className="text-right">{t("calendar.revenueActual")}</TableHead><TableHead className="text-right">{t("calendar.surprise")}</TableHead></>;
  if (category === "dividends") return <><TableHead>{t("calendar.symbol")}</TableHead><TableHead>{t("watchlist.companyName")}</TableHead><TableHead>{t("calendar.exDate")}</TableHead><TableHead>{t("calendar.payDate")}</TableHead><TableHead className="text-right">{t("calendar.amount")}</TableHead><TableHead className="text-right">{t("calendar.yield")}</TableHead></>;
  if (category === "splits") return <><TableHead>{t("calendar.symbol")}</TableHead><TableHead>{t("watchlist.companyName")}</TableHead><TableHead>{t("calendar.ratio")}</TableHead><TableHead>{t("calendar.exDate")}</TableHead><SortHead label={t("calendar.impact")} sortKey="impact" onSort={onSort} /></>;
  if (category === "ipo") return <><TableHead>{t("watchlist.companyName")}</TableHead><TableHead>{t("calendar.symbol")}</TableHead><TableHead>{t("calendar.exchange")}</TableHead><TableHead>{t("calendar.reportDate")}</TableHead><TableHead>{t("calendar.priceRange")}</TableHead><TableHead>{t("calendar.sector")}</TableHead><SortHead label={t("calendar.impact")} sortKey="impact" onSort={onSort} /></>;
  if (category === "options") return <><SortHead label={t("calendar.time")} sortKey="time" onSort={onSort} /><TableHead>{t("calendar.event")}</TableHead><TableHead>{t("common.date")}</TableHead><SortHead label={t("calendar.impact")} sortKey="impact" onSort={onSort} /><TableHead>{t("calendar.affectedSectors")}</TableHead></>;
  if (category === "holidays") return <><TableHead>{t("common.date")}</TableHead><TableHead>{t("calendar.holiday")}</TableHead><SortHead label={t("calendar.country")} sortKey="country" onSort={onSort} /><TableHead>{t("calendar.exchange")}</TableHead><TableHead>{t("common.status")}</TableHead></>;
  return <><SortHead label={t("calendar.time")} sortKey="time" onSort={onSort} /><TableHead>{t("calendar.event")}</TableHead><SortHead label={t("calendar.country")} sortKey="country" onSort={onSort} /><SortHead label={t("calendar.impact")} sortKey="impact" onSort={onSort} /><TableHead className="text-right">{t("calendar.actual")}</TableHead><TableHead className="text-right">{t("calendar.forecast")}</TableHead><TableHead className="text-right">{t("calendar.previous")}</TableHead></>;
}

function cells(category: CalendarCategory, event: MarketCalendarEvent, t: any): ReactNode {
  const companyName = getCompanyDisplayName(event);
  if (category === "earnings") return <><TableCell><span className="font-medium text-white">{event.time}</span><span className="block text-xs text-slate-550">{event.date}</span></TableCell><TableCell className="font-semibold text-cyan-300">{event.symbol}</TableCell><TableCell className="font-medium text-white">{companyName}</TableCell><TableCell><Badge variant="outline" className="border-white/10">{event.session}</Badge></TableCell><TableCell className="text-right">{compact(event.epsEstimate, false)}</TableCell><TableCell className="text-right">{compact(event.epsActual, false)}</TableCell><TableCell className="text-right">{compact(event.revenueEstimate)}</TableCell><TableCell className="text-right">{compact(event.revenueActual)}</TableCell><TableCell className={`text-right font-medium ${(event.surprise ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{event.surprise == null ? "—" : `${event.surprise >= 0 ? "+" : ""}${event.surprise.toFixed(2)}%`}</TableCell></>;
  if (category === "dividends") return <><TableCell className="font-semibold text-cyan-300">{event.symbol}</TableCell><TableCell className="font-medium text-white">{companyName}</TableCell><TableCell>{event.exDate}</TableCell><TableCell>{event.payDate}</TableCell><TableCell className="text-right text-emerald-400">{compact(event.dividend)}</TableCell><TableCell className="text-right">{event.yield == null ? "—" : `${event.yield.toFixed(2)}%`}</TableCell></>;
  if (category === "splits") return <><TableCell className="font-semibold text-cyan-300">{event.symbol}</TableCell><TableCell className="font-medium text-white">{companyName}</TableCell><TableCell className="font-medium text-white">{event.ratio}</TableCell><TableCell>{event.exDate}</TableCell><TableCell><ImpactBadge impact={event.impact} /></TableCell></>;
  if (category === "ipo") return <><TableCell className="font-medium text-white">{companyName}</TableCell><TableCell className="font-semibold text-cyan-300">{event.symbol}</TableCell><TableCell>{event.exchange}</TableCell><TableCell>{event.date}</TableCell><TableCell>{event.priceRange}</TableCell><TableCell>{event.sector}</TableCell><TableCell><ImpactBadge impact={event.impact} /></TableCell></>;
  if (category === "options") return <><TableCell><span className="font-medium text-white">{event.time}</span></TableCell><TableCell>{event.event}</TableCell><TableCell>{event.date}</TableCell><TableCell><ImpactBadge impact={event.impact} /></TableCell><TableCell>{event.affectedSectors.join(", ")}</TableCell></>;
  if (category === "holidays") return <><TableCell>{event.date}</TableCell><TableCell className="font-medium text-white">{event.event}</TableCell><TableCell><span className="mr-2 rounded bg-white/[0.06] px-1.5 py-0.5 text-xs">{event.countryCode}</span>{event.country}</TableCell><TableCell>{event.exchange}</TableCell><TableCell><Badge variant="outline" className="border-slate-500/30 text-slate-300">{t("calendar.closed")}</Badge></TableCell></>;
  return <><TableCell><span className="font-medium text-white">{event.time}</span><span className="block text-xs text-slate-555">{event.date}</span></TableCell><TableCell><p className="font-medium text-white">{event.event}</p><p className="mt-0.5 text-xs text-slate-500">{event.eventType}</p></TableCell><TableCell><span className="mr-2 rounded bg-white/[0.06] px-1.5 py-0.5 text-xs">{event.countryCode}</span>{event.country}</TableCell><TableCell><ImpactBadge impact={event.impact} /></TableCell><TableCell className="text-right font-medium text-white">{event.actual ?? "—"}</TableCell><TableCell className="text-right">{event.forecast ?? "—"}</TableCell><TableCell className="text-right text-slate-400">{event.previous ?? "—"}</TableCell></>;
}

function CalendarTable({ category, events, loading, page, pageCount, total, onPageChange, onSort }: CalendarTableProps) {
  const { t } = useTranslation();
  if (loading) return <CalendarSkeleton />;
  if (!events.length) return <CalendarEmptyState />;

  return (
    <div>
      <div className="max-h-[620px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[var(--card)]">
            <TableRow className="border-white/5 hover:bg-transparent">{headers(category, onSort, t)}</TableRow>
          </TableHeader>
          <TableBody>
            {events.map(event => <TableRow key={event.id} className="border-white/[0.07] transition-colors hover:bg-cyan-400/[0.035]">{cells(category, event, t)}</TableRow>)}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>{t("calendar.eventsCount", { count: total, page, pageCount })}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} aria-label={t("calendar.prev")}><ChevronLeft className="h-4 w-4" />{t("calendar.prev")}</Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page >= pageCount} aria-label={t("calendar.next")}>{t("calendar.next")}<ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

export default memo(CalendarTable);
