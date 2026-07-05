export interface DashboardData {
  readonly symbol: string;
  readonly name: string;
  readonly assetClass: "EQUITY" | "ETF" | "REIT" | "CRYPTO" | "INDEX";
  readonly currency: string;
  readonly quote: {
    readonly price: number | null;
    readonly change: number | null;
    readonly changePercent: number | null;
    readonly volume: number | null;
  };
  readonly profile: {
    readonly logo: string;
    readonly marketCap: number | null;
    readonly sector: string;
    readonly industry: string;
    readonly country: string;
    readonly website: string;
  };
  readonly metrics: Readonly<Record<string, number | null>>;
  readonly chartPoints: readonly {
    readonly date: string;
    readonly price: number | null;
    readonly volume: number | null;
    readonly ma50: number | null;
    readonly ma200: number | null;
    readonly revenue: number | null;
    readonly ebitda: number | null;
    readonly netIncome: number | null;
    readonly marketCap: number | null;
  }[];
  readonly peers: readonly {
    readonly symbol: string;
    readonly name: string;
    readonly price: number | null;
    readonly changePercent: number | null;
    readonly marketCap: number | null;
  }[];
  readonly news: readonly {
    readonly title: string;
    readonly summary: string;
    readonly url: string;
    readonly source: string;
    readonly publishedAt: string;
  }[];
}
