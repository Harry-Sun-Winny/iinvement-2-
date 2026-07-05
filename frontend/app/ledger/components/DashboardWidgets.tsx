"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { 
  TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, Activity, DollarSign
} from 'lucide-react';
import { TransactionDTO, BondLedgerDTO, DividendEventDTO } from '../../../types/ledger';
import { calculateHistoricalPerformance, calculateHoldings } from '../services/calculators/portfolioEngine';
import { calculateReceivedDividends } from '../services/calculators/dividendCalculator';
import { calculateBondMetrics } from '../services/calculators/bondCalculator';

interface DashboardWidgetsProps {
  transactions: TransactionDTO[];
  bonds: BondLedgerDTO[];
  dividendEvents: DividendEventDTO[];
  currentPrices: Record<string, number>;
  baseCurrency: string;
  historyPricesMap: Record<string, Record<string, number>>;
}

function useContainerSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !ref.current) return;

    // Initial measure
    const rect = ref.current.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

export default function DashboardWidgets({ 
  transactions, 
  bonds, 
  dividendEvents, 
  currentPrices, 
  baseCurrency,
  historyPricesMap
}: DashboardWidgetsProps) {
  const [chart1Ref, chart1Size] = useContainerSize();
  const [chart2Ref, chart2Size] = useContainerSize();


  
  // Formatters depending on currency
  const formatVal = (v: number) => {
    return new Intl.NumberFormat(baseCurrency === 'USD' ? 'en-US' : 'vi-VN', {
      style: 'currency',
      currency: baseCurrency,
      maximumFractionDigits: 2
    }).format(v);
  };

  const formatCompact = (v: number) => {
    return new Intl.NumberFormat(baseCurrency === 'USD' ? 'en-US' : 'vi-VN', {
      style: 'currency',
      currency: baseCurrency,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(v);
  };
  
  // 1. Portfolio Performance Chart Data
  const performanceData = useMemo(() => {
    return calculateHistoricalPerformance(transactions, currentPrices, historyPricesMap, baseCurrency, bonds);
  }, [transactions, currentPrices, historyPricesMap, baseCurrency, bonds]);

  // 2. Recent Activity Log
  const recentActivities = useMemo(() => {
    const list: { id: string; date: string; title: string; desc: string; type: 'buy' | 'sell' | 'bond' }[] = [];
    
    // Sort transactions and take the latest 5
    const latestTx = [...transactions]
      .filter(t => !t.deletedAt)
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
      .slice(0, 5);

    latestTx.forEach(t => {
      list.push({
        id: t.id,
        date: t.transactionDate,
        title: `${t.type === 'BUY' ? 'Mua' : 'Bán'} ${t.symbol}`,
        desc: `${t.quantity.toLocaleString()} CP @ ${t.price.toLocaleString()}đ`,
        type: t.type === 'BUY' ? 'buy' : 'sell'
      });
    });

    // Add bonds
    const activeBonds = [...bonds]
      .filter(b => !b.deletedAt)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      .slice(0, 3);

    activeBonds.forEach(b => {
      list.push({
        id: b.id,
        date: b.purchaseDate,
        title: `Mua Trái Phiếu ${b.name}`,
        desc: `Mệnh giá: ${(b.faceValue * b.quantity).toLocaleString()}đ, Lãi suất: ${b.couponRate}%`,
        type: 'bond'
      });
    });

    return list
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [transactions, bonds]);

  // 3. Cash Flow Forecast (Next 12 Months)
  const forecastData = useMemo(() => {
    const months = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    
    const monthlyForecast = Array.from({ length: 12 }, (_, i) => ({
      name: months[i],
      dividend: 0,
      coupon: 0,
      total: 0
    }));

    const currentDate = new Date('2026-07-05');
    
    // Future dividends (from 2026-07-05 to 2027-07-05)
    const futureEvents = dividendEvents.filter(e => {
      const pDate = new Date(e.paymentDate);
      const diffTime = pDate.getTime() - currentDate.getTime();
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.43);
      return diffMonths >= 0 && diffMonths < 12;
    });

    const receivedDivs = calculateReceivedDividends(transactions, futureEvents);
    receivedDivs.forEach(d => {
      if (d.type === 'CASH') {
        const monthIndex = new Date(d.paymentDate).getMonth();
        monthlyForecast[monthIndex].dividend += d.payout;
        monthlyForecast[monthIndex].total += d.payout;
      }
    });

    // Future coupons (from 2026-07-05 to 2027-07-05)
    bonds.filter(b => !b.deletedAt && b.status === 'ACTIVE').forEach(b => {
      const metrics = calculateBondMetrics(b, '2026-07-05');
      metrics.couponSchedule.forEach(c => {
        if (c.status === 'UPCOMING') {
          const pDate = new Date(c.paymentDate);
          const diffTime = pDate.getTime() - currentDate.getTime();
          const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.43);
          
          if (diffMonths >= 0 && diffMonths < 12) {
            const monthIndex = pDate.getMonth();
            monthlyForecast[monthIndex].coupon += c.amount;
            monthlyForecast[monthIndex].total += c.amount;
          }
        }
      });
    });

    return monthlyForecast;
  }, [transactions, bonds, dividendEvents]);

  // Summary indicators
  const currentHoldings = useMemo(() => calculateHoldings(transactions, currentPrices, baseCurrency), [transactions, currentPrices, baseCurrency]);
  
  const totalStockValue = useMemo(() => {
    return currentHoldings.reduce((sum, h) => sum + h.marketValue, 0);
  }, [currentHoldings]);

  const totalBondValue = useMemo(() => {
    return bonds
      .filter(b => !b.deletedAt && b.status === 'ACTIVE')
      .reduce((sum, b) => sum + b.faceValue * b.quantity, 0);
  }, [bonds]);

  const totalPortfolioValue = totalStockValue + totalBondValue;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="antigravity-panel p-5 bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Giá Trị Tài Sản</p>
            <h3 className="text-2xl font-black text-white mt-1">{formatVal(totalPortfolioValue)}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Cổ phiếu + Trái phiếu đang giữ</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="antigravity-panel p-5 bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Giá Trị Cổ Phiếu</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{formatVal(totalStockValue)}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Tỷ trọng: {totalPortfolioValue > 0 ? ((totalStockValue / totalPortfolioValue) * 100).toFixed(1) : 0}%</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="antigravity-panel p-5 bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Giá Trị Trái Phiếu</p>
            <h3 className="text-2xl font-black text-blue-400 mt-1">{formatVal(totalBondValue)}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Tỷ trọng: {totalPortfolioValue > 0 ? ((totalBondValue / totalPortfolioValue) * 100).toFixed(1) : 0}%</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Calendar className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main performance chart & activity logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 lg:h-[350px] h-[300px] p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Hiệu Suất Danh Mục Lịch Sử (Từ 2010)</h4>
              <p className="text-xs text-slate-400">Giá trị thị trường so với Giá vốn danh mục</p>
            </div>
          </div>
          <div ref={chart1Ref} className="w-full h-[250px] text-xs">
            {chart1Size.width > 0 && chart1Size.height > 0 ? (
              <AreaChart width={chart1Size.width} height={chart1Size.height} data={performanceData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="year" stroke="#475569" />
                <YAxis stroke="#475569" tickFormatter={(v) => formatCompact(v)} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                  formatter={(v: any) => [formatVal(Number(v)), '']}
                />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Area type="monotone" name="Giá Trị Thị Trường" dataKey="marketValue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVal)" />
                <Area type="monotone" name="Giá Vốn Đã Chi" dataKey="costBasis" stroke="#94a3b8" fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            ) : (
              <div className="h-full w-full bg-white/[0.02] animate-pulse rounded-lg" />
            )}
          </div>
        </div>

        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col h-[350px]">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-400" /> Hoạt Động Gần Đây
          </h4>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar text-xs">
            {recentActivities.map(act => (
              <div key={act.id} className="p-3 rounded-lg bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 flex items-center justify-between transition-colors">
                <div>
                  <p className="font-semibold text-slate-200">{act.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{act.desc}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    act.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' :
                    act.type === 'sell' ? 'bg-red-500/10 text-red-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {act.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cash Flow Forecast bar chart */}
      <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl h-[300px] flex flex-col">
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Dự Phóng Dòng Tiền 12 Tháng Tới (Dividend & Bond Coupons)</h4>
          <p className="text-xs text-slate-400">Ước tính các kỳ thanh toán tiền mặt theo lịch công bố & cam kết của trái phiếu</p>
        </div>
        <div ref={chart2Ref} className="w-full h-[190px] text-xs mt-4">
          {chart2Size.width > 0 && chart2Size.height > 0 ? (
            <BarChart width={chart2Size.width} height={chart2Size.height} data={forecastData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#475569" />
              <YAxis stroke="#475569" tickFormatter={(v) => formatCompact(v)} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                formatter={(v: any) => [formatVal(Number(v)), '']}
              />
              <Legend />
              <Bar name="Lãi Coupon Trái Phiếu" dataKey="coupon" fill="#3b82f6" stackId="a" />
              <Bar name="Cổ Tức Tiền Mặt" dataKey="dividend" fill="#10b981" stackId="a" />
            </BarChart>
          ) : (
            <div className="h-full w-full bg-white/[0.02] animate-pulse rounded-lg" />
          )}
        </div>
      </div>
    </div>
  );
}
