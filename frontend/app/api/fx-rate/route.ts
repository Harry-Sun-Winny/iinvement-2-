import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
const yahooFinance = new YahooFinanceClass();

const SUBUNIT_MAP: Record<string, { parent: string; divisor: number }> = {
  GBP: { parent: "GBP", divisor: 1 },
  GBp: { parent: "GBP", divisor: 100 },
  ZAc: { parent: "ZAR", divisor: 100 },
  ILA: { parent: "ILS", divisor: 100 },
  AUc: { parent: "AUD", divisor: 100 },
  NZc: { parent: "NZD", divisor: 100 },
  CAc: { parent: "CAD", divisor: 100 },
  HKc: { parent: "HKD", divisor: 100 },
  SGc: { parent: "SGD", divisor: 100 },
  MYs: { parent: "MYR", divisor: 100 },
  THS: { parent: "THB", divisor: 100 },
  INp: { parent: "INR", divisor: 100 },
  PKp: { parent: "PKR", divisor: 100 },
  BDt: { parent: "BDT", divisor: 100 },
  LKc: { parent: "LKR", divisor: 100 },
  AEf: { parent: "AED", divisor: 100 },
  BHf: { parent: "BHD", divisor: 1000 },
  KWf: { parent: "KWD", divisor: 1000 },
  OMb: { parent: "OMR", divisor: 1000 },
  JDp: { parent: "JOD", divisor: 1000 },
  SAr: { parent: "SAR", divisor: 100 },
  QAr: { parent: "QAR", divisor: 100 },
  BRc: { parent: "BRL", divisor: 100 },
  MXc: { parent: "MXN", divisor: 100 },
  ARc: { parent: "ARS", divisor: 100 },
  CLc: { parent: "CLP", divisor: 100 },
  COc: { parent: "COP", divisor: 100 },
  PEc: { parent: "PEN", divisor: 100 },
  TRk: { parent: "TRY", divisor: 100 },
  RUb: { parent: "RUB", divisor: 100 },
  UAk: { parent: "UAH", divisor: 100 },
  PLg: { parent: "PLN", divisor: 100 },
  CZh: { parent: "CZK", divisor: 100 },
  HUf: { parent: "HUF", divisor: 100 },
  ROb: { parent: "RON", divisor: 100 },
  CNf: { parent: "CNY", divisor: 100 },
  JPs: { parent: "JPY", divisor: 1 },
  KRW: { parent: "KRW", divisor: 1 },
  VND: { parent: "VND", divisor: 1 },
  IDR: { parent: "IDR", divisor: 1 },
  TWc: { parent: "TWD", divisor: 100 },
};

async function getUsdRate(currency: string): Promise<number> {
  const normalized = currency.toUpperCase();
  if (!normalized || normalized === "USD" || normalized === "USDT" || normalized === "USDC") {
    return 1;
  }

  const subunit = SUBUNIT_MAP[normalized];
  const actualCurrency = subunit ? subunit.parent : normalized;
  
  try {
    const quote = await yahooFinance.quote(`${actualCurrency}USD=X`);
    const rate = quote.regularMarketPrice;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Unable to resolve FX rate for ${currency}`);
    }
    return subunit ? rate / subunit.divisor : rate;
  } catch (error) {
    throw new Error(`Unable to resolve FX rate for ${currency}: ${error}`);
  }
}

export async function GET(req: NextRequest) {
  const currency = (req.nextUrl.searchParams.get("currency") || "USD").trim();

  try {
    const rate = await getUsdRate(currency);
    return NextResponse.json({
      currency: currency.toUpperCase(),
      targetCurrency: "USD",
      rate,
    });
  } catch (error) {
    return NextResponse.json(
      {
        currency: currency.toUpperCase(),
        targetCurrency: "USD",
        rate: 1,
        error: String(error),
      },
      { status: 200 },
    );
  }
}
