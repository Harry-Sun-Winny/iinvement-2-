import { CalendarCategory, CalendarDateWindow, CalendarResponse, MarketCalendarEvent } from "@/types/calendar";

export async function getMarketCalendar(
  category: CalendarCategory,
  window: CalendarDateWindow,
  signal?: AbortSignal,
): Promise<CalendarResponse> {
  const params = new URLSearchParams({ category, from: window.from, to: window.to });
  const response = await fetch(`/api/market-calendar?${params.toString()}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Không thể tải dữ liệu Market Calendar.");
  return response.json();
}

function exportRows(events: MarketCalendarEvent[]) {
  return events.map(event => ({
    Date: event.date,
    Time: event.time,
    Event: event.event,
    Symbol: event.symbol ?? "",
    Company: event.company ?? "",
    Country: event.country,
    Impact: event.impact,
    Actual: event.actual ?? "",
    Forecast: event.forecast ?? "",
    Previous: event.previous ?? "",
    Sector: event.sector ?? "",
  }));
}

function download(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportCalendarCsv(events: MarketCalendarEvent[]) {
  const rows = exportRows(events);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]) as (keyof (typeof rows)[0])[];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map(row => headers.map(header => escape(row[header])).join(","))].join("\n");
  download(`\uFEFF${csv}`, `market-calendar-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
}

export function exportCalendarExcel(events: MarketCalendarEvent[]) {
  const rows = exportRows(events);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]) as (keyof (typeof rows)[0])[];
  const xmlEscape = (value: unknown) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const tableRows = [
    `<Row>${headers.map(header => `<Cell><Data ss:Type="String">${xmlEscape(header)}</Data></Cell>`).join("")}</Row>`,
    ...rows.map(row => `<Row>${headers.map(header => `<Cell><Data ss:Type="String">${xmlEscape(row[header])}</Data></Cell>`).join("")}</Row>`),
  ].join("");
  const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Market Calendar"><Table>${tableRows}</Table></Worksheet></Workbook>`;
  download(workbook, `market-calendar-${new Date().toISOString().slice(0, 10)}.xls`, "application/vnd.ms-excel");
}
