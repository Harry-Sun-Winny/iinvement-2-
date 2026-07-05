"use client";

import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, DollarSign, Gift, Briefcase, FileText } from 'lucide-react';
import { TransactionDTO, BondLedgerDTO, DividendEventDTO } from '../../../types/ledger';
import { calculateBondMetrics } from '../services/calculators/bondCalculator';
import { calculateReceivedDividends } from '../services/calculators/dividendCalculator';

interface UnifiedCalendarProps {
  transactions: TransactionDTO[];
  bonds: BondLedgerDTO[];
  dividendEvents: DividendEventDTO[];
}

interface CalendarEvent {
  date: string;
  title: string;
  type: 'DIVIDEND_RECORD' | 'DIVIDEND_PAY' | 'BOND_COUPON' | 'BOND_MATURITY';
  amount?: string;
  symbol?: string;
}

export default function UnifiedCalendar({ transactions, bonds, dividendEvents }: UnifiedCalendarProps) {
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(6); // 0-indexed, 6 = July (our current local time is July 2026)

  // 1. Gather all events from portfolios, dividends, and bonds
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Dividends Record & Pay Events
    const calculatedDivs = calculateReceivedDividends(transactions, dividendEvents);
    calculatedDivs.forEach(d => {
      // Record Date
      events.push({
        date: d.recordDate,
        title: `Chốt quyền nhận cổ tức ${d.symbol}`,
        type: 'DIVIDEND_RECORD',
        amount: d.type === 'CASH' ? `${d.rate.toLocaleString()}đ/CP` : `${(d.rate * 100).toFixed(0)}% CP`,
        symbol: d.symbol
      });

      // Pay Date
      events.push({
        date: d.paymentDate,
        title: `Nhận cổ tức ${d.symbol}`,
        type: 'DIVIDEND_PAY',
        amount: d.type === 'CASH' ? `+${d.payout.toLocaleString()}đ` : `+${d.payout.toLocaleString()} CP`,
        symbol: d.symbol
      });
    });

    // Bonds Coupon & Maturity Events
    bonds.filter(b => !b.deletedAt).forEach(b => {
      const metrics = calculateBondMetrics(b, '2026-07-05');
      
      // Maturity
      events.push({
        date: b.maturityDate,
        title: `Đáo hạn Trái phiếu ${b.name}`,
        type: 'BOND_MATURITY',
        amount: `${(b.faceValue * b.quantity).toLocaleString()}đ`,
        symbol: b.issuer
      });

      // Coupon payments
      metrics.couponSchedule.forEach(c => {
        events.push({
          date: c.paymentDate,
          title: `Nhận lãi coupon ${b.name}`,
          type: 'BOND_COUPON',
          amount: `+${c.amount.toLocaleString()}đ`,
          symbol: b.issuer
        });
      });
    });

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, bonds, dividendEvents]);

  // Filter events by selected month & year
  const activeEvents = useMemo(() => {
    return allEvents.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [allEvents, currentYear, currentMonth]);

  // Calendar grid calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Day of week (0-6)
  
  const monthNames = [
    'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu',
    'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Event coloring helper
  const getEventBadgeClass = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'DIVIDEND_RECORD': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DIVIDEND_PAY': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'BOND_COUPON': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'BOND_MATURITY': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div className="space-y-6 text-xs grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Calendar Grid Selector */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Navigation */}
        <div className="flex justify-between items-center bg-white/[0.01] p-3 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-indigo-400" />
            <span className="font-bold text-white uppercase tracking-wider text-xs">
              {monthNames[currentMonth]} - {currentYear}
            </span>
          </div>
          <div className="flex gap-1">
            <button onClick={handlePrevMonth} className="p-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleNextMonth} className="p-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days Grid */}
        <div className="antigravity-panel p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="grid grid-cols-7 gap-2 text-center text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-2">
            <div>CN</div><div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {/* Pad blank days for start of month */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14 rounded-lg bg-transparent" />
            ))}
            
            {/* Render actual days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateString = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              
              // Find events on this day
              const dayEvents = allEvents.filter(e => e.date === dateString);
              const hasEvents = dayEvents.length > 0;

              return (
                <div 
                  key={`day-${day}`} 
                  className={`h-14 p-1 rounded-lg border transition-all flex flex-col justify-between ${
                    hasEvents 
                      ? 'bg-indigo-500/5 border-indigo-500/20' 
                      : 'bg-white/[0.01] border-white/5'
                  }`}
                >
                  <span className={`font-bold text-[10px] ${hasEvents ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {day}
                  </span>
                  
                  {/* Event indicators dot/text */}
                  {hasEvents && (
                    <div className="flex flex-wrap gap-1">
                      {dayEvents.slice(0, 3).map((e, idx) => (
                        <span 
                          key={idx} 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{
                            backgroundColor: 
                              e.type === 'DIVIDEND_PAY' ? '#10b981' : 
                              e.type === 'DIVIDEND_RECORD' ? '#f59e0b' : 
                              e.type === 'BOND_COUPON' ? '#3b82f6' : '#6366f1'
                          }}
                          title={e.title}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agenda/List panel */}
      <div className="lg:col-span-1 flex flex-col">
        <span className="font-bold text-slate-500 uppercase tracking-widest block text-[9px] pl-1 mb-3">Sự Kiện Trong Tháng</span>
        
        <div className="flex-1 overflow-y-auto space-y-3 max-h-[360px] pr-1 custom-scrollbar">
          {activeEvents.length === 0 ? (
            <div className="antigravity-panel p-6 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col items-center justify-center text-slate-500 py-16 text-center">
              Không có sự kiện nào được ghi nhận trong tháng này.
            </div>
          ) : (
            activeEvents.map((e, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-white/[0.02] hover:bg-white/[0.03] border border-white/5 rounded-xl space-y-2 transition-all"
              >
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 border rounded-full font-bold text-[8px] uppercase tracking-wider ${getEventBadgeClass(e.type)}`}>
                    {e.type === 'DIVIDEND_PAY' ? 'Cổ tức thực nhận' : 
                     e.type === 'DIVIDEND_RECORD' ? 'Chốt quyền cổ tức' : 
                     e.type === 'BOND_COUPON' ? 'Lãi coupon trái phiếu' : 'Đáo hạn trái phiếu'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">{e.date}</span>
                </div>
                
                <div>
                  <h5 className="font-bold text-slate-200">{e.title}</h5>
                  {e.amount && (
                    <p className="font-bold text-white text-xs mt-1">Dòng tiền: {e.amount}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
