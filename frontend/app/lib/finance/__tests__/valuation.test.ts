import { describe, expect, it } from "vitest";
import { valuePortfolioSets } from "../valuation";

describe("portfolio valuation", () => {
  it("uses quote currency for value and portfolio currency for cost", () => {
    const portfolio = { id: "vnd", name: "VND portfolio", baseCurrency: "VND", type: "STOCKS" } as any;
    const txs = [{ id: "buy", portfolioId: "vnd", assetSymbol: "AAPL", assetName: "Apple", type: "BUY", quantity: 1, price: 25400, transactionDate: "2026-01-01", createdAt: "2026-01-01" }] as any[];
    const quotes = new Map([["AAPL", { price: 100, previousClose: 100, currency: "USD" }]]);
    const valuation = valuePortfolioSets([{ portfolio, txs }], quotes, "USD", { USD: 1, VND: 25400 });
    expect(valuation.totalCostBasis).toBe(1);
    expect(valuation.totalMarketValue).toBe(100);
    expect(valuation.totalPnl).toBe(99);
  });

  it("includes realized sale P/L in the total", () => {
    const portfolio = { id: "usd", name: "USD portfolio", baseCurrency: "USD", type: "STOCKS" } as any;
    const txs = [
      { id: "buy", portfolioId: "usd", assetSymbol: "AAPL", assetName: "Apple", type: "BUY", quantity: 10, price: 100, transactionDate: "2026-01-01", createdAt: "2026-01-01" },
      { id: "sell", portfolioId: "usd", assetSymbol: "AAPL", assetName: "Apple", type: "SELL", quantity: 4, price: 120, transactionDate: "2026-01-02", createdAt: "2026-01-02" },
    ] as any[];
    const quotes = new Map([["AAPL", { price: 110, previousClose: 110, currency: "USD" }]]);

    const valuation = valuePortfolioSets([{ portfolio, txs }], quotes, "USD", { USD: 1, VND: 25400 });
    expect(valuation.totalUnrealizedPnl).toBe(60);
    expect(valuation.totalRealizedPnl).toBe(80);
    expect(valuation.totalPnl).toBe(140);
  });
});
