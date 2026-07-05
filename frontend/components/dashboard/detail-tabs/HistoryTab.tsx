import { HoldingExt } from "@/app/holdings/page";

export function HistoryTab({ holding, transactions, marketData }: { holding: HoldingExt, transactions: any[], marketData?: any }) {
  const assetTx = transactions.filter(t => (t.assetSymbol || "").toUpperCase() === holding.symbol.toUpperCase());

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
                      {tx.type} {tx.quantity} {holding.symbol}
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
            <div className="h-24 flex items-center justify-center border border-dashed border-white/5 rounded">
              <span className="text-slate-600 text-xs">-- (No historical P&L data)</span>
            </div>
          </div>
          <div className="antigravity-panel p-4 border-white/5 bg-white/[0.01]">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Dividend History</p>
            <div className="h-24 flex items-center justify-center border border-dashed border-white/5 rounded">
              <span className="text-slate-600 text-xs">-- (No dividend data)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
