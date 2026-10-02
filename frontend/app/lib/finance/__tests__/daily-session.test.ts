import { describe, expect, it } from "vitest";
import { summarizeDailySession } from "../daily-session";

describe("summarizeDailySession", () => {
  it("weights session movement by shares held", () => {
    const summary = summarizeDailySession([
      { symbol: "AAA", quantity: 10, currentPrice: 110, previousClose: 100 },
      { symbol: "BBB", quantity: 5, currentPrice: 45, previousClose: 50 },
    ]);

    expect(summary.valueChange).toBe(75);
    expect(summary.previousValue).toBe(1250);
    expect(summary.changePercent).toBeCloseTo(6);
    expect(summary.advancing).toBe(1);
    expect(summary.declining).toBe(1);
    expect(summary.best?.symbol).toBe("AAA");
    expect(summary.worst?.symbol).toBe("BBB");
    expect(summary.contributors.map((position) => position.symbol)).toEqual(["AAA", "BBB"]);
  });

  it("reports unavailable positions without inventing a previous close", () => {
    const summary = summarizeDailySession([
      { symbol: "AAA", quantity: 1, currentPrice: 10, previousClose: null },
    ]);

    expect(summary.unavailable).toBe(1);
    expect(summary.valueChange).toBe(0);
  });
});
