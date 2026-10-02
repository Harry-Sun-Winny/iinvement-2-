export type CalendarCategory =
  | "economic"
  | "holidays"
  | "earnings"
  | "dividends"
  | "splits"
  | "ipo"
  | "options";

export type CalendarRange = "yesterday" | "today" | "tomorrow" | "this-week" | "next-week" | "custom";
export type CalendarImpact = "Low" | "Medium" | "High";
export type CalendarSortKey = "time" | "impact" | "country";
export type SortDirection = "asc" | "desc";

export interface MarketCalendarEvent {
  id: string;
  category: CalendarCategory;
  date: string;
  time: string;
  event: string;
  country: string;
  countryCode: string;
  impact: CalendarImpact;
  actual?: string | null;
  forecast?: string | null;
  previous?: string | null;
  sector?: string | null;
  eventType?: string | null;
  symbol?: string | null;
  company?: string | null;
  session?: "Before Market Open" | "After Market Close" | "During Market" | null;
  epsEstimate?: number | null;
  epsActual?: number | null;
  revenueEstimate?: number | null;
  revenueActual?: number | null;
  surprise?: number | null;
  exDate?: string | null;
  payDate?: string | null;
  dividend?: number | null;
  yield?: number | null;
  ratio?: string | null;
  exchange?: string | null;
  priceRange?: string | null;
  volatilityScore: number;
  affectedSectors: string[];
}

export interface CalendarResponse {
  events: MarketCalendarEvent[];
  source: string;
  updatedAt: string;
}

export interface CalendarFiltersState {
  country: string;
  impact: string;
  sector: string;
  eventType: string;
}

export interface CalendarDateWindow {
  from: string;
  to: string;
}

export const CALENDAR_TABS: { value: CalendarCategory; labelKey: string }[] = [
  { value: "economic", labelKey: "calendar.tabs.economic" },
  { value: "holidays", labelKey: "calendar.tabs.holidays" },
  { value: "earnings", labelKey: "calendar.tabs.earnings" },
  { value: "dividends", labelKey: "calendar.tabs.dividends" },
  { value: "splits", labelKey: "calendar.tabs.splits" },
  { value: "ipo", labelKey: "calendar.tabs.ipo" },
  { value: "options", labelKey: "calendar.tabs.options" },
];

export const CALENDAR_RANGES: { value: CalendarRange; label: string }[] = [
  { value: "yesterday", label: "Hôm Qua" },
  { value: "today", label: "Hôm Nay" },
  { value: "tomorrow", label: "Ngày Mai" },
  { value: "this-week", label: "Tuần Này" },
  { value: "next-week", label: "Tuần Tới" },
  { value: "custom", label: "Tùy Chỉnh Ngày" },
];
