import { describe, expect, it } from "vitest";
import { assetType } from "./chart";

describe("assetType", () => {
  it("keeps crypto in the crypto allocation even when a legacy API labels it as stock", () => {
    expect(assetType("PEPE", "Pepe", "STOCK")).toBe("CRYPTO");
    expect(assetType("ETH", "Ethereum", "STOCKS")).toBe("CRYPTO");
  });

  it("normalizes backend category names for non-crypto holdings", () => {
    expect(assetType("AAPL", "Apple Inc.", "STOCK")).toBe("STOCKS");
    expect(assetType("BND", "Vanguard Total Bond Market ETF", "BOND")).toBe("BONDS");
  });
});
