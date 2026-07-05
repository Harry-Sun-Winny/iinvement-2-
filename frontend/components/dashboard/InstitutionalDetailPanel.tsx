import { useState, useMemo, useEffect } from "react";
import { HoldingExt } from "@/app/holdings/page";
import { PositionTab } from "./detail-tabs/PositionTab";
import { RiskTab } from "./detail-tabs/RiskTab";
import { ValuationTab } from "./detail-tabs/ValuationTab";
import { AnalysisTab } from "./detail-tabs/AnalysisTab";
import { IncomeTab } from "./detail-tabs/IncomeTab";
import { HistoryTab } from "./detail-tabs/HistoryTab";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getMarketDetails } from "@/app/lib/api";

const TABS = ["Position", "Risk", "Valuation", "Analysis", "Income", "History"];

export function InstitutionalDetailPanel({ positions, transactions }: { positions: HoldingExt[], transactions: any[] }) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [activeTab, setActiveTab] = useState("Position");
  const [marketData, setMarketData] = useState<any>(null);

  useEffect(() => {
    if (selectedSymbol) {
      getMarketDetails(selectedSymbol).then(data => {
        setMarketData(data);
      });
    }
  }, [selectedSymbol]);

  // Automatically select the largest holding if no symbol is selected yet
  useEffect(() => {
    if (!selectedSymbol && positions.length > 0) {
      const sorted = [...positions].sort((a, b) => b.marketValue - a.marketValue);
      setSelectedSymbol(sorted[0].symbol);
    }
  }, [positions, selectedSymbol]);

  const holding = positions.find(p => p.symbol === selectedSymbol);

  if (!holding) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 font-medium">
        Select an asset to view institutional details.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      
      {/* Header Section */}
      <div className="p-6 pb-0 border-b border-white/5">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-[200px] bg-slate-900 border-slate-700 text-xl font-black text-white h-auto py-2">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                {positions.map(p => (
                  <SelectItem key={p.symbol} value={p.symbol} className="text-slate-200 focus:bg-slate-800">
                    {p.symbol} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm font-medium text-slate-400 pl-1">{holding.name}</p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-black tracking-tight text-white">
              ${(holding.currentPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm font-bold text-emerald-400">
              -- (--) {/* Daily return unavailable in holding object */}
            </p>
            <Badge variant="outline" className="mt-2 text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 uppercase">
              Market Open
            </Badge>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                activeTab === tab 
                  ? "text-blue-400 border-b-2 border-blue-400" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {activeTab === "Position" && <PositionTab holding={holding} transactions={transactions} marketData={marketData} />}
        {activeTab === "Risk" && <RiskTab holding={holding} marketData={marketData} />}
        {activeTab === "Valuation" && <ValuationTab holding={holding} marketData={marketData} />}
        {activeTab === "Analysis" && <AnalysisTab holding={holding} marketData={marketData} />}
        {activeTab === "Income" && <IncomeTab holding={holding} marketData={marketData} />}
        {activeTab === "History" && <HistoryTab holding={holding} transactions={transactions} marketData={marketData} />}
      </div>
      
    </div>
  );
}
