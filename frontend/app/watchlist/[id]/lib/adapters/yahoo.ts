export interface YahooHistoryResponse {
  currency?: string;
  exchangeName?: string;
  points: {
    date: string;
    close: number | null;
    adjustedClose: number | null;
    volume: number | null;
  }[];
  fundamentals?: {
    date: string;
    revenue: number | null;
    ebitda: number | null;
    netIncome: number | null;
  }[];
}

export function adaptYahooHistory(data: YahooHistoryResponse) {
  const points = (data.points || []).map(p => ({
    date: p.date,
    close: p.close,
    adjustedClose: p.adjustedClose,
    volume: p.volume,
  }));
  const fundamentals = (data.fundamentals || []).map(f => ({
    date: f.date,
    revenue: f.revenue,
    ebitda: f.ebitda,
    netIncome: f.netIncome,
  }));
  return { points, fundamentals };
}
