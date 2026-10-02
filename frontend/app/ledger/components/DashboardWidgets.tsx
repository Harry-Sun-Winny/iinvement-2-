"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, LabelList, Legend
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
  /** Stock value calculated by the shared Dashboard/Holdings finance pipeline. */
  displayStockValue?: number | null;
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
  historyPricesMap,
  displayStockValue
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
  const formatChartValue = (value: number) => new Intl.NumberFormat(
    baseCurrency === 'USD' ? 'en-US' : 'vi-VN',
    { style: 'currency', currency: baseCurrency, maximumFractionDigits: 0 }
  ).format(value);
  
  // 1. Portfolio Performance Chart Data
  const performanceData = useMemo(() => {
    return calculateHistoricalPerformance(transactions, currentPrices, historyPricesMap, baseCurrency, bonds);
  }, [transactions, currentPrices, historyPricesMap, baseCurrency, bonds]);

  // P/L must always be derived from the two values shown at the same checkpoint.
  // This also protects the chart from stale cached pnl values after a price refresh.
  const chartPerformanceData = useMemo(() => performanceData.map((point) => ({
    ...point,
    pnl: point.marketValue - point.costBasis,
  })), [performanceData]);

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

  // 3. Cash Flow Forecast (next 12 calendar months, beginning this month).
  // It only uses declared dividend payment dates and active-bond coupon schedules.
  // Do not invent future income when the source schedule has no future records.
  const forecastData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const horizon = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() + index, 1);
      return { key: monthKey(date), name: `T${date.getMonth() + 1}/${date.getFullYear()}`, dividend: 0, coupon: 0, total: 0 };
    });
    const forecastByMonth = new Map(horizon.map((month, index) => [month.key, index]));

    const receivedDivs = calculateReceivedDividends(transactions, dividendEvents, baseCurrency);
    receivedDivs.forEach((dividend) => {
      if (dividend.type !== 'CASH' || dividend.isValid) return;
      const monthIndex = forecastByMonth.get(monthKey(new Date(dividend.paymentDate)));
      if (monthIndex == null) return;
      horizon[monthIndex].dividend += dividend.payout;
      horizon[monthIndex].total += dividend.payout;
    });

    const todayIso = today.toISOString().slice(0, 10);
    bonds.filter((bond) => !bond.deletedAt && bond.status === 'ACTIVE').forEach((bond) => {
      const metrics = calculateBondMetrics(bond, todayIso);
      metrics.couponSchedule.forEach((coupon) => {
        if (coupon.status !== 'UPCOMING') return;
        const monthIndex = forecastByMonth.get(monthKey(new Date(coupon.paymentDate)));
        if (monthIndex == null) return;
        horizon[monthIndex].coupon += coupon.amount;
        horizon[monthIndex].total += coupon.amount;
      });
    });

    return horizon;
  }, [transactions, bonds, dividendEvents, baseCurrency]);
  const hasForecastData = forecastData.some((month) => month.total > 0);
  // Summary indicators
  const currentHoldings = useMemo(() => calculateHoldings(transactions, currentPrices, baseCurrency), [transactions, currentPrices, baseCurrency]);
  
  const calculatedStockValue = useMemo(() => {
    return currentHoldings.reduce((sum, h) => sum + h.marketValue, 0);
  }, [currentHoldings]);
  const totalStockValue = displayStockValue ?? calculatedStockValue;

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
        <div className="lg:col-span-2 lg:h-[525px] h-[450px] p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Hiệu Suất Danh Mục Lịch Sử (Từ 2010)</h4>
              <p className="text-xs text-slate-400">Giá trị thị trường so với Giá vốn danh mục</p>
            </div>
          </div>
          <div ref={chart1Ref} className="w-full h-[390px] text-xs">
            {chart1Size.width > 0 && chart1Size.height > 0 ? (
              <AreaChart width={chart1Size.width} height={chart1Size.height} data={chartPerformanceData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                <YAxis stroke="#475569" width={156} tickFormatter={(v) => formatChartValue(Number(v))} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                  formatter={(v: any, name: any) => [formatVal(Number(v)), name]}
                />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Area type="monotone" name="Giá Trị Thị Trường" dataKey="marketValue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVal)" />
                <Line type="monotone" name="Profit / Loss" dataKey="pnl" stroke="#a78bfa" strokeWidth={1.8} dot={false} />
                <Line type="linear" name="Buy" dataKey="buyMarker" stroke="transparent" dot={{ r: 4, fill: '#10b981', stroke: '#052e16', strokeWidth: 1.5 }} activeDot={false} connectNulls={false} isAnimationActive={false} />
                <Line type="linear" name="Sell" dataKey="sellMarker" stroke="transparent" dot={{ r: 4, fill: '#fb7185', stroke: '#4c0519', strokeWidth: 1.5 }} activeDot={false} connectNulls={false} isAnimationActive={false} />
                <Area type="monotone" name="Giá Vốn Đã Chi" dataKey="costBasis" stroke="#94a3b8" fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            ) : (
              <div className="h-full w-full bg-white/[0.02] animate-pulse rounded-lg" />
            )}
          </div>
        </div>

        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col h-[525px]">
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
      <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl min-h-[450px] flex flex-col">
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Dự Phóng Dòng Tiền 12 Tháng Tới (Dividend & Bond Coupons)</h4>
          <p className="text-xs text-slate-400">Ước tính các kỳ thanh toán tiền mặt theo lịch công bố & cam kết của trái phiếu</p>
        </div>
        <div ref={chart2Ref} className="w-full h-[315px] text-xs mt-4">
          {!hasForecastData ? (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-slate-950/30 px-4 text-center">
              <p className="text-xs font-semibold text-slate-300">Chưa có khoản thu tiền mặt nào trong 12 tháng tới.</p>
              <p className="mt-1 max-w-lg text-[11px] leading-5 text-slate-500">Dự phóng chỉ hiện khi có ngày thanh toán cổ tức trong tab Cổ tức hoặc trái phiếu đang hoạt động có kỳ coupon sắp tới.</p>
            </div>
          ) : chart2Size.width > 0 && chart2Size.height > 0 ? (
            <BarChart width={chart2Size.width} height={chart2Size.height} data={forecastData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#475569" />
              <YAxis stroke="#475569" tickFormatter={(v) => formatCompact(v)} width={72} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} formatter={(v: any, name: any) => [formatVal(Number(v)), name]} />
              <Legend />
              <Bar name="Bond coupon" dataKey="coupon" fill="#3b82f6" stackId="a"><LabelList dataKey="coupon" position="insideTop" fill="#dbeafe" fontSize={10} formatter={(value: any) => value ? formatCompact(Number(value)) : ""} /></Bar>
              <Bar name="Cash dividend" dataKey="dividend" fill="#10b981" stackId="a"><LabelList dataKey="dividend" position="insideTop" fill="#d1fae5" fontSize={10} formatter={(value: any) => value ? formatCompact(Number(value)) : ""} /></Bar>
            </BarChart>
          ) : <div className="h-full w-full bg-white/[0.02] animate-pulse rounded-lg" />}
        </div>
      </div>
    </div>
  );
}
