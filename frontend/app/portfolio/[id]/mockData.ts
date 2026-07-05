// ─── Mock Data ────────────────────────────────────────────────────────────────
// Realistic 18-month dataset for the Bloomberg-style analytics dashboard.
// All values in USD.

export interface MockTransaction {
  id: string;
  date: string; // ISO date
  asset: string;
  type: "BUY" | "SELL" | "SWAP";
  quantity: number;
  price: number;
  fee: number;      // USD
  slippage: number; // USD
}

export interface PriceHistoryPoint {
  date: string;
  portfolioValue: number;
  btcValue: number;
  ethValue: number;
  sp500Value: number;
}

// ─── 39 Transactions spanning Jan 2024 – Jun 2025 ────────────────────────────
export const MOCK_TRANSACTIONS: MockTransaction[] = [
  // ── Jan 2024 ──
  { id: "tx01", date: "2024-01-08", asset: "BTC",   type: "BUY",  quantity: 0.45,  price: 43800, fee: 62.0,  slippage: 12.0 },
  { id: "tx02", date: "2024-01-15", asset: "ETH",   type: "BUY",  quantity: 6.0,   price: 2580,  fee: 38.0,  slippage: 8.0  },
  { id: "tx03", date: "2024-01-22", asset: "SOL",   type: "BUY",  quantity: 120,   price: 98,    fee: 28.0,  slippage: 5.0  },
  // ── Feb 2024 ──
  { id: "tx04", date: "2024-02-05", asset: "BNB",   type: "BUY",  quantity: 22,    price: 318,   fee: 17.0,  slippage: 3.0  },
  { id: "tx05", date: "2024-02-14", asset: "BTC",   type: "BUY",  quantity: 0.25,  price: 51200, fee: 32.0,  slippage: 9.0  },
  { id: "tx06", date: "2024-02-28", asset: "MATIC", type: "BUY",  quantity: 4200,  price: 1.05,  fee: 11.0,  slippage: 2.0  },
  // ── Mar 2024 ──
  { id: "tx07", date: "2024-03-08", asset: "ETH",   type: "BUY",  quantity: 3.5,   price: 3580,  fee: 30.5,  slippage: 7.0  },
  { id: "tx08", date: "2024-03-15", asset: "AVAX",  type: "BUY",  quantity: 80,    price: 52,    fee: 10.0,  slippage: 2.0  },
  { id: "tx09", date: "2024-03-28", asset: "SOL",   type: "SELL", quantity: 60,    price: 192,   fee: 28.8,  slippage: 6.0  },
  // ── Apr 2024 ──
  { id: "tx10", date: "2024-04-10", asset: "BTC",   type: "SELL", quantity: 0.2,   price: 69400, fee: 55.5,  slippage: 18.0 },
  { id: "tx11", date: "2024-04-18", asset: "MATIC", type: "SELL", quantity: 2000,  price: 0.78,  fee: 39.0,  slippage: 9.0  },
  { id: "tx12", date: "2024-04-25", asset: "AVAX",  type: "BUY",  quantity: 50,    price: 38,    fee: 4.8,   slippage: 1.0  },
  // ── May 2024 ──
  { id: "tx13", date: "2024-05-07", asset: "ETH",   type: "SELL", quantity: 2.0,   price: 3020,  fee: 24.2,  slippage: 5.0  },
  { id: "tx14", date: "2024-05-16", asset: "SOL",   type: "BUY",  quantity: 90,    price: 168,   fee: 37.8,  slippage: 8.0  },
  { id: "tx15", date: "2024-05-29", asset: "BNB",   type: "SELL", quantity: 10,    price: 585,   fee: 58.5,  slippage: 12.0 },
  // ── Jun 2024 ──
  { id: "tx16", date: "2024-06-11", asset: "BTC",   type: "BUY",  quantity: 0.18,  price: 67100, fee: 30.2,  slippage: 7.0  },
  { id: "tx17", date: "2024-06-24", asset: "AVAX",  type: "SELL", quantity: 70,    price: 28,    fee: 49.0,  slippage: 11.0 },
  { id: "tx18", date: "2024-06-30", asset: "MATIC", type: "BUY",  quantity: 5000,  price: 0.62,  fee: 7.8,   slippage: 2.0  },
  // ── Jul 2024 ──
  { id: "tx19", date: "2024-07-09", asset: "ETH",   type: "BUY",  quantity: 4.0,   price: 2940,  fee: 29.4,  slippage: 6.0  },
  { id: "tx20", date: "2024-07-22", asset: "SOL",   type: "SELL", quantity: 90,    price: 148,   fee: 66.6,  slippage: 14.0 },
  // ── Aug 2024 ──
  { id: "tx21", date: "2024-08-05", asset: "BTC",   type: "SELL", quantity: 0.15,  price: 58200, fee: 43.7,  slippage: 10.0 },
  { id: "tx22", date: "2024-08-19", asset: "BNB",   type: "BUY",  quantity: 18,    price: 495,   fee: 22.3,  slippage: 4.0  },
  { id: "tx23", date: "2024-08-28", asset: "AVAX",  type: "BUY",  quantity: 120,   price: 25,    fee: 7.5,   slippage: 2.0  },
  // ── Sep 2024 ──
  { id: "tx24", date: "2024-09-10", asset: "ETH",   type: "SELL", quantity: 3.0,   price: 2380,  fee: 21.4,  slippage: 5.0  },
  { id: "tx25", date: "2024-09-23", asset: "MATIC", type: "SELL", quantity: 3000,  price: 0.45,  fee: 33.8,  slippage: 8.0  },
  // ── Oct 2024 ──
  { id: "tx26", date: "2024-10-04", asset: "BTC",   type: "BUY",  quantity: 0.30,  price: 62400, fee: 46.8,  slippage: 11.0 },
  { id: "tx27", date: "2024-10-17", asset: "SOL",   type: "BUY",  quantity: 75,    price: 175,   fee: 32.8,  slippage: 7.0  },
  { id: "tx28", date: "2024-10-30", asset: "ETH",   type: "BUY",  quantity: 5.0,   price: 2680,  fee: 33.5,  slippage: 7.0  },
  // ── Nov 2024 ──
  { id: "tx29", date: "2024-11-12", asset: "BTC",   type: "SELL", quantity: 0.25,  price: 88500, fee: 55.3,  slippage: 20.0 },
  { id: "tx30", date: "2024-11-26", asset: "SOL",   type: "SELL", quantity: 75,    price: 242,   fee: 45.4,  slippage: 9.0  },
  // ── Dec 2024 ──
  { id: "tx31", date: "2024-12-05", asset: "BNB",   type: "SELL", quantity: 18,    price: 720,   fee: 64.8,  slippage: 15.0 },
  { id: "tx32", date: "2024-12-18", asset: "BTC",   type: "BUY",  quantity: 0.12,  price: 101500,fee: 30.5,  slippage: 14.0 },
  { id: "tx33", date: "2024-12-29", asset: "AVAX",  type: "SELL", quantity: 120,   price: 42,    fee: 25.2,  slippage: 5.0  },
  // ── Jan 2025 ──
  { id: "tx34", date: "2025-01-08", asset: "ETH",   type: "SELL", quantity: 4.0,   price: 3380,  fee: 33.8,  slippage: 8.0  },
  { id: "tx35", date: "2025-01-21", asset: "SOL",   type: "BUY",  quantity: 55,    price: 220,   fee: 30.3,  slippage: 6.0  },
  // ── Feb 2025 ──
  { id: "tx36", date: "2025-02-10", asset: "MATIC", type: "SELL", quantity: 2000,  price: 0.38,  fee: 19.0,  slippage: 4.0  },
  { id: "tx37", date: "2025-02-25", asset: "BTC",   type: "SELL", quantity: 0.12,  price: 86200, fee: 51.7,  slippage: 12.0 },
  // ── Mar 2025 ──
  { id: "tx38", date: "2025-03-14", asset: "ETH",   type: "BUY",  quantity: 8.0,   price: 1980,  fee: 39.6,  slippage: 8.0  },
  // ── May 2025 ──
  { id: "tx39", date: "2025-05-20", asset: "SOL",   type: "SELL", quantity: 55,    price: 178,   fee: 24.6,  slippage: 5.0  },
];

