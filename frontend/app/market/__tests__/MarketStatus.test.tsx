import React from "react";
import { renderToString } from "react-dom/server";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MarketStatus from "../components/MarketStatus";

vi.mock("@/components/providers/I18nProvider", () => ({ useTranslation: () => ({ language: "vi" }) }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("MarketStatus hydration", () => {
  it("renders identical initial HTML across trading sessions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T02:00:00Z"));
    const overnight = renderToString(<MarketStatus />);
    vi.setSystemTime(new Date("2026-10-02T15:00:00Z"));
    expect(renderToString(<MarketStatus />)).toBe(overnight);
  });
  it("resolves the current session after mounting", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T15:00:00Z"));
    render(<MarketStatus />);
    expect(screen.getByText("Đang mở cửa")).toBeTruthy();
  });
});
