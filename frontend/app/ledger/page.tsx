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
import { commitTransactionImport, createTransaction, getFxRate, getPortfolios, getTransactions, Portfolio, previewTransactionImport, Transaction, TransactionImportPreview } from '../lib/api';
import { parseTransactionCsv } from '../../lib/transaction-import';
import { TransactionDTO } from '../../types/ledger';
import { CalculatedDividend } from './services/calculators/dividendCalculator';
import { calculateHoldings } from './services/calculators/portfolioEngine';
import {
  applyLivePrices,
  buildDisplayPositions,
  buildHoldingsFromTransactions,
  buildPositionsFromHoldings,
  StockQuote,
} from '../lib/finance/calculations';
import { valuePortfolioSets } from '../lib/finance/valuation';
import { useTranslation } from "@/components/providers/I18nProvider";

export default function LedgerPage() {
  const { t, language } = useTranslation();
  const isVi = language === "vi";
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
  const [portfolioDirectory, setPortfolioDirectory] = useState<Portfolio[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [displayStockValue, setDisplayStockValue] = useState<number | null>(null);
  const [historyPricesMap, setHistoryPricesMap] = useState<Record<string, Record<string, number>>>({});
  const [reportSyncStatus, setReportSyncStatus] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<TransactionImportPreview | null>(null);
  const [importPortfolioId, setImportPortfolioId] = useState<string>('');
  const [importBusy, setImportBusy] = useState(false);

  // Fetch real transactions + live prices from API (same logic as Holdings page)
  const loadRealData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const portfolios = await getPortfolios();
      setPortfolioDirectory(portfolios);
      // Dashboard and Holdings default to USD; keep Ledger in that same display unit.
      const baseCurrencyCode = 'USD';
      setBaseCurrency(baseCurrencyCode);
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
          archived: false,
          notes: t.notes
        }));
        setTransactions(mappedTxs);
        // Show the ledger immediately. Deep market enrichment continues in the background.
        setLoading(false);

        // Step 3: Use the same position builder as Dashboard and Holdings.
        // It preserves each portfolio's currency instead of inferring it from the ticker.
        const portfolioTransactionSets = portfolios.map((portfolio) => ({
          portfolio,
          txs: allRealTxs.filter((transaction) => transaction.portfolioId === portfolio.id),
        }));
        const initialValuation = valuePortfolioSets(portfolioTransactionSets, new Map(), 'USD', { USD: 1, USDT: 1, USDC: 1, VND: 25400 });
        const dashboardPositions = initialValuation.positions;
        const activeSymbols = Array.from(new Set(dashboardPositions.map((position) => position.symbol.toUpperCase())));
        const pricesMap: Record<string, number> = {};
        const quotesBySymbol = new Map<string, StockQuote>();
        try {
          const quoteResponse = await fetch(`/api/stock-price?symbols=${encodeURIComponent(activeSymbols.join(","))}`);
          const quotePayload = quoteResponse.ok ? await quoteResponse.json() : null;
          for (const quote of quotePayload?.quotes ?? []) {
            if (typeof quote?.price === 'number' && Number.isFinite(quote.price) && quote.price > 0) {
              const symbol = String(quote.requestedSymbol ?? quote.symbol).toUpperCase();
              pricesMap[symbol] = quote.price;
              quotesBySymbol.set(symbol, {
                price: quote.price,
                previousClose: typeof quote.previousClose === 'number' ? quote.previousClose : undefined,
                changeAmount: typeof quote.change === 'number' ? quote.change : undefined,
                changePercent: typeof quote.changePercent === 'number' ? quote.changePercent : undefined,
                currency: String(quote.currency ?? 'USD').toUpperCase(),
              });
            }
          }
          setCurrentPrices(pricesMap);

          // Match the Dashboard/Holdings display currency and FX conversion exactly.
          const fxResult = await getFxRate('VND').catch(() => ({ rates: { USD: 1, USDT: 1, USDC: 1, VND: 25400 } }));
          const valuation = valuePortfolioSets(portfolioTransactionSets, quotesBySymbol, 'USD', fxResult.rates);
          setDisplayStockValue(valuation.totalMarketValue);
        } catch (error) {
          console.error('Failed to load batched market prices', error);
          setDisplayStockValue(null);
        }

        // Step 4: Fetch live prices, historical dividends, and financial reports from Yahoo Finance
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
          activeSymbols.slice(0, 24).map(async (symbol) => {

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

            // 4c. Fetch historical stock prices
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

        // 5. From today onward, track only US IPOs with market cap above $5B.
        // The calendar provides candidates; market-details is the eligibility gate.
        let ipoSymbols: string[] = [];
        try {
          const from = new Date().toISOString().slice(0, 10);
          const toDate = new Date();
          toDate.setUTCDate(toDate.getUTCDate() + 365);
          const to = toDate.toISOString().slice(0, 10);
          const ipoRes = await fetch(`/api/market-calendar?category=ipo&from=${from}&to=${to}`);
          const ipoPayload = ipoRes.ok ? await ipoRes.json() : null;
          const ipoCandidates = Array.from(new Set<string>((ipoPayload?.events ?? [])
            .filter((event: any) => /NYSE|NASDAQ|\bUS\b/i.test(`${event.exchange ?? ''} ${event.countryCode ?? ''}`))
            .map((event: any) => String(event.symbol ?? '').trim().toUpperCase())
            .filter((symbol: string) => /^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol))));

          const eligibleIpos = await Promise.all(ipoCandidates.map(async (symbol: string) => {
            try {
              const detailsRes = await fetch(`/api/market-details?symbol=${encodeURIComponent(symbol)}`);
              const details = detailsRes.ok ? await detailsRes.json() : null;
              return Number(details?.marketCap) > 5_000_000_000 ? symbol : null;
            } catch {
              return null;
            }
          }));
          ipoSymbols = eligibleIpos.filter((symbol): symbol is string => Boolean(symbol));
        } catch (e) {
          console.error('Failed to fetch US IPO symbols', e);
        }

        const reportSymbols = Array.from(new Set([...activeSymbols, ...ipoSymbols])).slice(0, 24);
        setReportSyncStatus(`Đang tự lưu BCTC cho ${reportSymbols.length} mã (holdings + IPO Mỹ)...`);
        await Promise.all(reportSymbols.map(async (symbol) => {
          try {
            const res = await fetch(`/api/stock-financials?symbol=${encodeURIComponent(symbol)}`);
            if (res.ok) {
              const financials = await res.json();
              if (Array.isArray(financials)) allReports.push(...financials);
            }
          } catch (e) {
            console.error(`Failed to fetch financials for ${symbol}`, e);
          }
        }));

        const storedReports = useLedgerStore.getState().reports;
        const reportMap = new Map<string, any>();
        [...storedReports, ...allReports].forEach((report: any) => {
          const key = `${String(report.symbol).toUpperCase()}-${report.year}-${report.period}`;
          reportMap.set(key, { ...report, symbol: String(report.symbol).toUpperCase(), fetchedAt: report.fetchedAt ?? new Date().toISOString() });
        });

        setCurrentPrices(pricesMap);
        setDividendEvents(allDividendEvents);
        setReports(Array.from(reportMap.values()));
        setReportSyncStatus(`Đã tự lưu ${allReports.length} bản ghi BCTC từ hôm nay.`);
        setHistoryPricesMap(tempHistoryPricesMap);
      } else {
        setTransactions([]);
        setDisplayStockValue(null);
        setReportSyncStatus('Chưa có holding để đồng bộ BCTC.');
      }
    } catch (e: any) {
      console.error("Failed to load real database transactions:", e);
      setError(e.message || (isVi ? "Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra lại kết nối." : "Unable to load data from server. Please check your connection."));
    } finally {
      setLoading(false);
    }
  }, [setTransactions, clearMockData, setReports, setDividendEvents, isVi]);

  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  const recordedStockDividendIds = useMemo(() => new Set(
    transactions
      .map((transaction) => transaction.notes?.match(/STOCK_DIVIDEND:([^\s]+)/)?.[1])
      .filter((id): id is string => Boolean(id))
  ), [transactions]);

  const recordStockDividend = useCallback(async (dividend: CalculatedDividend) => {
    if (recordedStockDividendIds.has(dividend.id)) return;
    const portfolioIds = [...new Set(transactions.map((transaction) => transaction.portfolioId))];
    const entries = portfolioIds.map((portfolioId) => {
      const held = calculateHoldings(transactions.filter((transaction) => transaction.portfolioId === portfolioId && transaction.transactionDate <= dividend.recordDate));
      const quantityHeld = held.find((position) => position.symbol.toUpperCase() === dividend.symbol.toUpperCase())?.totalQuantity ?? 0;
      return { portfolio: portfolioDirectory.find((portfolio) => portfolio.id === portfolioId), quantity: quantityHeld * dividend.rate };
    }).filter((entry) => entry.portfolio && entry.quantity > 0) as Array<{ portfolio: Portfolio; quantity: number }>;

    if (entries.length === 0) throw new Error('Không tìm thấy danh mục nắm giữ mã này tại ngày chốt quyền.');
    await Promise.all(entries.map(({ portfolio, quantity }) => createTransaction(portfolio.id, {
      assetSymbol: dividend.symbol,
      assetName: dividend.symbol,
      type: 'BUY',
      quantity,
      price: 0,
      currency: portfolio.baseCurrency,
      transactionDate: dividend.paymentDate,
      notes: `STOCK_DIVIDEND:${dividend.id}`,
    })));
    await loadRealData();
  }, [loadRealData, portfolioDirectory, recordedStockDividendIds, transactions]);
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
          alert(isVi ? 'Khôi phục dữ liệu sao lưu thành công!' : 'Data backup restored successfully!');
        } else {
          alert(isVi ? 'Tệp sao lưu không hợp lệ. Vui lòng thử lại.' : 'Invalid backup file. Please try again.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const portfolioId = portfolioDirectory[0]?.id;
    if (!file || !portfolioId) return;
    setImportBusy(true);
    try {
      const rows = parseTransactionCsv(await file.text());
      setImportPreview(await previewTransactionImport(portfolioId, rows));
      setImportPortfolioId(portfolioId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not preview import file.'); }
    finally { setImportBusy(false); event.target.value = ''; }
  };
  const commitCsvImport = async () => {
    if (!importPreview?.readyToImport || !importPortfolioId) return;
    setImportBusy(true);
    try { await commitTransactionImport(importPortfolioId, importPreview.rows); setImportPreview(null); await loadRealData(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not import transactions.'); }
    finally { setImportBusy(false); }
  };
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex-1 min-w-0 h-[100dvh] overflow-y-auto bg-slate-950 text-slate-100 flex flex-col p-4 md:p-6 pb-24 md:pb-24 space-y-6 custom-scrollbar">
      {/* Header section */}
      <header className="flex shrink-0 flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
            <BookOpen size={14} /> {isVi ? "Sổ Cái Tài Sản Cá Nhân" : "Personal Asset Ledger"}
          </p>
          <h2 className="rainbow-text mt-2 text-2xl font-black tracking-wide">Enterprise Financial Ledger</h2>
        </div>

        {/* Global Search & Operations */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-black/40 border border-white/5 rounded-xl p-1">
            <button 
              onClick={() => setBaseCurrency('USD')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${baseCurrency === 'USD' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              USD
            </button>
            <button 
              onClick={() => setBaseCurrency('VND')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${baseCurrency === 'VND' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              VND
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isVi ? "Tìm kiếm mã, trái phiếu, thesis..." : "Search tickers, bonds, thesis..."}
              className="pl-9 pr-4 py-2 text-xs rounded-xl border border-white/10 bg-black/40 text-white placeholder:text-slate-500 w-[240px] focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>



          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/5 transition-all"
          >
            <Download size={14} /> {isVi ? "Xuất sao lưu" : "Export Backup"}
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 rounded-xl border border-indigo-400/20 cursor-pointer transition-all"><Upload size={14} /> Import CSV<input type="file" accept=".csv,text/csv" onChange={handleCsvImport} className="hidden" /></label>
          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/5 cursor-pointer transition-all">
            <Upload size={14} /> {isVi ? "Nhập sao lưu" : "Import Backup"}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </header>

      {importPreview && <section className="rounded-2xl border border-indigo-400/30 bg-indigo-500/5 p-4 flex flex-wrap items-center gap-3">
        <div className="text-xs"><b>CSV preview:</b> {importPreview.validRows} valid, {importPreview.invalidRows} invalid.</div>
        {importPreview.issues.slice(0, 3).map(issue => <span key={`${issue.row}-${issue.field}`} className="text-xs text-rose-300">Row {issue.row}: {issue.field}</span>)}
        <button disabled={!importPreview.readyToImport || importBusy} onClick={commitCsvImport} className="ml-auto px-3 py-2 text-xs font-bold rounded-lg bg-indigo-500 disabled:opacity-40">{importBusy ? 'Importing...' : 'Confirm import'}</button>
        <button onClick={() => setImportPreview(null)} className="px-3 py-2 text-xs text-slate-300">Cancel</button>
      </section>}
      {/* Tabs list */}
      <div className="flex shrink-0 border-b border-white/5 pb-px gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', label: isVi ? "Tổng Quan" : "Dashboard", icon: BarChart2 },
          { id: 'dividends', label: isVi ? "Cổ Tức" : "Dividends", icon: Layers },
          { id: 'bonds', label: isVi ? "Trái Phiếu" : "Bonds", icon: CreditCard },
          { id: 'reports', label: isVi ? "Báo Cáo Tài Chính" : "Financial Reports", icon: BookOpen },
          { id: 'calendar', label: isVi ? "Lịch Hợp Nhất" : "Unified Calendar", icon: Calendar },
          { id: 'notifications', label: isVi ? "Thông Báo" : "Notifications", icon: Bell, count: unreadNotificationsCount },
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
      <main className="flex-none min-w-0">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 border border-red-500/10 bg-red-500/[0.01] rounded-3xl p-8 text-center max-w-md mx-auto">
            <AlertTriangle className="h-10 w-10 text-red-500 mb-4 animate-bounce" />
            <h3 className="text-sm font-bold text-white mb-2">{isVi ? "Lỗi tải dữ liệu" : "Data Load Error"}</h3>
            <p className="text-xs text-red-400 mb-6">{error}</p>
            <button
              onClick={loadRealData}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/20"
            >
              {isVi ? "Thử lại" : "Retry"}
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400">{isVi ? "Đang tải dữ liệu từ danh mục đầu tư..." : "Loading data from portfolios..."}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-white/5 bg-white/[0.01] rounded-3xl p-8 text-center max-w-md mx-auto">
            <BookOpen className="h-10 w-10 text-slate-500 mb-4" />
            <h3 className="text-sm font-bold text-white mb-2">{isVi ? "Không tìm thấy giao dịch nào." : "No transactions found."}</h3>
            <p className="text-xs text-slate-400">
              {isVi ? "Tạo giao dịch đầu tiên hoặc nhập tệp CSV để bắt đầu." : "Create your first transaction or import a CSV file to begin."}
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
            onRecordStockDividend={recordStockDividend}
            recordedStockDividendIds={recordedStockDividendIds}
            baseCurrency={baseCurrency}
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
            reportSyncStatus={reportSyncStatus}
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
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">{isVi ? "Trung Tâm Cảnh Báo" : "Alert Center"}</h4>
              {notifications.length > 0 && (
                <button 
                  onClick={clearAllNotifications}
                  className="text-xs font-semibold text-slate-400 hover:text-red-400 flex items-center gap-1.5"
                >
                  <Trash2 size={12} /> {isVi ? "Xóa tất cả" : "Clear All"}
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="antigravity-panel p-6 bg-white/[0.02] border border-white/5 text-center text-slate-400 py-12 text-xs">
                {isVi ? "Không có thông báo mới nào." : "No new notifications."}
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
                        {isVi ? "Đánh dấu đã đọc" : "Mark as read"}
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
