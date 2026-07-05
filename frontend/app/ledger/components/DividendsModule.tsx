"use client";

import React, { useState, useMemo } from 'react';
import { Layers, Plus, Calendar, Coins, CheckCircle, Clock } from 'lucide-react';
import { TransactionDTO, DividendEventDTO, DividendType } from '../../../types/ledger';
import { calculateReceivedDividends, CalculatedDividend } from '../services/calculators/dividendCalculator';

interface DividendsModuleProps {
  transactions: TransactionDTO[];
  dividendEvents: DividendEventDTO[];
  onAddEvent: (event: Omit<DividendEventDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>) => void;
}

export default function DividendsModule({ transactions, dividendEvents, onAddEvent }: DividendsModuleProps) {
  const [showAddForm, setShowAddForm] = useState(false);
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
  const itemsPerPage = 8;

  // Process received dividends dynamically
  const receivedDividends = useMemo(() => {
    return calculateReceivedDividends(transactions, dividendEvents);
  }, [transactions, dividendEvents]);

  // Filters application
  const filteredDividends = useMemo(() => {
    let list = [...receivedDividends];

    if (filterSymbol.trim()) {
      list = list.filter(d => d.symbol.toLowerCase().includes(filterSymbol.toLowerCase()));
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
  const totalPages = Math.ceil(filteredDividends.length / itemsPerPage);
  const paginatedDividends = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredDividends.slice(start, start + itemsPerPage);
  }, [filteredDividends, page]);

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

  return (
    <div className="space-y-6 text-xs">
      {/* Dividend Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="antigravity-panel p-4 bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Cổ Tức Tiền Mặt Đã Nhận</p>
            <h3 className="text-xl font-black text-emerald-400 mt-1">{totalCashReceived.toLocaleString()}đ</h3>
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

      {/* Control bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.01] p-4 rounded-xl border border-white/5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Lọc theo mã cổ phiếu..."
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 text-white focus:outline-none w-[160px]"
          />
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
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
      <div className="antigravity-panel overflow-x-auto border border-white/5 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              {[
                { label: 'Mã CP', field: 'symbol' },
                { label: 'Ngày Chốt Quyền', field: 'recordDate' },
                { label: 'Ngày Thanh Toán', field: 'paymentDate' },
                { label: 'Mức Cổ Tức / Tỷ Lệ', field: 'rate' },
                { label: 'Loại', field: 'type' },
                { label: 'Lô Sở Hữu Lúc Chốt', field: 'sharesHeldAtRecord' },
                { label: 'Thực Nhận', field: 'payout' },
                { label: 'Trạng Thái', field: 'isValid' }
              ].map(col => (
                <th 
                  key={col.label} 
                  onClick={() => handleSort(col.field as any)}
                  className="py-3 px-4 font-bold text-slate-400 cursor-pointer hover:text-white transition-colors"
                >
                  {col.label} {sortField === col.field ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedDividends.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">Không tìm thấy bản ghi cổ tức hợp lệ.</td>
              </tr>
            ) : (
              paginatedDividends.map((div, i) => (
                <tr key={`${div.id}-${i}`} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">{div.symbol}</td>
                  <td className="py-3 px-4 text-slate-300">{div.recordDate}</td>
                  <td className="py-3 px-4 text-slate-300">{div.paymentDate}</td>
                  <td className="py-3 px-4 text-slate-300">
                    {div.type === 'CASH' 
                      ? `${div.rate.toLocaleString()}đ` 
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
                      ? `${div.payout.toLocaleString()}đ` 
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white/[0.01] p-3 rounded-xl border border-white/5">
          <button 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 disabled:pointer-events-none"
          >
            Trở lại
          </button>
          <span className="text-slate-400">Trang {page} / {totalPages}</span>
          <button 
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 disabled:pointer-events-none"
          >
            Tiếp theo
          </button>
        </div>
      )}
    </div>
  );
}
