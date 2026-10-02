"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, Plus, Save, History, Edit3, Trash2, CheckCircle, AlertCircle, FileText, ChevronRight, Clock
} from 'lucide-react';
import { FinancialReportDTO, JournalEntryDTO, ThesisRecommendation } from '../../../types/ledger';

interface FinancialReportsProps {
  reports: FinancialReportDTO[];
  reportSyncStatus?: string;
  journals: JournalEntryDTO[];
  onAddReport: (report: Omit<FinancialReportDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>) => boolean;
  onSaveJournal: (entry: Omit<JournalEntryDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived' | 'revisions'>) => void;
  onAutosaveJournal: (symbol: string, reportId: string | undefined, thesis: string) => void;
  onDeleteJournal: (id: string) => void;
}

export default function FinancialReports({ 
  reports, reportSyncStatus, journals, onAddReport, onSaveJournal, onAutosaveJournal, onDeleteJournal 
}: FinancialReportsProps) {
  
  const [selectedSymbol, setSelectedSymbol] = useState<string>('FPT');
  
  // Tab within BCTC Module
  const [subTab, setSubTab] = useState<'warehouse' | 'journal'>('warehouse');
  
  // 1. Warehouse States
  const [showAddReportForm, setShowAddReportForm] = useState(false);
  const [reportFormData, setReportFormData] = useState({
    year: '2025',
    period: 'FY' as any,
    revenue: '',
    grossProfit: '',
    operatingIncome: '',
    netIncome: '',
    totalAssets: '',
    totalLiabilities: '',
    totalEquity: '',
    cashAndEquivalents: '',
    roe: '',
    roa: '',
    eps: '',
    pe: ''
  });

  // 2. Journal States
  const [journalForm, setJournalForm] = useState({
    investmentThesis: '',
    strengths: '',
    weaknesses: '',
    risks: '',
    managementComments: '',
    recommendation: 'BUY' as ThesisRecommendation,
    targetPrice: '',
    confidence: 4,
    tags: '',
    attachments: ''
  });
  
  const [autosaveStatus, setAutosaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Active journal entry for the selected symbol
  const activeJournal = useMemo(() => {
    return journals.find(j => j.symbol === selectedSymbol && !j.deletedAt);
  }, [journals, selectedSymbol]);

  // Load journal data into form when symbol changes
  useEffect(() => {
    if (activeJournal) {
      setJournalForm({
        investmentThesis: activeJournal.investmentThesis || '',
        strengths: activeJournal.strengths.join(', ') || '',
        weaknesses: activeJournal.weaknesses.join(', ') || '',
        risks: activeJournal.risks.join(', ') || '',
        managementComments: activeJournal.managementComments || '',
        recommendation: activeJournal.recommendation || 'BUY',
        targetPrice: activeJournal.targetPrice?.toString() || '',
        confidence: activeJournal.confidence || 4,
        tags: activeJournal.tags.join(', ') || '',
        attachments: activeJournal.attachments.join(', ') || ''
      });
    } else {
      setJournalForm({
        investmentThesis: '',
        strengths: '',
        weaknesses: '',
        risks: '',
        managementComments: '',
        recommendation: 'WATCH',
        targetPrice: '',
        confidence: 3,
        tags: '',
        attachments: ''
      });
    }
  }, [activeJournal, selectedSymbol]);

  // Debounced Autosave for Thesis content
  const handleThesisChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJournalForm(prev => ({ ...prev, investmentThesis: text }));
    setAutosaveStatus('SAVING');

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(() => {
      onAutosaveJournal(selectedSymbol, undefined, text);
      setAutosaveStatus('SAVED');
      setTimeout(() => setAutosaveStatus('IDLE'), 2000);
    }, 2500);
  };

  const handleSaveJournalFull = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveJournal({
      symbol: selectedSymbol,
      investmentThesis: journalForm.investmentThesis,
      strengths: journalForm.strengths.split(',').map(s => s.trim()).filter(Boolean),
      weaknesses: journalForm.weaknesses.split(',').map(s => s.trim()).filter(Boolean),
      risks: journalForm.risks.split(',').map(s => s.trim()).filter(Boolean),
      managementComments: journalForm.managementComments,
      recommendation: journalForm.recommendation,
      targetPrice: journalForm.targetPrice ? Number(journalForm.targetPrice) : undefined,
      confidence: journalForm.confidence,
      tags: journalForm.tags.split(',').map(s => s.trim()).filter(Boolean),
      attachments: journalForm.attachments.split(',').map(s => s.trim()).filter(Boolean)
    });
    alert('Đã lưu nhận định đầu tư thành công!');
  };

