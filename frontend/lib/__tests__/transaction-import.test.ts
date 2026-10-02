import { describe, expect, it } from "vitest";
import { parseTransactionCsv } from "../transaction-import";

describe("parseTransactionCsv", () => {
  it("maps English transaction headers and quoted cells", () => {
    const rows = parseTransactionCsv(
      'symbol,name,type,quantity,price,currency,date,notes,fee\nAAPL,"Apple, Inc.",BUY,2,190.5,USD,2026-08-29,"Long-term ""core""",1.25',
    );

    expect(rows).toEqual([
      {
        assetSymbol: "AAPL",
        assetName: "Apple, Inc.",
        type: "BUY",
        quantity: 2,
        price: 190.5,
        currency: "USD",
        transactionDate: "2026-08-29",
        notes: 'Long-term "core"',
        fee: 1.25,
      },
    ]);
  });

  it("supports semicolon-delimited Vietnamese headers", () => {
    const rows = parseTransactionCsv(
      "Mã tài sản;Tên tài sản;Loại giao dịch;Số lượng;Giá;Tiền tệ;Ngày giao dịch;Ghi chú;Phí\nFPT;FPT;MUA;10;120000;VND;2026-08-29;;0",
    );

    expect(rows[0]).toMatchObject({
      assetSymbol: "FPT",
      type: "MUA",
      quantity: 10,
      price: 120000,
      currency: "VND",
      transactionDate: "2026-08-29",
    });
  });

  it("rejects a file without required columns", () => {
    expect(() => parseTransactionCsv("symbol,name\nAAPL,Apple")).toThrow("missing required columns");
  });

  it("keeps missing required numbers invalid for server-side preview", () => {
    const [row] = parseTransactionCsv("symbol,type,quantity,price,date\nAAPL,BUY,,190,2026-08-29");

    expect(row.quantity).toBeNaN();
  });
});
