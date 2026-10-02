import { describe, expect, it } from "vitest";
import { CALENDAR_TABS } from "@/types/calendar";
import { getCompanyDisplayName } from "@/components/calendar/CalendarTable";

describe("market calendar tabs", () => {
  it("keeps every tab mapped to its own category and translation key", () => {
    expect(CALENDAR_TABS.map((tab) => tab.value)).toEqual([
      "economic", "holidays", "earnings", "dividends", "splits", "ipo", "options",
    ]);
    expect(new Set(CALENDAR_TABS.map((tab) => tab.labelKey)).size).toBe(CALENDAR_TABS.length);
    expect(CALENDAR_TABS.find((tab) => tab.value === "ipo")?.labelKey).toBe("calendar.tabs.ipo");
    expect(CALENDAR_TABS.find((tab) => tab.value === "options")?.labelKey).toBe("calendar.tabs.options");
  });

  it("resolves company names when calendar providers return the ticker as company", () => {
    expect(getCompanyDisplayName({ symbol: "CARR", company: "CARR", event: "CARR Earnings" })).toBe("Carrier Global Corporation");
    expect(getCompanyDisplayName({ symbol: "COST", company: "COST", event: "COST Earnings" })).toBe("Costco Wholesale Corporation");
    expect(getCompanyDisplayName({ symbol: "PFE", company: "PFE", event: "PFE Earnings" })).toBe("Pfizer Inc.");
    expect(getCompanyDisplayName({ symbol: "ZZZZ", company: null, event: "ZZZZ Quarterly Earnings" })).toBe("ZZZZ");
  });
});
