"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { getWatchlistItems, getWatchlists } from "@/app/lib/api";
import { getMarketCalendar } from "@/services/calendar.service";
import {
  CalendarCategory,
  CalendarDateWindow,
  CalendarFiltersState,
  CalendarRange,
  CalendarSortKey,
  MarketCalendarEvent,
  SortDirection,
} from "@/types/calendar";

const PAGE_SIZE = 10;
const emptyFilters: CalendarFiltersState = { country: "all", impact: "all", sector: "all", eventType: "all" };

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shift(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getWindow(range: CalendarRange, customFrom: string, customTo: string): CalendarDateWindow {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  if (range === "yesterday") return { from: iso(shift(utcToday, -1)), to: iso(shift(utcToday, -1)) };
  if (range === "today") return { from: iso(utcToday), to: iso(utcToday) };
  if (range === "tomorrow") return { from: iso(shift(utcToday, 1)), to: iso(shift(utcToday, 1)) };
  const day = utcToday.getUTCDay() || 7;
  const monday = shift(utcToday, 1 - day);
  if (range === "this-week") return { from: iso(monday), to: iso(shift(monday, 6)) };
  if (range === "next-week") return { from: iso(shift(monday, 7)), to: iso(shift(monday, 13)) };
  return { from: customFrom || iso(utcToday), to: customTo || customFrom || iso(utcToday) };
}

function impactRank(impact: string) {
  return impact === "High" ? 3 : impact === "Medium" ? 2 : 1;
}

export function useCalendar() {
  const [category, setCategory] = useState<CalendarCategory>("economic");
  const [range, setRange] = useState<CalendarRange>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [events, setEvents] = useState<MarketCalendarEvent[]>([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [summary, setSummary] = useState({ economic: 0, earnings: 0, dividends: 0, ipo: 0 });
  const [source, setSource] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<CalendarFiltersState>(emptyFilters);
  const [sortKey, setSortKey] = useState<CalendarSortKey>("time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const window = useMemo(() => getWindow(range, customFrom, customTo), [customFrom, customTo, range]);

  const loadEvents = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await getMarketCalendar(category, window, signal);
      setEvents(response.events);
      setSource(response.source);
      setUpdatedAt(response.updatedAt);
    } catch (reason) {
      if ((reason as Error)?.name !== "AbortError") setError((reason as Error)?.message || "Không thể tải lịch thị trường.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [category, window]);

  useEffect(() => {
    const controller = new AbortController();
    void loadEvents(controller.signal);
    return () => controller.abort();
  }, [loadEvents]);

  useEffect(() => {
    const controller = new AbortController();
    const categories: CalendarCategory[] = ["economic", "earnings", "dividends", "ipo"];
    Promise.all(categories.map(item => getMarketCalendar(item, window, controller.signal)))
      .then(results => setSummary({ economic: results[0].events.length, earnings: results[1].events.length, dividends: results[2].events.length, ipo: results[3].events.length }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [window]);

  useEffect(() => {
    if (typeof window === "undefined" || !localStorage.getItem("token")) return;
    let cancelled = false;
    getWatchlists()
      .then(lists => Promise.all(lists.map(list => getWatchlistItems(list.id))))
      .then(groups => {
        if (!cancelled) setWatchlistSymbols([...new Set(groups.flat().map(item => item.assetSymbol.toUpperCase()))]);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => setPage(1), [category, deferredSearch, filters, range, sortDirection, sortKey]);

  const options = useMemo(() => ({
    countries: [...new Set(events.map(event => event.country).filter(Boolean))].sort(),
    sectors: [...new Set(events.map(event => event.sector).filter((value): value is string => Boolean(value)))].sort(),
    eventTypes: [...new Set(events.map(event => event.eventType).filter((value): value is string => Boolean(value)))].sort(),
  }), [events]);

  const filteredEvents = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return events
      .filter(event => !term || `${event.event} ${event.symbol ?? ""} ${event.company ?? ""} ${event.country}`.toLowerCase().includes(term))
      .filter(event => filters.country === "all" || event.country === filters.country)
      .filter(event => filters.impact === "all" || event.impact === filters.impact)
      .filter(event => filters.sector === "all" || event.sector === filters.sector)
      .filter(event => filters.eventType === "all" || event.eventType === filters.eventType)
      .sort((a, b) => {
        const direction = sortDirection === "asc" ? 1 : -1;
        if (sortKey === "impact") return (impactRank(a.impact) - impactRank(b.impact)) * direction;
        if (sortKey === "country") return a.country.localeCompare(b.country) * direction;
        return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) * direction;
      });
  }, [deferredSearch, events, filters, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const paginatedEvents = filteredEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const marketHeat = useMemo(() => {
    if (!events.length) return 0;
    const average = events.reduce((sum, event) => sum + event.volatilityScore, 0) / events.length;
    const highBoost = events.filter(event => event.impact === "High").length * 3;
    return Math.min(100, Math.round(average + highBoost));
  }, [events]);
  const watchlistEvents = useMemo(() => events.filter(event => event.symbol && watchlistSymbols.includes(event.symbol.toUpperCase())), [events, watchlistSymbols]);

  function updateFilter(key: keyof CalendarFiltersState, value: string) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  function toggleSort(key: CalendarSortKey) {
    if (sortKey === key) setSortDirection(current => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
  }

  return {
    category, setCategory, range, setRange, customFrom, setCustomFrom, customTo, setCustomTo,
    events, filteredEvents, paginatedEvents, summary, source, updatedAt, loading, error,
    search, setSearch, filters, updateFilter, resetFilters: () => setFilters(emptyFilters), options,
    sortKey, sortDirection, toggleSort, page, setPage, pageCount, marketHeat, watchlistEvents,
    refresh: () => void loadEvents(), window,
  };
}
