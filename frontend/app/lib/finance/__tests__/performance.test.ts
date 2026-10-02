import { describe, it, expect } from "vitest";
import { buildPerformanceTimeline } from "../performance";
import { Portfolio, Transaction } from "../../api";
import { StockQuote } from "../calculations";

describe("performance timelines engine", () => {
  const usdPortfolio = { id: "p1", name: "USD Portfolio",  type: "STOCKS" } as any;
  const fxRates = { USD: 1, VND: 25400 };
  const emptyQuotes = new Map<string, StockQuote>();

  it("should calculate timeline performance points for BUY transactions", () => {
    const txs = [
      { id: "tx1", portfolioId: "p1", assetSymbol: "AAPL", assetName: "Apple", type: "BUY", quantity: 10, price: 100, transactionDate: "2026-06-01" },
    ] as any[];

    const { points, errors } = buildPerformanceTimeline(
      [{ portfolio: usdPortfolio, txs }],
      emptyQuotes,
      "USD",
      fxRates
    );

    expect(errors).toHaveLength(0);
    // There will be at least the transaction date point and today's date point
    expect(points.length).toBeGreaterThanOrEqual(1);

    const firstPt = points.find(p => p.date === "2026-06-01");
    expect(firstPt).toBeDefined();
    expect(firstPt?.portfolioValue).toBe(1000);
    expect(firstPt?.netInvested).toBe(1000);
    expect(firstPt?.pnl).toBe(0);
  });

  it("should reject oversell transactions in timeline and register errors", () => {
    const txs = [
      { id: "tx1", portfolioId: "p1", assetSymbol: "AAPL", assetName: "Apple", type: "BUY", quantity: 10, price: 100, transactionDate: "2026-06-01" },
      { id: "tx2", portfolioId: "p1", assetSymbol: "AAPL", assetName: "Apple", type: "SELL", quantity: 15, price: 110, transactionDate: "2026-06-02" }, // Oversell
    ] as any[];

    const { points, errors } = buildPerformanceTimeline(
      [{ portfolio: usdPortfolio, txs }],
      emptyQuotes,
      "USD",
      fxRates
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe("OVERSELL");
    expect(errors[0].transactionId).toBe("tx2");

    // Point on 06-02 should still show value based on 10 quantity, ignoring the oversell transaction
    const secondPt = points.find(p => p.date === "2026-06-02");
    expect(secondPt).toBeDefined();
    expect(secondPt?.portfolioValue).toBe(1000); // 10 qty * $100 last known price
    expect(secondPt?.netInvested).toBe(1000);
  });
});
