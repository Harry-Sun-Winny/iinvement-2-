export interface DailySessionPosition {
  symbol: string;
  portfolioId?: string;
  portfolioName?: string;
  quantity: number;
  currentPrice: number | null;
  previousClose: number | null;
  sessionHigh?: number | null;
  sessionLow?: number | null;
  valueChange?: number | null;
}

export interface DailySessionMover extends DailySessionPosition {
  valueChange: number;
  changePercent: number;
}

export interface DailySessionSummary {
  value: number;
  previousValue: number;
  valueChange: number;
  changePercent: number;
  advancing: number;
  declining: number;
  unchanged: number;
  unavailable: number;
  best: DailySessionMover | null;
  worst: DailySessionMover | null;
  contributors: DailySessionMover[];
}

export function summarizeDailySession(positions: DailySessionPosition[]): DailySessionSummary {
  const movers: DailySessionMover[] = [];
  let value = 0;
  let previousValue = 0;
  let advancing = 0;
  let declining = 0;
  let unchanged = 0;
  let unavailable = 0;

  for (const position of positions) {
    if (
      position.currentPrice == null ||
      position.previousClose == null ||
      !Number.isFinite(position.currentPrice) ||
      !Number.isFinite(position.previousClose) ||
      position.quantity <= 0
    ) {
      unavailable += 1;
      continue;
    }

    const currentValue = position.quantity * position.currentPrice;
    const priorValue = position.quantity * position.previousClose;
    const valueChange = position.valueChange ?? currentValue - priorValue;
    const changePercent = priorValue !== 0 ? (valueChange / priorValue) * 100 : 0;

    value += currentValue;
    previousValue += priorValue;
    if (valueChange > 0) advancing += 1;
    else if (valueChange < 0) declining += 1;
    else unchanged += 1;

    movers.push({ ...position, valueChange, changePercent });
  }

  const valueChange = value - previousValue;
  return {
    value,
    previousValue,
    valueChange,
    changePercent: previousValue !== 0 ? (valueChange / previousValue) * 100 : 0,
    advancing,
    declining,
    unchanged,
    unavailable,
    best: movers.length ? [...movers].sort((a, b) => b.valueChange - a.valueChange)[0] : null,
    worst: movers.length ? [...movers].sort((a, b) => a.valueChange - b.valueChange)[0] : null,
    contributors: [...movers].sort((a, b) => Math.abs(b.valueChange) - Math.abs(a.valueChange)),
  };
}