// ─── Current prices (as of dashboard render) ────────────────────────────────
export const MOCK_CURRENT_PRICES: Record<string, number> = {
  BTC:   105000,
  ETH:    2480,
  SOL:     175,
  BNB:     620,
  MATIC:  0.52,
  AVAX:    28,
};

// ─── 18-month equity curve (weekly sampled) ──────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function interpolateSeries(checkpoints: [number, number][], len: number): number[] {
  const out: number[] = new Array(len).fill(0);
  for (let cp = 0; cp < checkpoints.length - 1; cp++) {
    const [i0, v0] = checkpoints[cp];
    const [i1, v1] = checkpoints[cp + 1];
    for (let i = i0; i <= i1 && i < len; i++) {
      const t = (i - i0) / (i1 - i0);
      const noise = Math.sin(i * 73.1 + cp * 211.3) * (Math.abs(v1 - v0)) * 0.03;
      out[i] = lerp(v0, v1, t) + noise;
    }
  }
  const last = checkpoints[checkpoints.length - 1];
  for (let i = last[0]; i < len; i++) out[i] = last[1];
  return out;
}

function buildPriceHistory(): PriceHistoryPoint[] {
  const startDate = new Date("2024-01-01");
  const n = 78; // ~18 months of weekly points

  const btcPrices  = interpolateSeries([[0,43800],[17,73000],[30,55000],[44,65000],[50,88500],[60,101500],[70,92000],[77,105000]], n);
  const ethPrices  = interpolateSeries([[0,2300],[14,3900],[30,2400],[44,2680],[52,3900],[60,3380],[70,1980],[77,2480]], n);
  const sp5Prices  = interpolateSeries([[0,4750],[20,5300],[40,5400],[52,5700],[60,5900],[70,5600],[77,5480]], n);
  const portValues = interpolateSeries([[0,80000],[9,95000],[17,128000],[30,92000],[44,115000],[50,158000],[57,195000],[65,168000],[70,145000],[77,172000]], n);

  return Array.from({ length: n }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i * 7);
    return {
      date: d.toISOString().slice(0, 10),
      portfolioValue: Math.round(portValues[i]),
      btcValue:  Math.round(btcPrices[i]),
      ethValue:  Math.round(ethPrices[i]),
      sp500Value: Math.round(sp5Prices[i]),
    };
  });
}

