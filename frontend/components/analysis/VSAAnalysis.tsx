"use client";

import React, { useState } from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

interface VSAStock {
  ticker: string;
  name: string;
  spread: string;
  volume: string;
  pattern: string;
  smartMoney: string;
  signal: string;
}

const VSA_MOCK: Record<string, VSAStock> = {
  VNM: {
    ticker: "VNM",
    name: "Vinamilk",
    spread: "Bình thường",
    volume: "Cao",
    pattern: "Accumulation",
    smartMoney: "Tích lũy",
    signal: "Mua",
  },
  FPT: {
    ticker: "FPT",
    name: "FPT Corporation",
    spread: "Rộng",
    volume: "Rất cao",
    pattern: "Breakout",
    smartMoney: "Phân phối nhẹ",
    signal: "Mua mạnh",
  },
  HPG: {
    ticker: "HPG",
    name: "Hòa Phát Group",
    spread: "Hẹp",
    volume: "Thấp",
    pattern: "No Demand",
    smartMoney: "Không rõ",
    signal: "Trung tính",
  },
  VCB: {
    ticker: "VCB",
    name: "Vietcombank",
    spread: "Rất rộng",
    volume: "Cực cao",
    pattern: "Buying Climax",
    smartMoney: "Phân phối",
    signal: "Bán",
  },
  MWG: {
    ticker: "MWG",
    name: "Thế Giới Di Động",
    spread: "Bình thường",
    volume: "Cao",
    pattern: "Accumulation",
    smartMoney: "Tích lũy",
    signal: "Mua",
  },
  GAS: {
    ticker: "GAS",
    name: "PV GAS",
    spread: "Rộng",
    volume: "Cao",
    pattern: "Breakout",
    smartMoney: "Tích lũy mạnh",
    signal: "Mua mạnh",
  },
};

function SignalBadge({ signal }: { signal: string }) {
  const isBuy = signal.includes("Mua");
  const isSell = signal.includes("Bán");
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
      isBuy ? "bg-emerald-500/10 text-emerald-400" : 
      isSell ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
    }`}>
      {signal}
    </span>
  );
}

import type { PositionSummary } from "@/types/analysis";

export default function VSAAnalysis({ positions }: { positions: PositionSummary[] }) {
  const dynamicMock = React.useMemo(() => {
    if (!positions || positions.length === 0) return VSA_MOCK;
    const result: Record<string, VSAStock> = {};
    positions.forEach((p) => {
      if (VSA_MOCK[p.symbol]) {
        result[p.symbol] = VSA_MOCK[p.symbol];
      } else {
        result[p.symbol] = {
          ticker: p.symbol,
          name: p.name || p.symbol,
          spread: "Không rõ",
          volume: "Không rõ",
          pattern: "Chưa phân tích",
          smartMoney: "Chưa rõ",
          signal: "Trung lập",
        };
      }
    });
    return result;
  }, [positions]);

  const availableTickers = Object.keys(dynamicMock);
  const [selectedTicker, setSelectedTicker] = useState(availableTickers[0] || "FPT");
  const stock = dynamicMock[selectedTicker] || dynamicMock[availableTickers[0]] || VSA_MOCK["FPT"];

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">Tín hiệu VSA tổng hợp</div>
          <div className="text-2xl font-bold text-purple-400">TÍCH LŨY</div>
          <div className="text-[11px] text-emerald-400 mt-1">Smart money đang mua</div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">Khối lượng hôm nay</div>
          <div className="text-2xl font-bold text-emerald-400">↑ +48%</div>
          <div className="text-[11px] text-[#6B7FA3] mt-1">So với TB 20 phiên</div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">Up/Down Vol Ratio</div>
          <div className="text-2xl font-bold text-emerald-400">3.24</div>
          <div className="text-[11px] text-[#6B7FA3] mt-1">Dòng tiền vào mạnh</div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">OBV Trend</div>
          <div className="text-2xl font-bold text-emerald-400">Tăng mạnh</div>
          <div className="text-[11px] text-[#6B7FA3] mt-1">Xu hướng tích luỹ</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider mb-3">Phân tích Spread-Volume</div>
          <div className="space-y-2">
            {[
              { lbl: "Phiên hôm nay", val: "Up Bar — High Vol", status: "pos" },
              { lbl: "Spread nến", val: stock.spread, status: "pos" },
              { lbl: "Đóng cửa", val: "Gần high", status: "pos" },
              { lbl: "Diễn giải VSA", val: "Demand > Supply", status: "pos" },
              { lbl: "Giai đoạn Wyckoff", val: "Phase C — SOS", status: "pos" },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-[#6B7FA3]">{row.lbl}</span>
                <span className={`text-xs font-medium ${row.status === "pos" ? "text-emerald-400" : "text-rose-400"}`}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider mb-3">Chỉ báo dòng tiền</div>
          <div className="space-y-2">
            {[
              { lbl: "Money Flow Index (MFI)", val: "72.1 — Dương", status: "pos" },
              { lbl: "Chaikin Money Flow", val: "+0.38", status: "pos" },
              { lbl: "OBV trend", val: "↑ Tăng liên tục", status: "pos" },
              { lbl: "Volume Price Trend", val: "+14.2", status: "pos" },
              { lbl: "Accum/Dist", val: "Tích lũy mạnh", status: "pos" },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-[#6B7FA3]">{row.lbl}</span>
                <span className={`text-xs font-medium ${row.status === "pos" ? "text-emerald-400" : "text-rose-400"}`}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider mb-3">Phân tích Wyckoff</div>
          <div className="space-y-3">
            {[
              { label: "Preliminary Support", status: "done" },
              { label: "Selling Climax", status: "done" },
              { label: "Automatic Rally", status: "done" },
              { label: "Secondary Test", status: "done" },
              { label: "Sign of Strength (SOS)", status: "active" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step.status === "done" ? "bg-emerald-400 text-[#0B0E14]" : "bg-purple-500 text-white"}`}>
                  {step.status === "done" ? "✓" : "!"}
                </div>
                <span className={`text-xs ${step.status === "active" ? "text-emerald-400 font-bold" : "text-[#E7E9EE]"}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="antigravity-panel border-white/5 bg-white/[0.01] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
          <span className="text-xs font-semibold text-purple-400 uppercase">Tổng hợp VSA danh mục</span>
          <div className="flex gap-2">
            {Object.keys(dynamicMock).map((t) => (
              <button 
                key={t} 
                onClick={() => setSelectedTicker(t)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedTicker === t ? "bg-purple-500 text-white" : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-white/[0.015] text-[#6B7FA3] uppercase">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Spread</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Pattern</th>
                <th className="px-4 py-3">Smart Money</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(dynamicMock).map((s) => (
                <tr 
                  key={s.ticker} 
                  onClick={() => setSelectedTicker(s.ticker)}
                  className={`cursor-pointer border-b border-white/5 hover:bg-white/[0.02] ${selectedTicker === s.ticker ? "bg-white/[0.02]" : ""}`}
                >
                  <td className="px-4 py-3 font-bold text-[#E7E9EE]">{s.ticker}</td>
                  <td className="px-4 py-3">{s.spread}</td>
                  <td className="px-4 py-3">{s.volume}</td>
                  <td className="px-4 py-3">{s.pattern}</td>
                  <td className="px-4 py-3">{s.smartMoney}</td>
                  <td className="px-4 py-3"><SignalBadge signal={s.signal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
