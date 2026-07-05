"use client";

import React, { useState, useMemo } from 'react';
import { CreditCard, Plus, Eye, Archive, Trash2, Calendar, Clipboard, AlertTriangle } from 'lucide-react';
import { BondLedgerDTO, BondStatus } from '../../../types/ledger';
import { calculateBondMetrics } from '../services/calculators/bondCalculator';

interface BondsModuleProps {
  bonds: BondLedgerDTO[];
  onAddBond: (bond: Omit<BondLedgerDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>) => void;
  onUpdateBond: (id: string, fields: Partial<BondLedgerDTO>) => void;
  onDeleteBond: (id: string, soft?: boolean) => void;
  onArchiveBond: (id: string, archive: boolean) => void;
}

export default function BondsModule({ bonds, onAddBond, onUpdateBond, onDeleteBond, onArchiveBond }: BondsModuleProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBondId, setSelectedBondId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    issuer: '',
    faceValue: '',
    quantity: '1',
    purchaseDate: '',
    maturityDate: '',
    couponRate: '',
    couponFrequency: '6',
    status: 'ACTIVE' as BondStatus,
    notes: ''
  });

  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');
  const [filterQuery, setFilterQuery] = useState('');

  // Active or archived bonds filter
  const processedBonds = useMemo(() => {
    let list = bonds.filter(b => !b.deletedAt);
    
    if (filterStatus === 'ACTIVE') {
      list = list.filter(b => b.status === 'ACTIVE' && !b.archived);
    } else if (filterStatus === 'ARCHIVED') {
      list = list.filter(b => b.archived || b.status === 'MATURED');
    }

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      list = list.filter(b => 
        b.name.toLowerCase().includes(q) || 
        b.issuer.toLowerCase().includes(q)
      );
    }

    return list;
  }, [bonds, filterStatus, filterQuery]);

  // Selected bond coupon schedule and metrics details
  const selectedBondDetails = useMemo(() => {
    if (!selectedBondId) return null;
    const bond = bonds.find(b => b.id === selectedBondId);
    if (!bond) return null;
    return {
      bond,
      metrics: calculateBondMetrics(bond, '2026-07-05')
    };
  }, [selectedBondId, bonds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.issuer || !formData.faceValue || !formData.purchaseDate || !formData.maturityDate || !formData.couponRate) return;

    onAddBond({
      name: formData.name,
      issuer: formData.issuer,
      faceValue: Number(formData.faceValue),
      quantity: Number(formData.quantity),
      purchaseDate: formData.purchaseDate,
      maturityDate: formData.maturityDate,
      couponRate: Number(formData.couponRate),
      couponFrequency: Number(formData.couponFrequency),
      status: formData.status,
      notes: formData.notes
    });

    setFormData({
      name: '',
      issuer: '',
      faceValue: '',
      quantity: '1',
      purchaseDate: '',
      maturityDate: '',
      couponRate: '',
      couponFrequency: '6',
      status: 'ACTIVE',
      notes: ''
    });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 text-xs grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List section */}
      <div className="lg:col-span-2 space-y-4">
        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.01] p-4 rounded-xl border border-white/5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Tìm tên hoặc tổ chức phát hành..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 text-white focus:outline-none w-[200px]"
            />
            
            <div className="flex rounded-lg bg-black/40 p-0.5 border border-white/10">
              <button
                onClick={() => setFilterStatus('ACTIVE')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                  filterStatus === 'ACTIVE' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Đang Nắm Giữ
              </button>
              <button
                onClick={() => setFilterStatus('ARCHIVED')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                  filterStatus === 'ARCHIVED' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Đáo Hạn & Đã Bán
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
          >
            <Plus size={14} /> Thêm Trái Phiếu
          </button>
        </div>

        {/* Add Bond Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="antigravity-panel p-5 bg-white/[0.02] border border-indigo-500/20 rounded-xl space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={16} className="text-indigo-400" /> Thêm Trái Phiếu Thủ Công
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Tên Trái Phiếu</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Trái phiếu BIDV2026"
                  className="p-2 rounded border border-white/10 bg-black/40 text-white focus:border-indigo-500/50"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Tổ Chức Phát Hành</label>
                <input
                  type="text"
                  value={formData.issuer}
                  onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                  placeholder="Ví dụ: Ngân hàng BIDV"
                  className="p-2 rounded border border-white/10 bg-black/40 text-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Mệnh Giá (đ)</label>
                <input
                  type="number"
                  value={formData.faceValue}
                  onChange={(e) => setFormData({ ...formData, faceValue: e.target.value })}
                  placeholder="Ví dụ: 100000000"
                  className="p-2 rounded border border-white/10 bg-black/40 text-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Số Lượng</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="p-2 rounded border border-white/10 bg-black/40 text-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Lãi Suất (% / Năm)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.couponRate}
                  onChange={(e) => setFormData({ ...formData, couponRate: e.target.value })}
                  placeholder="Ví dụ: 8.5"
                  className="p-2 rounded border border-white/10 bg-black/40 text-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Kỳ Trả Lãi (Tháng)</label>
                <select
                  value={formData.couponFrequency}
                  onChange={(e) => setFormData({ ...formData, couponFrequency: e.target.value })}
                  className="p-2 rounded border border-white/10 bg-black/40 text-white"
                >
                  <option value="3">3 tháng / lần (Hàng Quý)</option>
                  <option value="6">6 tháng / lần (Bán niên)</option>
                  <option value="12">12 tháng / lần (Hàng Năm)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Ngày Mua</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="p-2 rounded border border-white/10 bg-black/40 text-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Ngày Đáo Hạn</label>
                <input
                  type="date"
                  value={formData.maturityDate}
                  onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                  className="p-2 rounded border border-white/10 bg-black/40 text-white"
                  required
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Ghi Chú</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ghi chú thêm về điều khoản thả nổi, đại lý phát hành..."
                className="p-2 rounded border border-white/10 bg-black/40 text-white h-16 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded font-bold"
              >
                Hủy bỏ
              </button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-bold">Lưu Trái Phiếu</button>
            </div>
          </form>
        )}

        {/* Bonds table */}
        <div className="antigravity-panel overflow-x-auto border border-white/5 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="py-3 px-4 font-bold text-slate-400">Tên Trái Phiếu</th>
                <th className="py-3 px-4 font-bold text-slate-400">Tổ Chức</th>
                <th className="py-3 px-4 font-bold text-slate-400 text-right">Tổng Mệnh Giá</th>
                <th className="py-3 px-4 font-bold text-slate-400 text-right">Lãi Suất</th>
                <th className="py-3 px-4 font-bold text-slate-400">Kỳ Hạn</th>
                <th className="py-3 px-4 font-bold text-slate-400">Đáo Hạn</th>
                <th className="py-3 px-4 font-bold text-slate-400 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {processedBonds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">Không có trái phiếu nào phù hợp bộ lọc.</td>
                </tr>
              ) : (
                processedBonds.map(bond => {
                  const totalVal = bond.faceValue * bond.quantity;
                  const isSelected = selectedBondId === bond.id;
                  return (
                    <tr 
                      key={bond.id} 
                      className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${
                        isSelected ? 'bg-indigo-500/5' : ''
                      }`}
                      onClick={() => setSelectedBondId(bond.id)}
                    >
                      <td className="py-3 px-4 font-semibold text-white">{bond.name}</td>
                      <td className="py-3 px-4 text-slate-300">{bond.issuer}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{totalVal.toLocaleString()}đ</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">{bond.couponRate}%</td>
                      <td className="py-3 px-4 text-slate-300">{bond.couponFrequency} tháng</td>
                      <td className="py-3 px-4 text-slate-300">{bond.maturityDate}</td>
                      <td className="py-3 px-4 flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedBondId(bond.id)}
                          className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded"
                          title="Xem Chi Tiết Lịch Trả Lãi"
                        >
                          <Eye size={14} />
                        </button>
                        
                        <button
                          onClick={() => onArchiveBond(bond.id, !bond.archived)}
                          className={`p-1 hover:bg-white/10 rounded ${bond.archived ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
                          title={bond.archived ? "Bỏ lưu trữ" : "Lưu trữ trái phiếu"}
                        >
                          <Archive size={14} />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm('Xóa trái phiếu này?')) {
                              onDeleteBond(bond.id, false);
                              if (selectedBondId === bond.id) setSelectedBondId(null);
                            }
                          }}
                          className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded"
                          title="Xóa vĩnh viễn"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details/Schedule panel */}
      <div className="lg:col-span-1">
        {selectedBondDetails ? (
          <div className="antigravity-panel p-5 bg-white/[0.02] border border-white/5 rounded-xl space-y-5 h-full flex flex-col">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clipboard size={16} className="text-indigo-400" /> Chi Tiết Trái Phiếu
              </h4>
              <p className="text-slate-400 mt-1">{selectedBondDetails.bond.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-white/[0.01] p-3 rounded-lg border border-white/5">
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase">Gốc Còn Lại</p>
                <p className="text-sm font-bold text-slate-200">
                  {selectedBondDetails.metrics.remainingPrincipal.toLocaleString()}đ
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase">Lãi mỗi kỳ</p>
                <p className="text-sm font-bold text-emerald-400">
                  {selectedBondDetails.metrics.interestPerPeriod.toLocaleString()}đ
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase">Ngày trả lãi tới</p>
                <p className="text-[11px] font-bold text-slate-200">
                  {selectedBondDetails.metrics.nextCouponDate || 'Đã đáo hạn'}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase">Cận đáo hạn</p>
                <p className="text-[11px] font-bold text-amber-400">
                  {selectedBondDetails.metrics.nextCouponDate 
                    ? `${selectedBondDetails.metrics.remainingDaysToCoupon} ngày` 
                    : 'N/A'
                  }
                </p>
              </div>
            </div>

            {selectedBondDetails.bond.notes && (
              <div className="p-3 bg-white/[0.01] rounded-lg border border-white/5 text-[11px] text-slate-400">
                <span className="font-bold text-slate-300 block mb-1">Ghi chú:</span>
                {selectedBondDetails.bond.notes}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[220px] pr-1 custom-scrollbar">
              <span className="font-bold text-slate-400 uppercase tracking-widest block text-[9px]">Lịch Trả Lãi Coupon:</span>
              {selectedBondDetails.metrics.couponSchedule.map((c, i) => (
                <div 
                  key={i} 
                  className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    c.status === 'PAID' 
                      ? 'bg-emerald-500/5 border-emerald-500/10 text-slate-500' 
                      : 'bg-white/[0.01] border-white/5 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className={c.status === 'PAID' ? 'text-slate-600' : 'text-indigo-400'} />
                    <span>{c.paymentDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{c.amount.toLocaleString()}đ</span>
                    <span className="block text-[8px] uppercase tracking-widest mt-0.5">
                      {c.status === 'PAID' ? 'Đã nhận' : 'Chưa nhận'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="antigravity-panel p-5 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col items-center justify-center text-slate-500 py-16 h-full text-center">
            <AlertTriangle size={24} className="mb-2 text-slate-600" />
            Chọn một trái phiếu từ danh sách bên cạnh để xem chi tiết lịch trả lãi và các chỉ số quản trị dồn tích.
          </div>
        )}
      </div>
    </div>
  );
}
