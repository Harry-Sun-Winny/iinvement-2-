import { describe, it, expect } from "vitest";
import {
  convertCurrency,
  fmtCompactMoney,
  fmtCompactNumber,
  fmtQuantity,
  fmtCompactSignedMoney,
  fmtMoney,
  fmtSignedMoney,
  getValueTone,
  isPositive,
} from "../currency";

describe("currency helpers", () => {
  describe("fmtQuantity", () => {
    it("preserves fractional holdings", () => {
      expect(fmtQuantity(0.08, "vi-VN")).toBe("0,08");
      expect(fmtQuantity(0.00000001)).toBe("0.00000001");
      expect(fmtQuantity(1234.56789012)).toBe("1,234.56789012");
    });
    it("keeps integers and rejects nonfinite quantities", () => {
      expect(fmtQuantity(0)).toBe("0");
      expect(fmtQuantity(12)).toBe("12");
      for (const value of [null, undefined, NaN, Infinity, -Infinity]) expect(fmtQuantity(value)).toBe("N/A");
    });
  });
  describe("convertCurrency", () => {
    const fxRates = {
      USD: 1,
      VND: 25400,
      USDT: 1,
    };

    it("should return same value when currencies match", () => {
      expect(convertCurrency(100, "USD", "USD", fxRates)).toBe(100);
      expect(convertCurrency(1000, "VND", "VND", fxRates)).toBe(1000);
    });

    it("should convert USD to VND correctly", () => {
      expect(convertCurrency(10, "USD", "VND", fxRates)).toBe(254000);
    });

    it("should convert VND to USD correctly", () => {
      expect(convertCurrency(254000, "VND", "USD", fxRates)).toBe(10);
    });

    it("should throw a controlled error if exchange rate is missing", () => {
      expect(() => convertCurrency(100, "EUR", "VND", fxRates)).toThrow("Missing FX rate: EUR -> VND");
    });
  });

  describe("fmtMoney", () => {
    it("should format USD correctly", () => {
      expect(fmtMoney(100.5, "USD")).toContain("$100.50");
    });

    it("should format VND correctly with no decimals", () => {
      // VND localized contains non-breaking spaces, check digits and currency symbol
      const result = fmtMoney(25000, "VND");
      expect(result).toContain("25");
      expect(result).not.toContain(",00");
    });

    it("should return N/A for null/undefined values", () => {
      expect(fmtMoney(null, "USD")).toBe("N/A");
      expect(fmtMoney(undefined, "USD")).toBe("N/A");
    });
  });

  describe("fmtSignedMoney", () => {
    it("should format positive money with plus sign", () => {
      expect(fmtSignedMoney(100, "USD")).toBe("+$100.00");
    });

    it("should format negative money with minus sign and no duplicate minus characters", () => {
      expect(fmtSignedMoney(-100, "USD")).toBe("-$100.00");
    });

    it("should format zero money with plus sign", () => {
      expect(fmtSignedMoney(0, "USD")).toBe("+$0.00");
    });

    it("should format signed VND money without duplicating signs", () => {
      const resultPos = fmtSignedMoney(25400, "VND");
      const resultNeg = fmtSignedMoney(-25400, "VND");
      expect(resultPos.startsWith("+")).toBe(true);
      expect(resultNeg.startsWith("-")).toBe(true);
    });
  });

  describe("fmtCompactMoney", () => {
    it("uses at most three integer digits and one decimal for compact units", () => {
      expect(fmtCompactMoney(200_000_000_000, "USD")).toBe("$200B");
      expect(fmtCompactMoney(2_500_000_000, "USD")).toBe("$2.5B");
      expect(fmtCompactMoney(500_000_000, "USD")).toBe("$500M");
      expect(fmtCompactMoney(12_500, "USD")).toBe("$12.5K");
      expect(fmtCompactMoney(500, "USD")).toBe("$500");
      expect(fmtCompactMoney(2_500_000_000, "USD", "vi-VN")).toBe("$2,5B");
      expect(fmtCompactNumber(6_981_951_487, "vi-VN")).toBe("7B");
    });

    it("promotes rounded values instead of rendering four integer digits", () => {
      expect(fmtCompactMoney(999_950_000, "USD")).toBe("$1B");
      expect(fmtCompactMoney(999_950, "USD")).toBe("$1M");
      expect(fmtCompactMoney(999.95, "USD")).toBe("$1K");
    });

    it("preserves the sign and compact suffix for signed values", () => {
      expect(fmtCompactSignedMoney(2_500_000_000, "USD")).toBe("+$2.5B");
      expect(fmtCompactSignedMoney(-500_000_000, "USD")).toBe("-$500M");
    });
  });

  describe("getValueTone", () => {
    it("should return positive for values >= 0", () => {
      expect(getValueTone(0)).toBe("positive");
      expect(getValueTone(100)).toBe("positive");
    });

    it("should return negative for values < 0", () => {
      expect(getValueTone(-0.01)).toBe("negative");
    });

    it("should return neutral for null or undefined", () => {
      expect(getValueTone(null)).toBe("neutral");
      expect(getValueTone(undefined)).toBe("neutral");
    });
  });

  describe("isPositive", () => {
    it("should return true for >= 0", () => {
      expect(isPositive(0)).toBe(true);
      expect(isPositive(12.5)).toBe(true);
    });

    it("should return false for negative", () => {
      expect(isPositive(-1)).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isPositive(null)).toBe(false);
    });
  });
});
