import { describe, expect, it } from "vitest";
import { getHotScore, MARKET_EXPLORER_VIEWS, resolveExplorerAssets } from "../marketExplorer";
import type { MarketAsset, MarketQuote } from "../types";

const stocks: MarketAsset[] = [
  { symbol: "HOT", name: "Hot Corp" },
  { symbol: "VALUE", name: "Value Corp" },
  { symbol: "EXP", name: "Expensive Corp" },
];
const quote = (symbol: string, input: Partial<MarketQuote>): MarketQuote => ({
  symbol,
  name: symbol,
  price: 100,
  change: 0,
  changePercent: 0,
  changeRange: 0,
  changePctRange: 0,
  ...input,
});

describe("market explorer", () => {
  it("contains every requested international screen without a Vietnam equities entry", () => {
    expect(MARKET_EXPLORER_VIEWS).toHaveLength(26);
    expect(MARKET_EXPLORER_VIEWS.some((view) => view.labelVi.includes("Việt Nam"))).toBe(false);
    expect(MARKET_EXPLORER_VIEWS.map((view) => view.id)).toEqual(expect.arrayContaining([
      "stock-screener", "stock-trending", "stocks-premarket", "stocks-afterhours", "stocks-high52", "stocks-low52",
      "stocks-active", "stocks-gainers", "stocks-losers", "stocks-undervalued", "stocks-overvalued",
      "commodities-metals", "commodities-softs", "commodities-meats", "commodities-energy", "commodities-grains",
      "indices-main", "indices-world", "indices-global", "indices-futures", "indices-realtime",
    ]));
  });

  it("ranks hot stocks with momentum and relative volume", () => {
    const quiet = quote("VALUE", { changePercent: 0.4, volume: 100, averageVolume: 100 });
    const hot = quote("HOT", { changePercent: 7, volume: 400, averageVolume: 100, fiftyTwoWeekHigh: 101 });
    expect(getHotScore(hot)).toBeGreaterThan(getHotScore(quiet));
  });

  it("screens valuation and pre-market data from real quote fields", () => {
    const quotes = {
      HOT: quote("HOT", { preMarketChangePercent: 4.2, trailingPE: 25 }),
      VALUE: quote("VALUE", { trailingPE: 12 }),
      EXP: quote("EXP", { trailingPE: 48 }),
    };
    const universes = { stocks, commodities: [], indices: [] };
    expect(resolveExplorerAssets("stocks-premarket", universes, quotes, "1d").map((item) => item.symbol)).toEqual(["HOT"]);
    expect(resolveExplorerAssets("stocks-undervalued", universes, quotes, "1d").map((item) => item.symbol)).toEqual(["VALUE"]);
    expect(resolveExplorerAssets("stocks-overvalued", universes, quotes, "1d").map((item) => item.symbol)).toEqual(["EXP"]);
  });
});
