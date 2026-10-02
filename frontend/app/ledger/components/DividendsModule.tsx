"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Layers, Plus, Coins, CheckCircle, Clock } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TransactionDTO, DividendEventDTO, DividendType } from '../../../types/ledger';
import { calculateReceivedDividends, CalculatedDividend } from '../services/calculators/dividendCalculator';
import styles from './DividendsModule.module.css';

const DIVIDEND_COLUMNS: { label: string; field: keyof CalculatedDividend; numeric?: boolean }[] = [
  { label: 'Mã CP', field: 'symbol' },
  { label: 'Ngày Chốt Quyền', field: 'recordDate' },
  { label: 'Ngày Thanh Toán', field: 'paymentDate' },
  { label: 'Mức Cổ Tức / Tỷ Lệ', field: 'rate', numeric: true },
  { label: 'Loại', field: 'type' },
  { label: 'CP tại ngày chốt', field: 'sharesHeldAtRecord', numeric: true },
  { label: 'Thực Nhận', field: 'payout', numeric: true },
  { label: 'Trạng Thái', field: 'isValid' },
];

const COMPANY_NAMES: Record<string, string> = {
  FPT: "Cổ phần FPT",
  HPG: "Tập đoàn Hòa Phát",
  VCB: "Vietcombank",
  VNM: "Sữa Việt Nam",
  TCB: "Techcombank",
  SSI: "Chứng khoán SSI",
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  TSLA: "Tesla Inc.",
  NVDA: "NVIDIA Corp.",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com Inc.",
  META: "Meta Platforms Inc.",
  VHM: "Vinhomes",
  VIC: "Vingroup",
  VPB: "VPBank",
  MBB: "MB Bank",
  MWG: "Thế giới Di động",
  ACB: "Ngân hàng Á Châu",
  STB: "Sacombank",
  VJC: "Vietjet Air"
};
interface DividendsModuleProps {
  transactions: TransactionDTO[];
  dividendEvents: DividendEventDTO[];
  onAddEvent: (event: Omit<DividendEventDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>) => void;
  onRecordStockDividend: (dividend: CalculatedDividend) => Promise<void>;
  recordedStockDividendIds: Set<string>;
  baseCurrency?: string;
}

