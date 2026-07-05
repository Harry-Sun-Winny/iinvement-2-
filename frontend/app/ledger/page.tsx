"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  BookOpen, Search, Download, Upload, Trash2, 
  Layers, CreditCard, Calendar, Bell, BarChart2, ShieldAlert, Loader2, AlertTriangle
} from 'lucide-react';
import { useLedgerStore } from './store/ledgerStore';
import DashboardWidgets from './components/DashboardWidgets';
import DividendsModule from './components/DividendsModule';
import BondsModule from './components/BondsModule';
import FinancialReports from './components/FinancialReports';
import UnifiedCalendar from './components/UnifiedCalendar';
import { getPortfolios, getTransactions, getStockPrice, Transaction } from '../lib/api';
import { TransactionDTO } from '../../types/ledger';
import { calculateHoldings } from './services/calculators/portfolioEngine';

export default function LedgerPage() {
  const {
    transactions,
    bonds,
    reports,
    journals,
    dividendEvents,
    notifications,
    searchQuery,
    setSearchQuery,
    importBackup,
    exportBackup,
    clearAllNotifications,
    markNotificationAsRead,
    addDividendEvent,
    addBond,
    updateBond,
    deleteBond,
    archiveBond,
    addReport,
    saveJournalEntry,
    autosaveJournalEntry,
    deleteJournalEntry,
    setTransactions,
    clearMockData,
    setReports,
    setDividendEvents
  } = useLedgerStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'dividends' | 'bonds' | 'reports' | 'calendar' | 'notifications'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [baseCurrency, setBaseCurrency] = useState<string>('VND');
  const [historyPricesMap, setHistoryPricesMap] = useState<Record<string, Record<string, number>>>({});

  const [error, setError] = useState<string | null>(null);

  // Fetch real transactions + live prices from API (same logic as Holdings page)
  const loadRealData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const portfolios = await getPortfolios();
      const baseCurrencyCode = portfolios.length > 0 ? (portfolios[0].baseCurrency || 'VND') : 'VND';
      if (portfolios.length > 0) {
        setBaseCurrency(baseCurrencyCode);
      }
      const allRealTxs: Transaction[] = [];

      // Step 1: Load all transactions from all portfolios (same as Holdings)
      await Promise.all(
        portfolios.map(async (p) => {
          try {
            const txs = await getTransactions(p.id);
            allRealTxs.push(...txs);
          } catch (err) {
            console.error(`Error loading transactions for portfolio ${p.id}:`, err);
            throw err; // propagate to outer catch block
          }
        })
      );

      if (allRealTxs.length > 0) {
        // Step 2: Map to LedgerDTO format
        const mappedTxs: TransactionDTO[] = allRealTxs.map(t => ({
          id: t.id,
          portfolioId: t.portfolioId,
          symbol: t.assetSymbol,
          assetType: 'STOCK',
          quantity: t.quantity,
          price: t.price,
          type: t.type as 'BUY' | 'SELL',
          transactionDate: t.transactionDate ? t.transactionDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.createdAt || new Date().toISOString(),
          deletedAt: null,
          archived: false
        }));
        setTransactions(mappedTxs);

        // Clear stale mock data
        clearMockData();

        // Step 3: Calculate active holdings to fetch relevant data
        const holdings = calculateHoldings(mappedTxs, undefined, baseCurrencyCode);
        const activeSymbols = holdings.map(h => h.symbol);

        // Step 4: Fetch live prices, historical dividends, and financial reports from Yahoo Finance
        const pricesMap: Record<string, number> = {};
        const allDividendEvents: any[] = [];
        const allReports: any[] = [];
        const tempHistoryPricesMap: Record<string, Record<string, number>> = {};

        // Find the earliest purchase date for each symbol to get all dividends since purchase
        const symbolEarliestDates: Record<string, string> = {};
        mappedTxs.forEach(t => {
          if (t.type === 'BUY') {
            if (!symbolEarliestDates[t.symbol] || t.transactionDate < symbolEarliestDates[t.symbol]) {
              symbolEarliestDates[t.symbol] = t.transactionDate;
            }
          }
        });

        await Promise.all(
          activeSymbols.map(async (symbol) => {
            // 4a. Fetch current price
            try {
              const quote = await getStockPrice(symbol);
              if (quote && typeof quote.price === 'number' && Number.isFinite(quote.price) && quote.price > 0) {
                pricesMap[symbol] = quote.price;
              }
            } catch (e) {
              console.error(`Failed to fetch stock price for ${symbol}`, e);
            }

            // 4b. Fetch dividends since earliest purchase date
            const startDate = symbolEarliestDates[symbol] || '2010-01-01';
            try {
              const res = await fetch(`/api/stock-dividends?symbol=${encodeURIComponent(symbol)}&startDate=${startDate}`);
              if (res.ok) {
                const dividends = await res.json();
                if (Array.isArray(dividends)) {
                  allDividendEvents.push(...dividends);
                }
              }
            } catch (e) {
              console.error(`Failed to fetch dividends for ${symbol}`, e);
            }

            // 4c. Fetch financial statements
            try {
              const res = await fetch(`/api/stock-financials?symbol=${encodeURIComponent(symbol)}`);
              if (res.ok) {
                const financials = await res.json();
                if (Array.isArray(financials)) {
                  allReports.push(...financials);
                }
              }
            } catch (e) {
              console.error(`Failed to fetch financials for ${symbol}`, e);
            }

            // 4d. Fetch historical stock prices
            try {
              const res = await fetch(`/api/stock-history?symbol=${encodeURIComponent(symbol)}&range=Max`);
              if (res.ok) {
                const historyData = await res.json();
                if (historyData && Array.isArray(historyData.points)) {
                  const monthPrices: Record<string, number> = {};
                  historyData.points.forEach((pt: any) => {
                    if (pt && pt.date) {
                      const monthKey = pt.date.slice(0, 7); // "YYYY-MM"
                      monthPrices[monthKey] = pt.adjustedClose ?? pt.close ?? 0;
                    }
                  });
                  tempHistoryPricesMap[symbol] = monthPrices;
                }
              }
            } catch (e) {
              console.error(`Failed to fetch history prices for ${symbol}`, e);
            }
          })
        );

        setCurrentPrices(pricesMap);
        setDividendEvents(allDividendEvents);
        setReports(allReports);
        setHistoryPricesMap(tempHistoryPricesMap);
      } else {
        setTransactions([]);
        clearMockData();
      }
    } catch (e: any) {
      console.error("Failed to load real database transactions:", e);
      setError(e.message || "Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra lại kết nối.");
    } finally {
      setLoading(false);
    }
  }, [setTransactions, clearMockData, setReports, setDividendEvents]);

  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  // Global search filtering
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions.filter(t => !t.deletedAt);
    const q = searchQuery.toLowerCase();
    return transactions.filter(t => 
      !t.deletedAt && 
      (t.symbol.toLowerCase().includes(q) || 
       t.type.toLowerCase().includes(q) ||
       t.price.toString().includes(q))
    );
  }, [transactions, searchQuery]);

  const filteredBonds = useMemo(() => {
    if (!searchQuery.trim()) return bonds.filter(b => !b.deletedAt);
    const q = searchQuery.toLowerCase();
    return bonds.filter(b => 
      !b.deletedAt && 
      (b.name.toLowerCase().includes(q) || 
       b.issuer.toLowerCase().includes(q) || 
       b.status.toLowerCase().includes(q))
    );
  }, [bonds, searchQuery]);

  const filteredJournals = useMemo(() => {
    if (!searchQuery.trim()) return journals.filter(j => !j.deletedAt);
    const q = searchQuery.toLowerCase();
    return journals.filter(j => 
      !j.deletedAt && 
      (j.symbol.toLowerCase().includes(q) || 
       j.investmentThesis.toLowerCase().includes(q) ||
       j.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }, [journals, searchQuery]);

  // Backup handlers
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exportBackup());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ledger_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        const ok = importBackup(result);
        if (ok) {
          alert('Khôi phục dữ liệu sao lưu thành công!');
        } else {
          alert('Tệp sao lưu không hợp lệ. Vui lòng thử lại.');
        }
      }
    };
    reader.readAsText(file);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950 text-slate-100 flex flex-col p-6 space-y-6 custom-scrollbar">
      {/* Header section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
            <BookOpen size={14} /> Sổ Cái Tài Sản Doanh Nghiệp
          </p>
          <h2 className="mt-2 text-2xl font-black text-white tracking-wide">Enterprise Financial Ledger</h2>
        </div>

        {/* Global Search & Operations */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm mã, trái phiếu, thesis..."
              className="pl-9 pr-4 py-2 text-xs rounded-xl border border-white/10 bg-black/40 text-white placeholder:text-slate-500 w-[240px] focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>



          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/5 transition-all"
          >
            <Download size={14} /> Export Backup
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/5 cursor-pointer transition-all">
            <Upload size={14} /> Import Backup
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </header>

      {/* Tabs list */}
      <div className="flex border-b border-white/5 pb-px gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', label: 'Tổng Quan', icon: BarChart2 },
          { id: 'dividends', label: 'Cổ Tức', icon: Layers },
          { id: 'bonds', label: 'Trái Phiếu', icon: CreditCard },
          { id: 'reports', label: 'Báo Cáo Tài Chính', icon: BookOpen },
          { id: 'calendar', label: 'Lịch Hợp Nhất', icon: Calendar },
          { id: 'notifications', label: 'Thông Báo', icon: Bell, count: unreadNotificationsCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-500 text-white bg-white/5 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black rounded-full bg-indigo-500 text-white leading-none">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Tab Contents */}
      <main className="flex-1 min-h-0">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 border border-red-500/10 bg-red-500/[0.01] rounded-3xl p-8 text-center max-w-md mx-auto">
            <AlertTriangle className="h-10 w-10 text-red-500 mb-4 animate-bounce" />
            <h3 className="text-sm font-bold text-white mb-2">Lỗi tải dữ liệu</h3>
            <p className="text-xs text-red-400 mb-6">{error}</p>
            <button
              onClick={loadRealData}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/20"
            >
              Thử lại
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400">Đang tải dữ liệu từ danh mục đầu tư...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-white/5 bg-white/[0.01] rounded-3xl p-8 text-center max-w-md mx-auto">
            <BookOpen className="h-10 w-10 text-slate-500 mb-4" />
            <h3 className="text-sm font-bold text-white mb-2">No transactions found.</h3>
            <p className="text-xs text-slate-400">
              Create your first transaction or import a CSV file to begin.
            </p>
          </div>
        ) : (
        <>
        {activeTab === 'dashboard' && (
          <DashboardWidgets 
            transactions={transactions} 
            bonds={bonds} 
            dividendEvents={dividendEvents}
            currentPrices={currentPrices}
            baseCurrency={baseCurrency}
            historyPricesMap={historyPricesMap}
          />
        )}

        {activeTab === 'dividends' && (
          <DividendsModule
            transactions={transactions}
            dividendEvents={dividendEvents}
            onAddEvent={addDividendEvent}
          />
        )}

        {activeTab === 'bonds' && (
          <BondsModule
            bonds={bonds}
            onAddBond={addBond}
            onUpdateBond={updateBond}
            onDeleteBond={deleteBond}
            onArchiveBond={archiveBond}
          />
        )}

        {activeTab === 'reports' && (
          <FinancialReports
            reports={reports}
            journals={journals}
            onAddReport={addReport}
            onSaveJournal={saveJournalEntry}
            onAutosaveJournal={autosaveJournalEntry}
            onDeleteJournal={deleteJournalEntry}
          />
        )}

        {activeTab === 'calendar' && (
          <UnifiedCalendar
            transactions={transactions}
            bonds={bonds}
            dividendEvents={dividendEvents}
          />
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Trung Tâm Cảnh Báo</h4>
              {notifications.length > 0 && (
                <button 
                  onClick={clearAllNotifications}
                  className="text-xs font-semibold text-slate-400 hover:text-red-400 flex items-center gap-1.5"
                >
                  <Trash2 size={12} /> Xóa tất cả
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="antigravity-panel p-6 bg-white/[0.02] border border-white/5 text-center text-slate-400 py-12 text-xs">
                Không có thông báo mới nào.
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    className={`p-4 rounded-xl border flex items-start justify-between transition-all ${
                      n.read 
                        ? 'bg-white/[0.01] border-white/5 opacity-60' 
                        : 'bg-indigo-500/5 border-indigo-500/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {n.type === 'ALERT' && <ShieldAlert size={14} className="text-red-400" />}
                        <h5 className="font-bold text-slate-200 text-xs">{n.title}</h5>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{n.message}</p>
                      <span className="text-[9px] text-slate-600 block mt-2">{n.date}</span>
                    </div>
                    {!n.read && (
                      <button 
                        onClick={() => markNotificationAsRead(n.id)}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}
