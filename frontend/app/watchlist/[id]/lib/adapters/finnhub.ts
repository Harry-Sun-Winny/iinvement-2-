export interface FinnhubPriceResponse {
  price: number;
  change: number;
  changePercent: number;
}

export interface FinnhubProfileResponse {
  logo?: string;
  marketCap?: number;
  name?: string;
  currency?: string;
  sector?: string;
  country?: string;
  website?: string;
}

export function adaptFinnhubPrice(data: FinnhubPriceResponse) {
  return {
    price: data.price ?? null,
    change: data.change ?? null,
    changePercent: data.changePercent ?? null,
  };
}

export function adaptFinnhubProfile(data: FinnhubProfileResponse) {
  return {
    logo: data.logo || "",
    marketCap: data.marketCap ? data.marketCap * 1_000_000 : null,
    name: data.name || "",
    currency: data.currency || "USD",
    sector: data.sector || "Unknown",
    country: data.country || "Unknown",
    website: data.website || "",
  };
}
