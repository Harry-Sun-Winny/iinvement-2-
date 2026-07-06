import { useState, useEffect, useMemo } from "react";
import { HoldingExt } from "@/app/holdings/page";

export function HistoryTab({ holding, transactions, marketData }: { holding: HoldingExt, transactions: any[], marketData?: any }) {
  const assetTx = transactions.filter(t => (t.assetSymbol || "").toUpperCase() === holding.symbol.toUpperCase());

  const [divHistory, setDivHistory] = useState<any[]>([]);
  const [loadingDiv, setLoadingDiv] = useState(false);

  useEffect(() => {
    setLoadingDiv(true);
    fetch(`/api/stock-dividends?symbol=${encodeURIComponent(holding.symbol)}&startDate=2020-01-01`)
      .then(res => res.json())
      .then(data => {
        setDivHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => setDivHistory([]))
      .finally(() => setLoadingDiv(false));
  }, [holding.symbol]);

  const realizedPnLByQuarter = useMemo(() => {
    const chronologicalTx = [...assetTx].sort(
      (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    let qty = 0;
    let cost = 0;
    const qMap = new Map<string, number>();

    chronologicalTx.forEach(tx => {
      const side = tx.type.toUpperCase();
      const quantity = Number(tx.quantity || 0);
      const price = Number(tx.price || 0);

      if (side === "BUY") {
        qty += quantity;
        cost += quantity * price;
      } else if (side === "SELL") {
        const avgCost = qty > 0 ? cost / qty : price;
        const pnl = (price - avgCost) * quantity;
        
        const date = new Date(tx.transactionDate);
        const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
        
        qMap.set(quarter, (qMap.get(quarter) || 0) + pnl);

        qty -= quantity;
        cost = Math.max(0, cost - avgCost * quantity);
      }
    });

    return Array.from(qMap.entries())
      .map(([quarter, value]) => ({ quarter, value }))
      .sort((a, b) => b.quarter.localeCompare(a.quarter)); // Sort descending
  }, [assetTx]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Transaction History */}
        <div className="antigravity-panel p-6 border-white/5 bg-white/[0.01]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Transaction History</p>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
            {assetTx.length > 0 ? (
              assetTx.map((tx, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded bg-white/[0.02] border border-white/5 text-sm">
                  <div>
                    <p className={`font-bold ${tx.type === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                      {tx.type} {tx.quantity.toLocaleString()} {holding.symbol}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(tx.transactionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-200">
                      ${Number(tx.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500">
                      Total: ${(Number(tx.price) * Number(tx.quantity)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No transactions found.</p>
            )}
          </div>
        </div>

        {/* Realized P&L / Dividends */}
        <div className="space-y-6">
          <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Realized P&L by Quarter</p>
            <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
              {realizedPnLByQuarter.length > 0 ? (
                realizedPnLByQuarter.map((q, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 rounded bg-white/[0.01] border border-white/5 text-xs">
                    <span className="font-medium text-slate-400">{q.quarter}</span>
                    <span className={`font-bold ${q.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {q.value >= 0 ? "+" : ""}${q.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-16 flex items-center justify-center border border-dashed border-white/5 rounded">
                  <span className="text-slate-600 text-xs">-- (No realized P&L data)</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Dividend History</p>
            <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
              {loadingDiv ? (
                <p className="text-xs text-slate-500">Loading...</p>
              ) : divHistory.length > 0 ? (
                divHistory.slice(0, 10).map((div, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 rounded bg-white/[0.01] border border-white/5 text-xs">
                    <span className="font-medium text-slate-400">{new Date(div.paymentDate).toLocaleDateString()}</span>
                    <span className="font-bold text-emerald-400">
                      +${div.dividendRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-16 flex items-center justify-center border border-dashed border-white/5 rounded">
                  <span className="text-slate-600 text-xs">-- (No dividend data)</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
