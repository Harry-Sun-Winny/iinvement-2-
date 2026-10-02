import { describe, it, expect } from "vitest";
import {
  buildHoldingsFromTransactions,
  buildPositionsFromHoldings,
  applyLivePrices,
  buildDisplayPositions,
  computeDisplayPortfolioStats,
  calculateTodayPnl,
} from "../calculations";
import { Transaction, Portfolio } from "../../api";

describe("calculations engine", () => {
  const mockPortfolio =  {
    id: "p1",
    name: "Tech Stock",
    currency: "USD",
    type: "STOCKS",
  };

  describe("buildHoldingsFromTransactions", () => {
    it("should calculate correct average cost for multiple BUYs", () => {
      const txs = [
        { id: "1", portfolioId: "p1", assetSymbol: "AAPL", assetName: "Apple", type: "BUY", quantity: 10, price: 100, transactionDate: "2026-06-01" },
        { id: "2", portfolioId: "p1", assetSymbol: "AAPL", assetName: "Apple", type: "BUY", quantity: 10, price: 200, transactionDate: "2026-06-02" },
      ] as any[];

      const { holdings, errors } = buildHoldingsFromTransactions(txs, mockPortfolio as any);
      expect(errors).toHaveLength(0);
      expect(holdings.AAPL.qty).toBe(20);
      expect(holdings.AAPL.cost).toBe(3000); // 10*100 + 10*200
    });

    it("should calculate correct average cost after partial SELL", () => {
      const txs = [
        { id: "1", portfolioId: "p1", assetSymbol: "AAPL", assetName: "Apple", type: "BUY", quantity: 10, price: 100, transactionDate: "2026-06-01" },
        { id: "2", portfolioId: "p1", assetSymbol: "AAPL", assetName: "Apple", type: "SELL", quantity: 4, price: 120, transactionDate: "2026-06-02" },
      ] as any[];

      const { holdings, errors } = buildHoldingsFromTransactions(txs, mockPortfolio as any);
      expect(errors).toHaveLength(0);
      expect(holdings.AAPL.qty).toBe(6);
      // Cost should reduce proportionally based on the average cost of $100
      expect(holdings.AAPL.cost).toBe(600); 
    });

    it("records realized P/L and includes buy and sell fees", () => {
      const txs = [
        { id: "1", portfolioId: "p1", assetSymbol: "AAPL", assetName: "Apple", type: "BUY", quantity: 10, price: 100, fee: 10, transactionDate: "2026-06-01" },
        { id: "2", portfolioId: "p1", assetSymbol: "AAPL", assetName: "Apple", type: "SELL", quantity: 4, price: 120, fee: 4, transactionDate: "2026-06-02" },
      ] as any[];

      const { holdings, realizedPnl } = buildHoldingsFromTransactions(txs, mockPortfolio as any);
      expect(realizedPnl).toBe(72); // (4 * 120 - 4) - (4 * 101)
      expect(holdings.AAPL.cost).toBe(606);
    });

    it("should reject oversell transaction and keep holdings/cost intact", () => {
      const txs = [
        { id: "1", portfolioId: "p1", assetSymbol: "AAPL", assetName: "Apple", type: "BUY", quantity: 10, price: 100, transactionDate: "2026-06-01" },
        { id: "2", portfolioId: "p1", assetSymbol: "AAPL", assetName: "Apple", type: "SELL", quantity: 15, price: 120, transactionDate: "2026-06-02" }, // Oversell
      ] as any[];

      const { holdings, errors } = buildHoldingsFromTransactions(txs, mockPortfolio as any);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe("OVERSELL");
      expect(errors[0].transactionId).toBe("2");
      expect(holdings.AAPL.qty).toBe(10); // Not changed
      expect(holdings.AAPL.cost).toBe(1000); // Not changed
    });
  });

  describe("calculateTodayPnl", () => {
    it("should calculate using previousClose first", () => {
      const quote = { price: 150, previousClose: 140, currency: "USD" };
      expect(calculateTodayPnl(10, quote)).toBe(100);
    });

    it("should fallback to changeAmount", () => {
      const quote = { price: 150, changeAmount: 5, currency: "USD" };
      expect(calculateTodayPnl(10, quote)).toBe(50);
    });

    it("should fallback to changePercent", () => {
      const quote = { price: 110, changePercent: 10, currency: "USD" }; // prevClose = 110/1.1 = 100
      expect(calculateTodayPnl(10, quote)).toBeCloseTo(100, 2);
    });
  });

  describe("applyLivePrices", () => {
    it("should correctly update position stats with live quotes", () => {
      const positions = buildPositionsFromHoldings(
        { AAPL: { name: "Apple", qty: 10, cost: 1000 } },
        mockPortfolio as any);
      const quotes = new Map([
        ["AAPL", { price: 150, previousClose: 140, currency: "USD" }],
      ]);

      const updated = applyLivePrices(positions, quotes);
      expect(updated[0].currentPrice).toBe(150);
      expect(updated[0].marketValue).toBe(1500);
      expect(updated[0].pnl).toBe(500);
      expect(updated[0].todayPnl).toBe(100);
      expect(updated[0].quoteCurrency).toBe("USD");
    });
  });

  describe("buildDisplayPositions", () => {
    const fxRates = { USD: 1, VND: 25400 };

    it("should map displays correctly when baseCurrency matches cost currency", () => {
      const positions = applyLivePrices(
        buildPositionsFromHoldings({ AAPL: { name: "Apple", qty: 10, cost: 1000 } }, mockPortfolio as any),
        new Map([["AAPL", { price: 150, previousClose: 140, currency: "USD" }]])
      );

      const displays = buildDisplayPositions(positions, "USD", fxRates);
      expect(displays[0].displayCurrency).toBe("USD");
      expect(displays[0].marketValueDisplay).toBe(1500);
      expect(displays[0].pnlDisplay).toBe(500);
    });

    it("should convert costs, prices, values and PnL to target baseCurrency", () => {
      const positions = applyLivePrices(
        buildPositionsFromHoldings({ AAPL: { name: "Apple", qty: 10, cost: 1000 } }, mockPortfolio as any),
        new Map([["AAPL", { price: 150, previousClose: 140, currency: "USD" }]])
      );

      const displays = buildDisplayPositions(positions, "VND", fxRates);
      expect(displays[0].displayCurrency).toBe("VND");
      expect(displays[0].marketValueDisplay).toBe(1500 * 25400);
      expect(displays[0].pnlDisplay).toBe(500 * 25400);
    });

    it("should correctly handle quote currency mismatch (cost in VND, quote in USD, display in USD)", () => {
      const vndPortfolio =  { id: "p2", name: "VND portfolio", currency: "VND", type: "STOCKS" };
      const rawPositions = buildPositionsFromHoldings(
        { AAPL: { name: "Apple", qty: 1, cost: 25400 } }, // Cost is 25,400 VND
        vndPortfolio as any);
      // Quote is in USD: $100 price, $100 prev close
      const quoteMap = new Map([
        ["AAPL", { price: 100, previousClose: 100, currency: "USD" }]
      ]);
      const priced = applyLivePrices(rawPositions, quoteMap);
      
      const displays = buildDisplayPositions(priced, "USD", fxRates);
      expect(displays[0].displayCurrency).toBe("USD");
      expect((displays[0] as any).costBasisDisplay).toBeUndefined(); // raw cost basis field is not overridden, costBasisDisplay is derived locally or checked via displays properties
      
      // Cost was 25400 VND / 25400 = 1 USD
      // Market value was 100 USD * 1 = 100 USD
      // Display PnL = 100 USD - 1 USD = 99 USD
      expect(displays[0].marketValueDisplay).toBe(100);
      expect(displays[0].pnlDisplay).toBe(99);
    });
  });

  describe("computeDisplayPortfolioStats", () => {
    const fxRates = { USD: 1, VND: 25400 };

    it("should correctly aggregate multi-currency positions into display stats", () => {
      const p1 =  { id: "p1", name: "USD Portfolio", currency: "USD", type: "STOCKS" };
      const p2 =  { id: "p2", name: "VND Portfolio", currency: "VND", type: "STOCKS" };

      const usdPos = buildPositionsFromHoldings({ AAPL: { name: "Apple", qty: 1, cost: 100 } }, p1 as any);
      const vndPos = buildPositionsFromHoldings({ HPG: { name: "HPG", qty: 1, cost: 25400 } }, p2 as any);

      // Map to DisplayPosition in USD
      const displays = buildDisplayPositions([...usdPos, ...vndPos], "USD", fxRates);
      const stats = computeDisplayPortfolioStats(displays, [p1 as any, p2 as any]);

      expect(stats.p1.value).toBe(100); // 100 USD
      expect(stats.p2.value).toBe(1);   // 25400 VND converted to 1 USD
    });
  });
});