export default function DividendsModule({ transactions, dividendEvents, onAddEvent, onRecordStockDividend, recordedStockDividendIds, baseCurrency = 'VND' }: DividendsModuleProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    symbol: '',
    recordDate: '',
    paymentDate: '',
    dividendRate: '',
    type: 'CASH' as DividendType
  });

  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  
  // Sorting & Pagination
  const [sortField, setSortField] = useState<keyof CalculatedDividend>('paymentDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState('25');
  const detailsScrollRef = useRef<HTMLDivElement>(null);

  // Process received dividends dynamically
  const receivedDividends = useMemo(() => {
    return calculateReceivedDividends(transactions, dividendEvents, baseCurrency);
  }, [transactions, dividendEvents, baseCurrency]);

  // Filters application
  const filteredDividends = useMemo(() => {
    let list = [...receivedDividends];

    if (filterSymbol.trim()) {
      list = list.filter(d => d.symbol.toLowerCase().includes(filterSymbol.trim().toLowerCase()));
    }

    if (filterType !== 'ALL') {
      list = list.filter(d => d.type === filterType);
    }

    // Apply Sorting
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return list;
  }, [receivedDividends, filterSymbol, filterType, sortField, sortAsc]);

  // Pagination
  const itemsPerPage = pageSize === 'ALL' ? Math.max(1, filteredDividends.length) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredDividends.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedDividends = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDividends.slice(start, start + itemsPerPage);
  }, [filteredDividends, currentPage, itemsPerPage]);
  const firstVisibleRow = filteredDividends.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastVisibleRow = Math.min(currentPage * itemsPerPage, filteredDividends.length);

  // Data refreshes can remove the last page; never leave the user on an empty page.
  useEffect(() => { setPage(currentPage); }, [currentPage]);
  useEffect(() => {
    if (detailsScrollRef.current) detailsScrollRef.current.scrollTop = 0;
  }, [currentPage, pageSize, filterSymbol, filterType, sortField, sortAsc]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.recordDate || !formData.paymentDate || !formData.dividendRate) return;

    onAddEvent({
      symbol: formData.symbol.toUpperCase(),
      recordDate: formData.recordDate,
      paymentDate: formData.paymentDate,
      dividendRate: Number(formData.dividendRate),
      type: formData.type
    });

    setFormData({
      symbol: '',
      recordDate: '',
      paymentDate: '',
      dividendRate: '',
      type: 'CASH'
    });
    setShowAddForm(false);
  };

  const handleSort = (field: keyof CalculatedDividend) => {
    setPage(1);
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Metrics summary
  const totalCashReceived = useMemo(() => {
    return receivedDividends
      .filter(d => d.isValid && d.type === 'CASH')
      .reduce((sum, d) => sum + d.payout, 0);
  }, [receivedDividends]);

  const totalStockReceived = useMemo(() => {
    return receivedDividends
      .filter(d => d.isValid && d.type === 'STOCK')
      .reduce((sum, d) => sum + d.payout, 0);
  }, [receivedDividends]);

  const dividendChartData = useMemo(() => {
    const byMonth = new Map<string, number>();
    receivedDividends.filter((dividend) => dividend.isValid && dividend.type === 'CASH').forEach((dividend) => {
      const month = dividend.paymentDate.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + dividend.payout);
    });
    let cumulative = 0;
    return [...byMonth.entries()].sort(([left], [right]) => left.localeCompare(right)).slice(-12).map(([month, received]) => {
      cumulative += received;
      return { month, received, cumulative };
    });
  }, [receivedDividends]);

  const formatMoney = (value: number) => new Intl.NumberFormat(baseCurrency === 'USD' ? 'en-US' : 'vi-VN', {
    style: 'currency', currency: baseCurrency, maximumFractionDigits: 0,
  }).format(value);
  const dividendsBySymbol = useMemo(() => {
    const bySymbol = new Map<string, { symbol: string; cashReceived: number; stockReceived: number; sharesAtLatestRecord: number; receivedEvents: number }>();
    receivedDividends.filter((dividend) => dividend.isValid).forEach((dividend) => {
      const summary = bySymbol.get(dividend.symbol) ?? { symbol: dividend.symbol, cashReceived: 0, stockReceived: 0, sharesAtLatestRecord: 0, receivedEvents: 0 };
      if (dividend.type === 'CASH') summary.cashReceived += dividend.payout;
      else summary.stockReceived += dividend.payout;
      summary.sharesAtLatestRecord = Math.max(summary.sharesAtLatestRecord, dividend.sharesHeldAtRecord);
      summary.receivedEvents += 1;
      bySymbol.set(dividend.symbol, summary);
    });
    return [...bySymbol.values()].sort((left, right) => (right.cashReceived + right.stockReceived) - (left.cashReceived + left.stockReceived));
  }, [receivedDividends]);
  return (
    <div className="min-w-0 max-w-full space-y-6 text-xs">
      {/* Dividend Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="antigravity-panel p-4 bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Cổ Tức Tiền Mặt Đã Nhận ({baseCurrency})</p>
            <h3 className="text-xl font-black text-emerald-400 mt-1">
              {baseCurrency === 'USD' ? '$' : ''}
              {totalCashReceived.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              {baseCurrency !== 'USD' ? 'đ' : ''}
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Coins size={18} />
          </div>
        </div>

        <div className="antigravity-panel p-4 bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Cổ Tức Cổ Phiếu Đã Nhận</p>
            <h3 className="text-xl font-black text-indigo-400 mt-1">{totalStockReceived.toLocaleString()} CP</h3>
          </div>
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Layers size={18} />
          </div>
        </div>
      </div>

      <section className="antigravity-panel border border-white/5 bg-white/[0.02] p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div><h4 className="text-xs font-bold uppercase tracking-wider text-white">Tổng cổ tức tiền mặt đã nhận ({baseCurrency})</h4><p className="mt-1 text-[11px] text-slate-500">Khoản thực nhận theo tháng và tổng lũy kế, tối đa 12 tháng gần nhất.</p></div>
          <span className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">{formatMoney(totalCashReceived)}</span>
        </div>
        {dividendChartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-white/10 bg-slate-950/30 px-4 text-center text-[11px] text-slate-500">Chưa có cổ tức tiền mặt đã thanh toán để lập biểu đồ.</div>
        ) : (
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={dividendChartData} margin={{ top: 10, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
            <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={80} tickFormatter={(value) => formatMoney(Number(value))} fontSize={10} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(value, name) => [formatMoney(Number(value ?? 0)), name === 'received' ? 'Cổ tức nhận tháng' : 'Tổng lũy kế']} />
            <Legend formatter={(value) => value === 'received' ? 'Cổ tức nhận tháng' : 'Tổng cổ tức lũy kế'} />
            <Bar dataKey="received" name="received" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="cumulative" name="cumulative" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart></ResponsiveContainer></div>
        )}
      </section>
      <section className="antigravity-panel min-w-0 max-w-full border border-white/5 rounded-xl">
        <div className="border-b border-white/5 px-4 py-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Tổng hợp cổ tức đã nhận theo mã</h4>
          <p className="mt-1 text-[11px] text-slate-500">Tiền mặt và cổ phiếu thưởng chỉ tính các kỳ đã thanh toán, dựa trên số lượng nắm giữ tại ngày chốt quyền.</p>
          <p className="mt-2 text-[11px] text-slate-400">Hiển thị đầy đủ {dividendsBySymbol.length} mã · Cuộn trong bảng để xem thêm hàng và cột.</p>
        </div>
        {dividendsBySymbol.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-slate-500">Chưa có kỳ cổ tức đã thanh toán hợp lệ.</p>
        ) : (
          <div className={styles.scrollArea} role="region" aria-label="Cuộn bảng tổng hợp cổ tức" tabIndex={0}>
          <table className={`${styles.table} text-left`} aria-label="Tổng hợp cổ tức đã nhận theo mã">
            <thead><tr className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-wide text-slate-500"><th scope="col" className="px-4 py-3">Mã</th><th scope="col" className="px-4 py-3">Tên công ty</th><th scope="col" className="px-4 py-3 text-right">Tiền mặt đã nhận ({baseCurrency})</th><th scope="col" className="px-4 py-3 text-right">Cổ phiếu thưởng</th><th scope="col" className="px-4 py-3 text-right">CP tại ngày chốt</th><th scope="col" className="px-4 py-3 text-right">Số kỳ đã nhận</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {dividendsBySymbol.map((item) => <tr key={item.symbol} className="hover:bg-white/[0.015]"><td className="px-4 py-3 font-semibold text-white">{item.symbol}</td><td className="px-4 py-3 text-slate-400">{COMPANY_NAMES[item.symbol] || item.symbol}</td><td className="px-4 py-3 text-right font-semibold text-emerald-300">{formatMoney(item.cashReceived)}</td><td className="px-4 py-3 text-right text-indigo-300">{item.stockReceived.toLocaleString()} CP</td><td className="px-4 py-3 text-right text-slate-300">{item.sharesAtLatestRecord.toLocaleString()} CP</td><td className="px-4 py-3 text-right text-slate-400">{item.receivedEvents}</td></tr>)}
            </tbody>
          </table>
          </div>
        )}
        {!receivedDividends.some((dividend) => dividend.type === 'STOCK') && <p className="border-t border-white/5 px-4 py-3 text-[11px] text-amber-300/80">Chưa có dữ liệu cổ tức bằng cổ phiếu từ nguồn tự động. Bạn có thể thêm sự kiện loại “Cổ phiếu” để theo dõi cổ phiếu thưởng/bonus issue.</p>}
      </section>
      {/* Control bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.01] p-4 rounded-xl border border-white/5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Lọc theo mã cổ phiếu..."
            aria-label="Lọc theo mã cổ phiếu"
            value={filterSymbol}
            onChange={(e) => { setFilterSymbol(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 text-white focus:outline-none w-[160px]"
          />
          
          <select
            aria-label="Lọc theo loại cổ tức"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 text-white focus:outline-none"
          >
            <option value="ALL">Tất cả loại cổ tức</option>
            <option value="CASH">Tiền mặt</option>
            <option value="STOCK">Cổ phiếu</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors ml-auto md:ml-0"
        >
          <Plus size={14} /> Thêm Sự Kiện Cổ Tức
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="antigravity-panel p-4 bg-white/[0.02] border border-white/10 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Mã CP (VD: FPT)"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            className="p-2 rounded border border-white/10 bg-black/40 text-white"
            required
          />
          <input
            type="date"
            placeholder="Ngày chốt quyền"
            value={formData.recordDate}
            onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
            className="p-2 rounded border border-white/10 bg-black/40 text-white"
            required
          />
          <input
            type="date"
            placeholder="Ngày thanh toán"
            value={formData.paymentDate}
            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            className="p-2 rounded border border-white/10 bg-black/40 text-white"
            required
          />
          <input
            type="number"
            step="any"
            placeholder="Tỷ lệ (VD: 2000 hoặc 0.15)"
            value={formData.dividendRate}
            onChange={(e) => setFormData({ ...formData, dividendRate: e.target.value })}
            className="p-2 rounded border border-white/10 bg-black/40 text-white"
            required
          />
          <div className="flex gap-2">
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as DividendType })}
              className="p-2 rounded border border-white/10 bg-black/40 text-white flex-1"
            >
              <option value="CASH">Tiền mặt</option>
              <option value="STOCK">Cổ phiếu</option>
            </select>
            <button type="submit" className="px-3 bg-indigo-600 hover:bg-indigo-500 rounded font-bold">Thêm</button>
          </div>
        </form>
      )}

      {/* Main Ledger Table */}
      <section className="antigravity-panel min-w-0 max-w-full border border-white/5 rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Chi tiết các kỳ cổ tức</h4>
            <p className="mt-1 text-[11px] text-slate-400">Cuộn trong bảng để xem đầy đủ hàng và cột.</p>
          </div>
          <label className="flex items-center gap-2 text-slate-300">
            Số dòng
            <select aria-label="Số dòng mỗi trang" value={pageSize} onChange={(e) => { setPageSize(e.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-black/40 text-white">
              {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size} dòng</option>)}
              <option value="ALL">Tất cả</option>
            </select>
          </label>
        </div>
        {recordingError && <p role="alert" className="px-4 py-3 text-rose-400">{recordingError}</p>}
        <div ref={detailsScrollRef} className={styles.scrollArea} role="region" aria-label="Cuộn bảng chi tiết cổ tức" tabIndex={0}>
        <table className={`${styles.table} ${styles.detailsTable} text-left`} aria-label="Chi tiết các kỳ cổ tức">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              {DIVIDEND_COLUMNS.map(col => (
                <th 
                  key={col.label} 
                  scope="col"
                  aria-sort={sortField === col.field ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  className={`py-3 px-4 font-bold text-slate-400 ${col.numeric ? 'text-right' : 'text-left'}`}
                >
                  <button type="button" onClick={() => handleSort(col.field)} className="hover:text-white transition-colors">
                  {col.label} {sortField === col.field ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
              ))}
              <th scope="col" className="py-3 px-4 font-bold text-slate-400 text-center">Ghi nhận Holding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedDividends.length === 0 ? (
              <tr>
                <td colSpan={DIVIDEND_COLUMNS.length + 1} className="py-8 text-center text-slate-500">Không tìm thấy bản ghi cổ tức hợp lệ.</td>
              </tr>
            ) : (
              paginatedDividends.map((div, i) => (
                <tr key={`${div.id}-${i}`} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">{div.symbol}</td>
                  <td className="py-3 px-4 text-slate-300">{div.recordDate}</td>
                  <td className="py-3 px-4 text-slate-300">{div.paymentDate}</td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    {div.type === 'CASH' 
                      ? (['AAPL', 'APPLE', 'MSFT', 'SANTA', 'SAN', 'JPM', 'CAT', 'AMZN', 'ADI', 'NVDA', 'AVGO', 'SPCX', 'AMD', 'MU', 'LRCX', 'KLAC', 'PANW', 'TSM', 'AMAT', 'CRWD', 'PLTR', 'ARM', 'SNDK', 'TSLA', 'GOOG', 'BAC', 'LLY', 'MRVL'].includes(div.symbol.toUpperCase())
                          ? `$${div.rate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })}` 
                          : `${div.rate.toLocaleString()}đ`)
                      : `${(div.rate * 100).toFixed(0)}%`
                    }
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                      div.type === 'CASH' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {div.type === 'CASH' ? 'Tiền mặt' : 'Cổ phiếu'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300">{div.sharesHeldAtRecord.toLocaleString()} CP</td>
                  <td className="py-3 px-4 font-bold text-white text-right">
                    {div.type === 'CASH' 
                      ? (baseCurrency === 'USD'
                          ? `$${div.payout.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                          : `${div.payout.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}đ`)
                      : `${div.payout.toLocaleString()} CP`
                    }
                  </td>
                  <td className="py-3 px-4">
                    <span className={`flex items-center gap-1 font-semibold ${div.isValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {div.isValid ? (
                        <><CheckCircle size={12} /> Đã nhận</>
                      ) : (
                        <><Clock size={12} /> Dự kiến</>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {div.type === 'STOCK' && div.isValid ? (
                      recordedStockDividendIds.has(div.id) ? <span className="text-[10px] font-semibold text-emerald-300">Đã ghi nhận</span> : (
                        <button type="button" disabled={recordingId === div.id} onClick={async () => { setRecordingId(div.id); setRecordingError(null); try { await onRecordStockDividend(div); } catch (error) { setRecordingError(error instanceof Error ? error.message : 'Không thể ghi nhận cổ phiếu thưởng.'); } finally { setRecordingId(null); } }} className="rounded-md border border-indigo-400/30 bg-indigo-400/10 px-2 py-1 text-[10px] font-semibold text-indigo-200 disabled:opacity-50">{recordingId === div.id ? 'Đang ghi...' : 'Ghi vào Holding'}</button>
                      )
                    ) : <span className="text-slate-600">--</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

      {/* Pagination controls */}
        <div className="flex flex-wrap justify-between items-center gap-3 border-t border-white/5 px-4 py-3">
          <p role="status" className="text-slate-400">Hiển thị {firstVisibleRow}–{lastVisibleRow} / {filteredDividends.length} kỳ cổ tức</p>
          <nav aria-label="Phân trang cổ tức" className="flex flex-wrap items-center gap-3">
          <button 
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 disabled:pointer-events-none"
          >
            Trở lại
          </button>
          <span className="text-slate-400">Trang {currentPage} / {totalPages}</span>
          <button 
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 disabled:pointer-events-none"
          >
            Tiếp theo
          </button>
          </nav>
        </div>
      </section>
    </div>
  );
}
