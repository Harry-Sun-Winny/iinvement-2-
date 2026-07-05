export interface FmpIncomeResponse {
  revenue: number | null;
  grossProfit: number | null;
  netIncome: number | null;
  ebitda: number | null;
}

export interface FmpValuationResponse {
  enterpriseValue: number | null;
  peRatio: number | null;
  priceToSalesRatio: number | null;
  pbRatio: number | null;
  pegRatio: number | null;
}

export function adaptFmpIncome(data: FmpIncomeResponse) {
  return {
    revenue: data.revenue ?? null,
    grossProfit: data.grossProfit ?? null,
    netIncome: data.netIncome ?? null,
    ebitda: data.ebitda ?? null,
  };
}

export function adaptFmpValuation(data: FmpValuationResponse) {
  return {
    enterpriseValue: data.enterpriseValue ?? null,
    peRatio: data.peRatio ?? null,
    priceToSalesRatio: data.priceToSalesRatio ?? null,
    pbRatio: data.pbRatio ?? null,
    pegRatio: data.pegRatio ?? null,
  };
}