  const handleAddReport = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onAddReport({
      symbol: selectedSymbol,
      year: Number(reportFormData.year),
      period: reportFormData.period,
      incomeStatement: {
        revenue: Number(reportFormData.revenue || 0),
        grossProfit: Number(reportFormData.grossProfit || 0),
        operatingIncome: Number(reportFormData.operatingIncome || 0),
        netIncome: Number(reportFormData.netIncome || 0),
      },
      balanceSheet: {
        totalAssets: Number(reportFormData.totalAssets || 0),
        totalLiabilities: Number(reportFormData.totalLiabilities || 0),
        totalEquity: Number(reportFormData.totalEquity || 0),
        cashAndEquivalents: Number(reportFormData.cashAndEquivalents || 0),
      },
      cashFlow: {
        operatingCashFlow: 0,
        investingCashFlow: 0,
        financingCashFlow: 0,
        freeCashFlow: 0
      },
      ratios: {
        roe: Number(reportFormData.roe || 0),
        roa: Number(reportFormData.roa || 0),
        eps: Number(reportFormData.eps || 0),
        pe: Number(reportFormData.pe || 0),
      }
    });

    if (success) {
      alert('Đã thêm báo cáo tài chính thành công!');
      setShowAddReportForm(false);
    } else {
      alert('Lỗi: Báo cáo cho kỳ này đã tồn tại!');
    }
  };

  // List of unique symbols from reports
  const availableSymbols = useMemo(() => {
    return Array.from(new Set(reports.map(r => r.symbol)));
  }, [reports]);

  // Filtered reports for trend comparison
  const symbolReports = useMemo(() => {
    return reports
      .filter(r => r.symbol === selectedSymbol && !r.deletedAt)
      .sort((a, b) => a.year - b.year || a.period.localeCompare(b.period));
  }, [reports, selectedSymbol]);

  return (
    <div className="space-y-6 text-xs grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Sidebar - Symbol Selector */}
      <div className="lg:col-span-1 space-y-3">
        <span className="font-bold text-slate-500 uppercase tracking-widest block text-[9px] pl-1">Chọn Doanh Nghiệp</span>
        <div className="flex flex-col gap-1.5">
          {availableSymbols.map(sym => (
            <button
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              className={`w-full text-left px-4 py-3 rounded-xl border font-bold transition-all flex items-center justify-between ${
                selectedSymbol === sym
                  ? 'bg-indigo-600/10 text-white border-indigo-500/30 border-l-4 border-l-indigo-500'
                  : 'bg-white/[0.01] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <span>{sym}</span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="lg:col-span-3 space-y-4">
        {reportSyncStatus && (
          <div className="flex items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-3 text-[11px] text-cyan-100">
            <Clock size={13} className={reportSyncStatus.startsWith('Đang') ? 'animate-spin text-cyan-300' : 'text-emerald-300'} />
            <span>{reportSyncStatus}</span>
          </div>
        )}
        
        {/* Toggle buttons inside main area */}
        <div className="flex justify-between items-center bg-white/[0.01] p-3 rounded-xl border border-white/5">
          <div className="flex gap-2">
            <button
              onClick={() => setSubTab('warehouse')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                subTab === 'warehouse' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Lịch Sử Báo Cáo
            </button>
            <button
              onClick={() => setSubTab('journal')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === 'journal' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Nhận Định Đầu Tư
            </button>
          </div>

          {subTab === 'warehouse' && (
            <button
              onClick={() => setShowAddReportForm(!showAddReportForm)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
            >
              <Plus size={12} /> Thêm BCTC Kỳ Mới
            </button>
          )}
        </div>

        {/* 1. WAREHOUSE SUBTAB */}
        {subTab === 'warehouse' && (
          <div className="space-y-4">
            
            {showAddReportForm && (
              <form onSubmit={handleAddReport} className="antigravity-panel p-5 bg-white/[0.02] border border-indigo-500/20 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={16} className="text-indigo-400" /> Nhập Báo Cáo Tài Chính
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Năm</label>
                    <input
                      type="number"
                      value={reportFormData.year}
                      onChange={(e) => setReportFormData({ ...reportFormData, year: e.target.value })}
                      className="p-2 rounded border border-white/10 bg-black/40 text-white"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Kỳ báo cáo</label>
                    <select
                      value={reportFormData.period}
                      onChange={(e) => setReportFormData({ ...reportFormData, period: e.target.value as any })}
                      className="p-2 rounded border border-white/10 bg-black/40 text-white"
                    >
                      <option value="FY">Cả Năm (FY)</option>
                      <option value="Q1">Quý 1</option>
                      <option value="Q2">Quý 2</option>
                      <option value="Q3">Quý 3</option>
                      <option value="Q4">Quý 4</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Doanh Thu (đ)</label>
                    <input
                      type="number"
                      value={reportFormData.revenue}
                      onChange={(e) => setReportFormData({ ...reportFormData, revenue: e.target.value })}
                      className="p-2 rounded border border-white/10 bg-black/40 text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Lợi Nhuận Ròng (đ)</label>
                    <input
                      type="number"
                      value={reportFormData.netIncome}
                      onChange={(e) => setReportFormData({ ...reportFormData, netIncome: e.target.value })}
                      className="p-2 rounded border border-white/10 bg-black/40 text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Tổng Tài Sản (đ)</label>
                    <input
                      type="number"
                      value={reportFormData.totalAssets}
                      onChange={(e) => setReportFormData({ ...reportFormData, totalAssets: e.target.value })}
                      className="p-2 rounded border border-white/10 bg-black/40 text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Tổng Nợ Phải Trả (đ)</label>
                    <input
                      type="number"
                      value={reportFormData.totalLiabilities}
                      onChange={(e) => setReportFormData({ ...reportFormData, totalLiabilities: e.target.value })}
                      className="p-2 rounded border border-white/10 bg-black/40 text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">ROE (%)</label>
                    <input
                      type="number"
                      step="any"
                      value={reportFormData.roe}
                      onChange={(e) => setReportFormData({ ...reportFormData, roe: e.target.value })}
                      className="p-2 rounded border border-white/10 bg-black/40 text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">ROA (%)</label>
                    <input
                      type="number"
                      step="any"
                      value={reportFormData.roa}
                      onChange={(e) => setReportFormData({ ...reportFormData, roa: e.target.value })}
                      className="p-2 rounded border border-white/10 bg-black/40 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddReportForm(false)} 
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded font-bold"
                  >
                    Hủy bỏ
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-bold">Lưu Báo Cáo</button>
                </div>
              </form>
            )}

            {/* Historical comparison grid */}
            <div className="antigravity-panel overflow-x-auto border border-white/5 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="py-3 px-4 font-bold text-slate-400">Kỳ Báo Cáo</th>
                    <th className="py-3 px-4 font-bold text-slate-400 text-right">Doanh Thu</th>
                    <th className="py-3 px-4 font-bold text-slate-400 text-right">Lợi Nhuận Ròng</th>
                    <th className="py-3 px-4 font-bold text-slate-400 text-right">Tổng Tài Sản</th>
                    <th className="py-3 px-4 font-bold text-slate-400 text-right">Tổng Nợ</th>
                    <th className="py-3 px-4 font-bold text-slate-400 text-right">ROE</th>
                    <th className="py-3 px-4 font-bold text-slate-400 text-right">ROA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {symbolReports.length === 0 ? (
                    <tr key="empty">
                      <td colSpan={7} className="py-8 text-center text-slate-500">Chưa có dữ liệu báo cáo cho doanh nghiệp này.</td>
                    </tr>
                  ) : (
                    symbolReports.map(rep => (
                      <tr key={rep.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{rep.year} - {rep.period}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{(rep.incomeStatement.revenue).toLocaleString()}đ</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-400">{(rep.incomeStatement.netIncome).toLocaleString()}đ</td>
                        <td className="py-3 px-4 text-right text-slate-300">{(rep.balanceSheet.totalAssets).toLocaleString()}đ</td>
                        <td className="py-3 px-4 text-right text-slate-300">{(rep.balanceSheet.totalLiabilities).toLocaleString()}đ</td>
                        <td className="py-3 px-4 text-right text-slate-200">{rep.ratios.roe ? `${rep.ratios.roe}%` : 'N/A'}</td>
                        <td className="py-3 px-4 text-right text-slate-200">{rep.ratios.roa ? `${rep.ratios.roa}%` : 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. JOURNAL SUBTAB */}
        {subTab === 'journal' && (
          <form onSubmit={handleSaveJournalFull} className="space-y-4">
            
            {/* Autosave and Actions bar */}
            <div className="flex justify-between items-center bg-white/[0.01] px-4 py-2 rounded-lg border border-white/5">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                {autosaveStatus === 'SAVING' && <><Clock size={12} className="animate-spin text-indigo-400" /> Đang tự động lưu nháp...</>}
                {autosaveStatus === 'SAVED' && <><CheckCircle size={12} className="text-emerald-400" /> Đã lưu nháp tự động</>}
                {autosaveStatus === 'IDLE' && <><AlertCircle size={12} /> Hỗ trợ Markdown & Tự động lưu khi gõ</>}
              </span>
              <button 
                type="submit" 
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
              >
                <Save size={12} /> Lưu Tất Cả
              </button>
            </div>

            {/* Recommendation & Target Price Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Khuyến nghị cá nhân</label>
                <select
                  value={journalForm.recommendation}
                  onChange={(e) => setJournalForm({ ...journalForm, recommendation: e.target.value as ThesisRecommendation })}
                  className="p-2 rounded border border-white/10 bg-black/40 text-white"
                >
                  <option value="BUY">MUA (BUY)</option>
                  <option value="HOLD">NẮM GIỮ (HOLD)</option>
                  <option value="SELL">BÁN (SELL)</option>
                  <option value="WATCH">QUAN SÁT (WATCH)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Giá mục tiêu (đ)</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 150000"
                  value={journalForm.targetPrice}
                  onChange={(e) => setJournalForm({ ...journalForm, targetPrice: e.target.value })}
                  className="p-2 rounded border border-white/10 bg-black/40 text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Độ tin cậy (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={journalForm.confidence}
                  onChange={(e) => setJournalForm({ ...journalForm, confidence: Number(e.target.value) })}
                  className="p-2 rounded border border-white/10 bg-black/40 text-white"
                />
              </div>
            </div>

            {/* Markdown Investment Thesis Text Area */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <Edit3 size={12} /> Luận điểm đầu tư (Investment Thesis - Markdown)
              </label>
              <textarea
                value={journalForm.investmentThesis}
                onChange={handleThesisChange}
                placeholder="Nhập luận điểm đầu tư chi tiết hỗ trợ định dạng Markdown..."
                className="p-3 rounded border border-white/10 bg-black/40 text-white h-48 resize-y focus:border-indigo-500/50"
              />
            </div>

            {/* Strengths / Weaknesses / Risks grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Điểm Mạnh (Cách nhau bằng dấu phẩy)</label>
                <textarea
                  value={journalForm.strengths}
                  onChange={(e) => setJournalForm({ ...journalForm, strengths: e.target.value })}
                  className="p-2 rounded border border-white/10 bg-black/40 text-white h-20 resize-none"
                  placeholder="Điểm mạnh 1, Điểm mạnh 2"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Điểm Yếu (Cách nhau bằng dấu phẩy)</label>
                <textarea
                  value={journalForm.weaknesses}
                  onChange={(e) => setJournalForm({ ...journalForm, weaknesses: e.target.value })}
                  className="p-2 rounded border border-white/10 bg-black/40 text-white h-20 resize-none"
                  placeholder="Điểm yếu 1, Điểm yếu 2"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Rủi Ro (Cách nhau bằng dấu phẩy)</label>
                <textarea
                  value={journalForm.risks}
                  onChange={(e) => setJournalForm({ ...journalForm, risks: e.target.value })}
                  className="p-2 rounded border border-white/10 bg-black/40 text-white h-20 resize-none"
                  placeholder="Rủi ro 1, Rủi ro 2"
                />
              </div>
            </div>

            {/* Revisions history log */}
            {activeJournal && activeJournal.revisions && activeJournal.revisions.length > 0 && (
              <div className="antigravity-panel p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-2">
                <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] flex items-center gap-1">
                  <History size={12} /> Lịch Sử Chỉnh Sửa (Revisions)
                </span>
                <div className="space-y-1 text-[10px]">
                  {activeJournal.revisions.map((rev, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-400 py-1 hover:text-slate-200">
                      <span>Phiên bản {rev.version} - Khuyến nghị: {rev.recommendation}</span>
                      <span>Lúc: {new Date(rev.updatedAt).toLocaleString('vi-VN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

      </div>
    </div>
  );
}
