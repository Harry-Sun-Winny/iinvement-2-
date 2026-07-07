"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Loader2, ArrowUpRight, ArrowDownRight, CreditCard, DollarSign, Calendar } from "lucide-react";
import { getTransactions, Transaction } from "../../app/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface DrillDownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  selectedDate: string;
  portfolioValue: number;
  totalCost: number;
  dailyReturn: number;
}

export function DrillDownDrawer({
  isOpen,
  onClose,
  portfolioId,
  selectedDate,
  portfolioValue,
  totalCost,
  dailyReturn
}: DrillDownDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus drawer for accessibility
      drawerRef.current?.focus();
      
      // Escape key handler
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && portfolioId && selectedDate) {
      void fetchDayTransactions();
    }
  }, [isOpen, portfolioId, selectedDate]);

  async function fetchDayTransactions() {
    setLoading(true);
    setError(null);
    try {
      const allTx = await getTransactions(portfolioId);
      // Filter transactions executed on the selected date (YYYY-MM-DD)
      const dayTx = allTx.filter(t => {
        const txDate = t.transactionDate ? t.transactionDate.slice(0, 10) : "";
        return txDate === selectedDate;
      });
      setTransactions(dayTx);
    } catch (err) {
      console.error("Failed to load drawer transactions", err);
      setError("Không thể tải lịch sử giao dịch.");
    } finally {
      setLoading(false);
    }
  }

  // Calculate day metrics
  const unrealizedPnl = portfolioValue - totalCost;
  const totalCashFlow = transactions.reduce((sum, t) => {
    const cost = t.quantity * t.price;
    return t.type === "BUY" ? sum + cost : sum - cost;
  }, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`Chi tiết ngày ${selectedDate}`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex h-full w-full flex-col bg-slate-900 border-l border-white/10 text-slate-100 shadow-2xl focus:outline-none sm:w-[480px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Chi Tiết Ngày</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                aria-label="Đóng ngăn chi tiết"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Date Header Badge */}
              <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4 text-center">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Thời điểm phân tích</span>
                <h4 className="text-xl font-black text-white mt-1">{selectedDate}</h4>
              </div>

              {/* Day Summary Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Giá trị danh mục</span>
                  <span className="text-lg font-black text-white block mt-1">
                    ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tỷ suất sinh lời ngày</span>
                  <span className={`text-lg font-black flex items-center gap-1 mt-1 ${dailyReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {dailyReturn >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {(dailyReturn * 100).toFixed(2)}%
                  </span>
                </div>

                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lãi/Lỗ tạm tính (Unrealized P/L)</span>
                  <span className={`text-lg font-black block mt-1 ${unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {unrealizedPnl >= 0 ? "+" : ""}
                    ${unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng dòng tiền (Cash Flow)</span>
                  <span className="text-lg font-black text-slate-300 block mt-1">
                    {totalCashFlow > 0 ? "-" : totalCashFlow < 0 ? "+" : ""}
                    ${Math.abs(totalCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Transactions Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" /> Giao dịch trong ngày ({transactions.length})
                </h4>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                    <span className="text-xs text-slate-400">Đang tìm kiếm giao dịch...</span>
                  </div>
                ) : error ? (
                  <div className="rounded-xl border border-red-500/10 bg-red-500/[0.01] p-4 text-center text-xs text-red-400">
                    {error}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-8 text-center text-xs text-slate-500">
                    Không phát sinh giao dịch mua bán nào trong ngày này.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {transactions.map(t => {
                      const cost = t.quantity * t.price;
                      return (
                        <div key={t.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between hover:bg-white/[0.03] transition-all">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${t.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                {t.type === "BUY" ? "MUA" : "BÁN"}
                              </span>
                              <span className="font-bold text-sm text-white">{t.assetSymbol}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Số lượng: {t.quantity.toLocaleString()} | Giá: ${t.price.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sm text-slate-200">
                              ${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
