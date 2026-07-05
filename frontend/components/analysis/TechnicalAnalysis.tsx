"use client";

import React, { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

interface TechStock {
  ticker: string;
  name: string;
  price: number;
  rsi: number;
  macd: string;
  ma: string;
  bb: string;
  support: number[];
  resist: number[];
  signal: string;
}

const TECH_MOCK: Record<string, TechStock> = {
  VNM: {
    ticker: "VNM",
    name: "Vinamilk",
    price: 68500,
    rsi: 42,
    macd: "Phân kỳ giảm",
    ma: "Dưới MA50",
    bb: "Dưới BB giữa",
    support: [65000, 62000],
    resist: [71000, 75000],
    signal: "Trung tính",
  },
  FPT: {
    ticker: "FPT",
    name: "FPT Corporation",
    price: 142300,
    rsi: 68,
    macd: "Tăng mạnh",
    ma: "Golden Cross",
    bb: "Gần BB trên",
    support: [135000, 130000],
    resist: [148000, 155000],
    signal: "Mua mạnh",
  },
  HPG: {
    ticker: "HPG",
    name: "Hòa Phát Group",
    price: 27800,
    rsi: 55,
    macd: "Tăng",
    ma: "Trên MA50",
    bb: "Giữa BB",
    support: [26000, 25000],
    resist: [29000, 31000],
    signal: "Mua",
  },
  VCB: {
    ticker: "VCB",
    name: "Vietcombank",
    price: 91200,
    rsi: 72,
    macd: "Overbought",
    ma: "Xa trên MA",
    bb: "Vượt BB trên",
    support: [88000, 85000],
    resist: [95000, 98000],
    signal: "Bán",
  },
  MWG: {
    ticker: "MWG",
    name: "Thế Giới Di Động",
    price: 54100,
    rsi: 48,
    macd: "Trung tính",
    ma: "Dưới MA200",
    bb: "Dưới BB giữa",
    support: [51000, 48000],
    resist: [58000, 62000],
    signal: "Trung lập",
  },
  GAS: {
    ticker: "GAS",
    name: "PV GAS",
    price: 73400,
    rsi: 61,
    macd: "Tăng",
    ma: "Uptrend",
    bb: "Trên BB giữa",
    support: [70000, 68000],
    resist: [78000, 82000],
    signal: "Mua",
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

export default function TechnicalAnalysis({ positions }: { positions: PositionSummary[] }) {
  const dynamicMock = useMemo(() => {
    if (!positions || positions.length === 0) return TECH_MOCK;
    const result: Record<string, TechStock> = {};
    positions.forEach((p) => {
      if (TECH_MOCK[p.symbol]) {
        result[p.symbol] = { ...TECH_MOCK[p.symbol], price: p.currentPrice };
      } else {
        result[p.symbol] = {
          ticker: p.symbol,
          name: p.name || p.symbol,
          price: p.currentPrice,
          rsi: 50,
          macd: "Chưa rõ",
          ma: "Không đủ dữ liệu",
          bb: "Bình thường",
          support: [],
          resist: [],
          signal: "Trung lập",
        };
      }
    });
    return result;
  }, [positions]);

  const availableTickers = Object.keys(dynamicMock);
  const [selectedTicker, setSelectedTicker] = useState(availableTickers[0] || "FPT");
  
  // fallback if selectedTicker is somehow not in the object (e.g. portfolio changed)
  const stock = dynamicMock[selectedTicker] || dynamicMock[availableTickers[0]] || TECH_MOCK["FPT"];

  const rsiColor = (v: number) => {
    if (v > 70) return "text-rose-400";
    if (v < 30) return "text-emerald-400";
    return "text-amber-400";
  };

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">Xu hướng chính ({selectedTicker})</div>
          <div className={`text-2xl font-bold ${stock.signal.includes("Mua") ? "text-emerald-400" : "text-rose-400"}`}>
            {stock.signal.includes("Mua") ? "TĂNG" : "GIẢM"}
          </div>
          <div className="text-[11px] text-[#6B7FA3] mt-1">{stock.ma}</div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">RSI (14)</div>
          <div className={`text-2xl font-bold ${rsiColor(stock.rsi)}`}>{stock.rsi}</div>
          <div className="text-[11px] text-[#6B7FA3] mt-1">
            {stock.rsi > 70 ? "Quá mua" : stock.rsi < 30 ? "Quá bán" : "Bình thường"}
          </div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">MACD Signal</div>
          <div className="text-2xl font-bold text-[#E7E9EE]">{stock.macd}</div>
          <div className="text-[11px] text-emerald-400 mt-1">Histogram dương</div>
        </div>
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] text-[#6B7FA3] uppercase tracking-wider mb-1">Tín hiệu tổng hợp</div>
          <div className="text-2xl font-bold text-[#E7E9EE]">8/12</div>
          <div className="text-[11px] text-emerald-400 mt-1">Chỉ báo đồng thuận MUA</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="antigravity-panel border-white/5 bg-white/[0.01] p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-3">Chỉ báo xu hướng</div>
          <div className="space-y-2">
            {[
              { lbl: "MA20 / MA50", val: "Cắt lên", status: "pos" },
              { lbl: "MA50 / MA200", val: "Golden Cross", status: "pos" },
              { lbl: "ADX (14)", val: "42.1 — Mạnh", status: "pos" },
              { lbl: "Parabolic SAR", val: "Dưới giá → MUA", status: "pos" },
              { lbl: "Ichimoku Cloud", val: "Trên mây xanh", status: "pos" },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-[#6B7FA3]">{row.lbl}</span>
                <span className={`text-xs font-medium ${row.status === "pos" ? "text-emerald-400" : "text-rose-400"}`}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#0D1528] border border-[#1A2540] p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-3">Dao động & Momentum</div>
          <div className="space-y-2">
            {[
              { lbl: "RSI(14)", val: `${stock.rsi} — Chú ý`, status: "amb" },
              { lbl: "Stochastic %K", val: "74.2", status: "amb" },
              { lbl: "MACD", val: "+2.41 (Bull)", status: "pos" },
              { lbl: "CCI (20)", val: "+148 — Tăng", status: "pos" },
              { lbl: "Williams %R", val: "-22 — MUA", status: "pos" },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-[#1A2540] last:border-0">
                <span className="text-xs text-[#6B7FA3]">{row.lbl}</span>
                <span className={`text-xs font-medium ${row.status === "pos" ? "text-emerald-400" : row.status === "amb" ? "text-amber-400" : "text-rose-400"}`}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#0D1528] border border-[#1A2540] p-4 rounded-xl">
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-3">Hỗ trợ & Kháng cự</div>
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="text-center">
              <div className="text-[11px] text-rose-400 uppercase mb-1">Kháng cự</div>
              <div className="space-y-1">
                {stock.resist.map((r, i) => <div key={i} className="text-sm font-bold text-rose-400">{r.toLocaleString()} ₫</div>)}
              </div>
            </div>
            <div className="text-center py-2 px-4 bg-white/[0.03] rounded-lg">
              <div className="text-xs text-[#6B7FA3]">Giá hiện tại</div>
              <div className="text-xl font-bold text-[#E7E9EE]">{stock.price.toLocaleString()} ₫</div>
            </div>
            <div className="text-center">
              <div className="text-[11px] text-emerald-400 uppercase mb-1">Hỗ trợ</div>
              <div className="space-y-1">
                {stock.support.map((s, i) => <div key={i} className="text-sm font-bold text-emerald-400">{s.toLocaleString()} ₫</div>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="antigravity-panel border-white/5 bg-white/[0.01] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
          <span className="text-xs font-semibold text-blue-400 uppercase">So sánh tín hiệu danh mục</span>
          <div className="flex gap-2">
            {Object.keys(dynamicMock).map((t) => (
              <button 
                key={t} 
                onClick={() => setSelectedTicker(t)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedTicker === t ? "bg-blue-500 text-white" : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]"}`}
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
                <th className="px-4 py-3">RSI</th>
                <th className="px-4 py-3">MACD</th>
                <th className="px-4 py-3">MA(50/200)</th>
                <th className="px-4 py-3">BB</th>
                <th className="px-4 py-3">Tín hiệu</th>
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
                  <td className={`px-4 py-3 ${rsiColor(s.rsi)}`}>{s.rsi}</td>
                  <td className="px-4 py-3">{s.macd}</td>
                  <td className="px-4 py-3">{s.ma}</td>
                  <td className="px-4 py-3">{s.bb}</td>
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
