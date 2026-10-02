import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DailySessionSummary } from "../DailySessionSummary";
import type { DailySessionSummary as Summary } from "@/app/lib/finance/daily-session";

vi.mock("@/components/providers/I18nProvider", () => ({
  useTranslation: () => ({ language: "vi" }),
}));

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
});

afterEach(cleanup);

describe("DailySessionSummary", () => {
  it("shows the source trading date without shifting it to the browser timezone", () => {
    const contributor = { symbol: "AAPL", quantity: 10, currentPrice: 120, previousClose: 118, sessionHigh: 122, sessionLow: 117, valueChange: 20, changePercent: 1.69 };
    const summary: Summary = {
      value: 1200, previousValue: 1180, valueChange: 20, changePercent: 1.69,
      advancing: 1, declining: 0, unchanged: 0, unavailable: 0,
      best: contributor, worst: contributor, contributors: [contributor],
    };

    render(
      <DailySessionSummary
        summary={summary}
        currency="USD"
        tradingDate="2026-08-28T23:30:00-04:00"
      />,
    );

    expect(screen.getByText("Ngày giao dịch")).toBeTruthy();
    expect(screen.getByText("28/08/2026")).toBeTruthy();
  });

  it("starts compact on the dashboard and can reveal contributor details", () => {
    const contributor = { symbol: "AAPL", quantity: 10, currentPrice: 120, previousClose: 118, sessionHigh: 122, sessionLow: 117, valueChange: 20, changePercent: 1.69 };
    const summary: Summary = {
      value: 1200, previousValue: 1180, valueChange: 20, changePercent: 1.69,
      advancing: 1, declining: 0, unchanged: 0, unavailable: 0,
      best: contributor, worst: contributor, contributors: [contributor],
    };
    const { container } = render(<DailySessionSummary summary={summary} currency="USD" collapsible />);
    const details = container.querySelector("details")!;
    expect(details.open).toBe(false);
    fireEvent.click(details.querySelector("summary")!);
    expect(details.open).toBe(true);
    expect(screen.getByText("AAPL")).toBeTruthy();
    expect(screen.getByText("Cao nhất phiên")).toBeTruthy();
    expect(screen.getByText("Thấp nhất phiên")).toBeTruthy();
    expect(screen.getByText("$122.00")).toBeTruthy();
    expect(screen.getByText("$117.00")).toBeTruthy();
    fireEvent.click(details.querySelector("summary")!);
    expect(details.open).toBe(false);
  });

  it("renders every contributor in the portfolio", () => {
    const contributors = Array.from({ length: 8 }, (_, index) => ({
      symbol: `STOCK${index + 1}`,
      quantity: 10,
      currentPrice: 101 + index,
      previousClose: 100 + index,
      valueChange: 10,
      changePercent: 1,
    }));
    const summary: Summary = {
      value: 8_000,
      previousValue: 7_920,
      valueChange: 80,
      changePercent: 1,
      advancing: 8,
      declining: 0,
      unchanged: 0,
      unavailable: 0,
      best: contributors[0],
      worst: contributors[7],
      contributors,
    };

    render(<DailySessionSummary summary={summary} currency="USD" />);

    for (const contributor of contributors) {
      expect(screen.getByText(contributor.symbol)).toBeTruthy();
    }
  });

  it("shows portfolio ownership, monthly trend, and moves the full symbol history", async () => {
    const contributor = {
      symbol: "AAPL",
      portfolioId: "portfolio-growth",
      portfolioName: "Growth",
      quantity: 10,
      currentPrice: 120,
      previousClose: 118,
      valueChange: 20,
      changePercent: 1.69,
    };
    const summary: Summary = {
      value: 1200, previousValue: 1180, valueChange: 20, changePercent: 1.69,
      advancing: 1, declining: 0, unchanged: 0, unavailable: 0,
      best: contributor, worst: contributor, contributors: [contributor],
    };
    const onTransferPosition = vi.fn().mockResolvedValue({ transactionCount: 3 });

    render(
      <DailySessionSummary
        summary={summary}
        currency="USD"
        portfolios={[
          { id: "portfolio-growth", name: "Growth" },
          { id: "portfolio-long-term", name: "Long term" },
        ]}
        monthlyTrend={[
          { date: "2026-08-01", value: 1000, valueChange: 0, changePercent: 0 },
          { date: "2026-08-28", value: 1200, valueChange: 200, changePercent: 20 },
        ]}
        onTransferPosition={onTransferPosition}
      />,
    );

    expect(screen.getByText("Danh mục: Growth")).toBeTruthy();
    expect(screen.getByText("Diễn biến 1 tháng")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Chuyển danh mục" }));
    fireEvent.change(screen.getByLabelText("Danh mục đích cho AAPL"), { target: { value: "portfolio-long-term" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));

    await waitFor(() => {
      expect(onTransferPosition).toHaveBeenCalledWith("portfolio-growth", "portfolio-long-term", "AAPL");
      expect(screen.getByText(/3 giao dịch lịch sử/)).toBeTruthy();
    });
  });
});