export const MOCK_PRICE_HISTORY = buildPriceHistory();

// ─── Portfolio position helper ────────────────────────────────────────────────
export interface PortfolioPosition {
  asset: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  currentValue: number;
}

export function computePortfolio(
  txs: MockTransaction[],
  prices: Record<string, number>
): PortfolioPosition[] {
  const map: Record<string, { qty: number; cost: number }> = {};
  for (const tx of txs) {
    if (!map[tx.asset]) map[tx.asset] = { qty: 0, cost: 0 };
    if (tx.type === "BUY") {
      map[tx.asset].cost += tx.quantity * tx.price;
      map[tx.asset].qty  += tx.quantity;
    } else if (tx.type === "SELL") {
      const avgC = map[tx.asset].qty > 0 ? map[tx.asset].cost / map[tx.asset].qty : 0;
      const sold = Math.min(tx.quantity, map[tx.asset].qty);
      map[tx.asset].qty  -= sold;
      map[tx.asset].cost -= sold * avgC;
    }
  }
  return Object.entries(map)
    .filter(([, v]) => v.qty > 0.000001)
    .map(([asset, v]) => ({
      asset,
      quantity: v.qty,
      avgCost: v.qty > 0 ? v.cost / v.qty : 0,
      currentPrice: prices[asset] ?? 0,
      currentValue: v.qty * (prices[asset] ?? 0),
    }));
}
