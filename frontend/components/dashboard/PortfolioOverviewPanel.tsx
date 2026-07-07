"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AutoSizedChart from "@/components/charts/AutoSizedChart";
import { CheckCircle, GitMerge, RefreshCw, TrendingUp, Info, AlertTriangle, HelpCircle, Download, FileSpreadsheet, FileText, Settings } from "lucide-react";
import ChartTooltip from "@/components/charts/ChartTooltip";
import { DrillDownDrawer } from "./DrillDownDrawer";
import { AssetRiskBreakdown, HistoryCache, BenchmarkCache, HistoricalPrice } from "./AssetRiskBreakdown";
import { exportToCSV, exportToExcel } from "../../utils/reportExporter";
import { useLedgerStore } from "../../app/ledger/store/ledgerStore";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RISK_FREE_RATE = 0.0; // 0% default

export const BENCHMARKS = [
  { id: "vnindex", label: "VN-Index", symbol: "^VNINDEX" },
  { id: "sp500", label: "S&P 500", symbol: "^GSPC" }
];

interface RiskMetrics {
  totalReturn?: number;
  annualizedReturn?: number;
  volatility?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  valueAtRisk?: number;
}

interface Snapshot {
  snapshotDate: string;
  totalValue?: number;
  totalCost?: number;
  portfolioValue?: number;
  investedAmount?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
}

interface DeepAnalysisResponse {
  riskMetrics?: RiskMetrics;
  equityCurve?: Array<{
    date: string;
    portfolioValue?: number;
    investedAmount?: number;
  }>;
}

function getAuthHeaders() {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function HelpIcon({ title }: { title: string }) {
  return (
    <span className="group relative inline-block cursor-help ml-1 text-slate-500 hover:text-slate-300">
      <HelpCircle className="h-3 w-3" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded bg-slate-950 p-2.5 text-[10px] font-medium leading-normal text-slate-200 opacity-0 shadow-lg border border-white/10 transition-opacity group-hover:opacity-100 whitespace-normal">
        {title}
      </span>
    </span>
  );
}

export function PortfolioOverviewPanel({ portfolioId }: { portfolioId: string }) {
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillSuccess, setBackfillSuccess] = useState(false);
  const [message, setMessage] = useState("");

  // States for filters & custom behavior
  const [timeRange, setTimeRange] = useState<string>("All");
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>("None");
  const [benchmarkPrices, setBenchmarkPrices] = useState<HistoricalPrice[]>([]);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Custom thresholds state
  const [volatilityThreshold, setVolatilityThreshold] = useState<number>(30);
  const [drawdownThreshold, setDrawdownThreshold] = useState<number>(20);
  const [varThreshold, setVarThreshold] = useState<number>(5);
  const [sharpeThreshold, setSharpeThreshold] = useState<number>(0.5);
  const [sortinoThreshold, setSortinoThreshold] = useState<number>(0.8);

  // Raw data from server
  const [rawMetrics, setRawMetrics] = useState<RiskMetrics | null>(null);
  const [rawSnapshots, setRawSnapshots] = useState<Snapshot[]>([]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{
    date: string;
    value: number;
    cost: number;
    dailyReturn: number;
  } | null>(null);

  // References for caching & cancellation
  const historyCache = useRef<HistoryCache>({});
  const benchmarkCache = useRef<BenchmarkCache>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const addNotification = useLedgerStore((state) => state.addNotification);

  // Fetch benchmark data independently
  useEffect(() => {
    if (selectedBenchmark !== "None") {
      void fetchBenchmarkHistory();
    } else {
      setBenchmarkPrices([]);
    }
  }, [selectedBenchmark, timeRange]);

  async function fetchBenchmarkHistory() {
    const config = BENCHMARKS.find(b => b.label === selectedBenchmark);
    if (!config) return;

    // Abort previous fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const symbol = config.symbol;
    const cacheKey = `${symbol}-${timeRange}`;
    const cached = benchmarkCache.current[cacheKey];
    
    // Cache Validation with TTL
    if (cached && (Date.now() - cached.fetchedAt < CACHE_TTL_MS)) {
      setBenchmarkPrices(cached.data);
      return;
    }

    try {
      const res = await fetch(`/api/stock-history?symbol=${encodeURIComponent(symbol)}&range=${timeRange}`, {
        signal: controller.signal
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload && Array.isArray(payload.points)) {
          benchmarkCache.current[cacheKey] = {
            range: timeRange,
            data: payload.points,
            fetchedAt: Date.now()
          };
          setBenchmarkPrices(payload.points);
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Failed to fetch benchmark history", err);
    }
  }

  // Load EOD snapshots & metrics
  useEffect(() => {
    if (portfolioId) {
      void loadData();
    }
  }, [portfolioId]);

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/backend/api/v1/portfolios/${portfolioId}/deep-analysis`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      if (response.ok) {
        const payload: DeepAnalysisResponse = await response.json();
        setRawMetrics(payload.riskMetrics ?? null);
        setRawSnapshots((payload.equityCurve ?? []).map((point) => ({
          snapshotDate: point.date,
          portfolioValue: point.portfolioValue,
          totalValue: point.portfolioValue,
          investedAmount: point.investedAmount,
          totalCost: point.investedAmount,
        })));

        // Auto Sync logic
        if (autoSyncEnabled) {
          const lastSyncStr = localStorage.getItem(`lastSyncTime_${portfolioId}`);
          const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
          if (Date.now() - lastSync > 24 * 60 * 60 * 1000) {
            void handleBackfill(true); // silent background sync
          }
        }
      } else {
        setMessage("Không tải được dữ liệu phân tích từ backend.");
      }
    } catch (error) {
      console.error("Failed to load portfolio analytics data", error);
      setMessage("Không kết nối được dữ liệu snapshot.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBackfill(silent = false) {
    if (!silent) setBackfilling(true);
    setBackfillSuccess(false);
    try {
      const res = await fetch(`/api/backend/api/v1/portfolios/${portfolioId}/backfill`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        localStorage.setItem(`lastSyncTime_${portfolioId}`, Date.now().toString());
        setBackfillSuccess(true);
        setTimeout(() => {
          setBackfillSuccess(false);
          void loadData();
        }, 1500);
      } else if (res.status === 409) {
        if (!silent) setMessage("Đồng bộ đang chạy ở nền. Vui lòng đợi một chút.");
        setTimeout(() => {
          void loadData();
        }, 2000);
      } else {
        if (!silent) setMessage(`Đồng bộ không thành công (${res.status}).`);
      }
    } catch (error) {
      console.error("Backfill failed", error);
      if (!silent) setMessage("Không gọi được lệnh đồng bộ.");
    } finally {
      if (!silent) setBackfilling(false);
    }
  }

  // Filter snapshots based on selected timeRange
  const filteredSnapshots = useMemo(() => {
    if (timeRange === "All") return rawSnapshots;
    
    const now = new Date();
    let startDate = new Date();

    if (timeRange === "1W") startDate.setDate(now.getDate() - 7);
    else if (timeRange === "1M") startDate.setMonth(now.getMonth() - 1);
    else if (timeRange === "3M") startDate.setMonth(now.getMonth() - 3);
    else if (timeRange === "6M") startDate.setMonth(now.getMonth() - 6);
    else if (timeRange === "1Y") startDate.setFullYear(now.getFullYear() - 1);
    else if (timeRange === "3Y") startDate.setFullYear(now.getFullYear() - 3);
    else if (timeRange === "YTD") startDate = new Date(now.getFullYear(), 0, 1);

    return rawSnapshots.filter(s => new Date(s.snapshotDate) >= startDate);
  }, [rawSnapshots, timeRange]);

  // Client-side Risk Metrics Calculation
  const derivedMetrics = useMemo(() => {
    const n = filteredSnapshots.length;
    if (n < 20) {
      return {
        insufficient: true,
        totalReturn: 0,
        annualizedReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        valueAtRisk: 0,
        dailyReturns: [] as number[],
        volatilityAnnualized: 0
      };
    }

    const dailyReturns: number[] = [];
    let maxDrawdownVal = 0;
    let peak = 0;

    for (let i = 0; i < n; i++) {
      const val = filteredSnapshots[i].portfolioValue ?? 0;
      
      // Max Drawdown track
      if (val > peak) {
        peak = val;
      }
      if (peak > 0) {
        const dd = (peak - val) / peak;
        if (dd > maxDrawdownVal) {
          maxDrawdownVal = dd;
        }
      }

      // Daily return
      if (i > 0) {
        const prevVal = filteredSnapshots[i - 1].portfolioValue ?? 0;
        if (prevVal > 0) {
          dailyReturns.push((val - prevVal) / prevVal);
        }
      }
    }

    const meanReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (dailyReturns.length - 1);
    const volatilityDaily = Math.sqrt(variance);
    const volatilityAnnualized = volatilityDaily * Math.sqrt(252);
    const annualizedReturn = meanReturn * 252;

    const negativeReturns = dailyReturns.filter(r => r < 0);
    const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / (dailyReturns.length - 1);
    const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252);

    const sharpe = volatilityAnnualized > 0 ? (annualizedReturn - RISK_FREE_RATE) : 0;
    const sharpeRatio = volatilityAnnualized > 0 ? sharpe / volatilityAnnualized : 0;
    
    const sortino = downsideDeviation > 0 ? (annualizedReturn - RISK_FREE_RATE) : 0;
    const sortinoRatio = downsideDeviation > 0 ? sortino / downsideDeviation : 0;

    // Value at Risk (95%)
    const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
    const varIdx = Math.floor(sortedReturns.length * 0.05);
    const valueAtRisk = sortedReturns.length > 0 ? Math.abs(sortedReturns[varIdx]) : 0;

    const firstVal = filteredSnapshots[0].portfolioValue ?? 1;
    const lastVal = filteredSnapshots[n - 1].portfolioValue ?? 0;
    const totalReturn = (lastVal - firstVal) / firstVal;

    return {
      insufficient: false,
      totalReturn,
      annualizedReturn,
      volatility: volatilityAnnualized,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown: maxDrawdownVal,
      valueAtRisk,
      dailyReturns,
      volatilityAnnualized
    };
  }, [filteredSnapshots]);

  // Alert Threshold Warning Banner & Notifications Center persistence
  useEffect(() => {
    if (derivedMetrics.insufficient) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const checkAndNotify = (metricId: string, value: number, limit: number, isLowerBound: boolean, severity: "Warning" | "Critical", msg: string) => {
      const isBreached = isLowerBound ? value < limit : value > limit;
      if (isBreached) {
        const uniqueKey = `${portfolioId}-${metricId}-${todayStr}`;
        const hasNotified = localStorage.getItem(uniqueKey);
        if (!hasNotified) {
          addNotification({
            title: `Cảnh báo ${severity}: Vượt ngưỡng ${metricId}`,
            message: msg,
            type: "ALERT"
          });
          localStorage.setItem(uniqueKey, "true");
        }
      }
    };

    checkAndNotify("volatility", derivedMetrics.volatility * 100, volatilityThreshold, false, "Warning", `Độ biến động danh mục (${(derivedMetrics.volatility * 100).toFixed(1)}%) vượt quá ngưỡng ${volatilityThreshold}%`);
    checkAndNotify("drawdown", derivedMetrics.maxDrawdown * 100, drawdownThreshold, false, derivedMetrics.maxDrawdown * 100 > 40 ? "Critical" : "Warning", `Sụt giảm tối đa (${(derivedMetrics.maxDrawdown * 100).toFixed(1)}%) vượt quá ngưỡng ${drawdownThreshold}%`);
    checkAndNotify("var", derivedMetrics.valueAtRisk * 100, varThreshold, false, "Warning", `VaR 95% (${(derivedMetrics.valueAtRisk * 100).toFixed(1)}%) vượt quá ngưỡng ${varThreshold}%`);
    checkAndNotify("sharpe", derivedMetrics.sharpeRatio, sharpeThreshold, true, "Warning", `Chỉ số Sharpe (${derivedMetrics.sharpeRatio.toFixed(2)}) thấp hơn ngưỡng ${sharpeThreshold}`);
    checkAndNotify("sortino", derivedMetrics.sortinoRatio, sortinoThreshold, true, "Warning", `Chỉ số Sortino (${derivedMetrics.sortinoRatio.toFixed(2)}) thấp hơn ngưỡng ${sortinoThreshold}`);

  }, [derivedMetrics, volatilityThreshold, drawdownThreshold, varThreshold, sharpeThreshold, sortinoThreshold]);

  // Normalize Benchmark prices with portfolio starting value
  const chartData = useMemo(() => {
    if (filteredSnapshots.length === 0) return [];

    const firstPortVal = filteredSnapshots[0].portfolioValue ?? 0;
    
    // Find matching date benchmark price
    const normalizedBenchmarkMap: Record<string, number> = {};
    if (benchmarkPrices.length > 0) {
      // Find starting benchmark price matching first snapshot date
      const startSnapDate = filteredSnapshots[0].snapshotDate;
      const startBenchPoint = benchmarkPrices.find(p => p.date >= startSnapDate) || benchmarkPrices[0];
      const startBenchPrice = startBenchPoint ? startBenchPoint.close : 0;

      if (startBenchPrice > 0) {
        benchmarkPrices.forEach(p => {
          normalizedBenchmarkMap[p.date] = p.close * (firstPortVal / startBenchPrice);
        });
      }
    }

    return filteredSnapshots.map((s, idx) => {
      const prevVal = idx > 0 ? (filteredSnapshots[idx - 1].portfolioValue ?? 0) : 0;
      const currVal = s.portfolioValue ?? 0;
      const dailyChange = prevVal > 0 ? (currVal - prevVal) / prevVal : 0;

      return {
        date: s.snapshotDate,
        value: currVal,
        cost: s.investedAmount ?? 0,
        benchmark: normalizedBenchmarkMap[s.snapshotDate] || null,
        dailyReturn: dailyChange
      };
    });
  }, [filteredSnapshots, benchmarkPrices]);

  // Export handlers
  const getExportData = () => {
    const summary = {
      portfolioName: `Portfolio ${portfolioId.slice(0, 8)}`,
      generatedTime: new Date().toLocaleString(),
      totalValue: `$${(filteredSnapshots[filteredSnapshots.length - 1]?.portfolioValue ?? 0).toLocaleString()}`,
      totalInvested: `$${(filteredSnapshots[filteredSnapshots.length - 1]?.investedAmount ?? 0).toLocaleString()}`,
      totalPnl: `$${((filteredSnapshots[filteredSnapshots.length - 1]?.portfolioValue ?? 0) - (filteredSnapshots[filteredSnapshots.length - 1]?.investedAmount ?? 0)).toLocaleString()}`,
      totalReturnPct: derivedMetrics.insufficient ? "--" : `${(derivedMetrics.totalReturn * 100).toFixed(1)}%`,
      sharpeRatio: derivedMetrics.insufficient ? "--" : derivedMetrics.sharpeRatio.toFixed(2),
      sortinoRatio: derivedMetrics.insufficient ? "--" : derivedMetrics.sortinoRatio.toFixed(2),
      valueAtRisk: derivedMetrics.insufficient ? "--" : `${(derivedMetrics.valueAtRisk * 100).toFixed(1)}%`,
      volatility: derivedMetrics.insufficient ? "--" : `${(derivedMetrics.volatility * 100).toFixed(1)}%`,
      maxDrawdown: derivedMetrics.insufficient ? "--" : `${(derivedMetrics.maxDrawdown * 100).toFixed(1)}%`,
    };

    const details = chartData.map(d => ({
      date: d.date,
      value: d.value,
      cost: d.cost,
      dailyReturn: (d.dailyReturn * 100)
    }));

    return { summary, details };
  };

  const handleCsvExport = () => {
    const { summary, details } = getExportData();
    exportToCSV(summary, details);
  };

  const handleExcelExport = () => {
    const { summary, details } = getExportData();
    exportToExcel(summary, details);
  };

  const metricCards = [
    {
      label: "Sharpe Ratio",
      val: derivedMetrics.insufficient ? "Insufficient Data" : derivedMetrics.sharpeRatio.toFixed(2),
      desc: "Lợi nhuận điều chỉnh rủi ro",
      tooltip: "Đo lường tỷ suất sinh lời trên mỗi đơn vị rủi ro. Công thức: (Lợi nhuận - Rf) / Volatility. Đánh giá: > 2 Rất tốt, 1-2 Tốt, < 1 Yếu.",
      color: !derivedMetrics.insufficient && derivedMetrics.sharpeRatio >= 1 ? "text-emerald-400" : "text-slate-300",
    },
    {
      label: "Sortino Ratio",
      val: derivedMetrics.insufficient ? "Insufficient Data" : derivedMetrics.sortinoRatio.toFixed(2),
      desc: "Lợi nhuận điều chỉnh rủi ro giảm giá",
      tooltip: "Đo lường lợi nhuận trên mỗi đơn vị rủi ro giảm giá. Công thức: (Lợi nhuận - Rf) / Downside Deviation. Đánh giá: > 2 Rất tốt, 1-2 Tốt, < 1 Yếu.",
      color: !derivedMetrics.insufficient && derivedMetrics.sortinoRatio >= 1 ? "text-emerald-400" : "text-slate-300",
    },
    {
      label: "Max Drawdown",
      val: derivedMetrics.insufficient ? "Insufficient Data" : `${(derivedMetrics.maxDrawdown * 100).toFixed(1)}%`,
      desc: "Mức sụt giảm sâu nhất",
      tooltip: "Mức sụt giảm lớn nhất từ đỉnh xuống đáy của tài sản. Công thức: (Đỉnh - Đáy) / Đỉnh. Đánh giá: < 10% Tốt, 10-20% Trung bình, > 20% Rủi ro.",
      color: "text-red-400",
    },
    {
      label: "Value at Risk (95%)",
      val: derivedMetrics.insufficient ? "Insufficient Data" : `${(derivedMetrics.valueAtRisk * 100).toFixed(1)}%`,
      desc: "Mức lỗ tối đa trong 1 ngày",
      tooltip: "Mức lỗ tối đa dự kiến xảy ra trong 1 ngày với độ tin cậy 95%. Công thức: Phân vị thứ 5 của Tỷ suất sinh lời ngày. Đánh giá: < 2% Tốt, 2-5% Trung bình, > 5% Rủi ro.",
      color: "text-yellow-400",
    },
    {
      label: "Total Return",
      val: derivedMetrics.insufficient ? "Insufficient Data" : `${(derivedMetrics.totalReturn * 100).toFixed(1)}%`,
      desc: "Lợi nhuận tổng từ đầu kỳ",
      tooltip: "Tổng lợi nhuận tích lũy của danh mục trong khung thời gian lựa chọn.",
      color: !derivedMetrics.insufficient && derivedMetrics.totalReturn >= 0 ? "text-emerald-400" : "text-red-400",
    },
    {
      label: "Volatility",
      val: derivedMetrics.insufficient ? "Insufficient Data" : `${(derivedMetrics.volatility * 100).toFixed(1)}%`,
      desc: "Độ biến động hàng năm",
      tooltip: "Mức độ dao động của lợi suất ngày quy đổi theo năm. Công thức: Lệch chuẩn (Lợi suất ngày) * căn(252). Đánh giá: < 15% Thấp, 15-30% Vừa, > 30% Cao.",
      color: "text-sky-400",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-12 font-medium text-slate-500">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Đang tải phân tích danh mục...
      </div>
    );
  }

  // Detect breaches for styling warning alerts
  const showWarningBanner = !derivedMetrics.insufficient && (
    (derivedMetrics.volatility * 100 > volatilityThreshold) ||
    (derivedMetrics.maxDrawdown * 100 > drawdownThreshold) ||
    (derivedMetrics.valueAtRisk * 100 > varThreshold) ||
    (derivedMetrics.sharpeRatio < sharpeThreshold) ||
    (derivedMetrics.sortinoRatio < sortinoThreshold)
  );

  return (
    <div className="space-y-6 print-area">
      {/* CSS print utility style */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          aside, header, nav, button, .no-print {
            display: none !important;
          }
          main, .print-area {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .antigravity-panel, .metric-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />

      {/* Header & sync controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 no-print">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
            <TrendingUp size={16} className="text-purple-400" /> PHÂN TÍCH HIỆU SUẤT & RỦI RO
          </h3>
          <p className="mt-0.5 text-[10px] text-slate-500 font-medium">Chỉ số định lượng và biên độ biến động danh mục EOD</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export Controls */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
            <button onClick={handleCsvExport} className="p-1 hover:text-indigo-400 text-slate-300 transition-colors" title="Xuất CSV (UTF-8 BOM)">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={handleExcelExport} className="p-1 hover:text-emerald-400 text-slate-300 transition-colors" title="Xuất Excel (SheetJS)">
              <FileSpreadsheet className="h-4 w-4" />
            </button>
            <button onClick={() => window.print()} className="p-1 hover:text-indigo-400 text-slate-300 transition-colors" title="In / Xuất PDF">
              <FileText className="h-4 w-4" />
            </button>
          </div>

          {/* Settings Trigger */}
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className={`p-2 rounded-xl border transition-all ${showSettings ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"}`}
            title="Cài đặt ngưỡng cảnh báo & Auto-Sync"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Sync Button */}
          <button
            onClick={() => handleBackfill()}
            disabled={backfilling}
            className="antigravity-btn flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all"
          >
            {backfillSuccess ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-400" /> Thành công
              </>
            ) : backfilling ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" /> Đang đồng bộ...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" /> Đồng bộ EOD
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warning banner */}
      {showWarningBanner && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-start gap-3 no-print">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider">Cảnh báo rủi ro danh mục</h5>
            <p className="text-[10px] text-red-300 mt-1 leading-normal">
              Danh mục đầu tư đang vượt quá một hoặc nhiều ngưỡng cảnh báo rủi ro an toàn của bạn. Hãy kiểm tra lại tỷ trọng tài sản ở bảng phân rã rủi ro bên dưới.
            </p>
          </div>
        </div>
      )}

      {/* Custom configuration card (Settings panel) */}
      {showSettings && (
        <div className="antigravity-panel bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-4 no-print">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Cấu Hình Ngưỡng & Đồng Bộ</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Auto Sync Toggle */}
            <div className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl">
              <div>
                <span className="font-bold text-white block">Tự động đồng bộ EOD</span>
                <span className="text-[9px] text-slate-500">Đồng bộ tự động sau mỗi 24 giờ khi mở trang</span>
              </div>
              <input 
                type="checkbox" 
                checked={autoSyncEnabled} 
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Volatility Threshold */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cảnh báo Volatility (&gt; %)</label>
              <input 
                type="number" 
                value={volatilityThreshold} 
                onChange={(e) => setVolatilityThreshold(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Max Drawdown Threshold */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cảnh báo Max Drawdown (&gt; %)</label>
              <input 
                type="number" 
                value={drawdownThreshold} 
                onChange={(e) => setDrawdownThreshold(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* VaR Threshold */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cảnh báo Daily VaR (&gt; %)</label>
              <input 
                type="number" 
                value={varThreshold} 
                onChange={(e) => setVarThreshold(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Sharpe Threshold */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cảnh báo Sharpe Ratio (&lt;)</label>
              <input 
                type="number" 
                step="0.1"
                value={sharpeThreshold} 
                onChange={(e) => setSharpeThreshold(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Sortino Threshold */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cảnh báo Sortino Ratio (&lt;)</label>
              <input 
                type="number" 
                step="0.1"
                value={sortinoThreshold} 
                onChange={(e) => setSortinoThreshold(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300 no-print">
          {message}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            className="antigravity-panel metric-card rounded-xl border border-white/5 bg-white/[0.01] p-3 transition-all hover:bg-white/[0.02]"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              {metric.label}
              <HelpIcon title={metric.tooltip} />
            </p>
            <p className={`mt-1 text-xl font-black ${metric.color}`}>{metric.val}</p>
            <p className="mt-1 text-[9px] leading-none text-slate-400">{metric.desc}</p>
          </div>
        ))}
      </div>

      {/* Capital Growth Curve & Benchmark Chart */}
      <Card className="antigravity-panel overflow-hidden border-white/5 bg-white/[0.01]">
        <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <GitMerge size={14} className="text-blue-400" /> Đường cong tăng trưởng vốn (EOD)
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-500 mt-1">
              So sánh giá trị danh mục (Value), giá vốn (Cost) và điểm tham chiếu (Benchmark)
            </CardDescription>
          </div>

          {/* Time range & benchmark selector toolbars */}
          <div className="flex flex-wrap items-center gap-2.5 no-print">
            {/* Benchmark Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Benchmark:</span>
              <select
                value={selectedBenchmark}
                onChange={(e) => setSelectedBenchmark(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg text-[10px] font-bold px-2 py-1 text-white focus:outline-none"
              >
                <option value="None">None</option>
                <option value="VN-Index">VN-Index</option>
                <option value="S&P 500">S&P 500</option>
              </select>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5">
              {["1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "All"].map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${timeRange === r ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[260px] pt-4 growth-chart-container">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs font-medium text-slate-500">
              Chưa có dữ liệu snapshot lịch sử. Nhấn "Đồng bộ EOD" để tạo dữ liệu.
            </div>
          ) : (
            <AutoSizedChart>
              <AreaChart 
                data={chartData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    const payload = data.activePayload[0].payload;
                    setSelectedPoint({
                      date: payload.date,
                      value: payload.value,
                      cost: payload.cost,
                      dailyReturn: payload.dailyReturn
                    });
                    setDrawerOpen(true);
                  }
                }}
              >
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                <Tooltip content={<ChartTooltip valueFormatter={(v) => `$${Number(v).toLocaleString()}`} />} />
                <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="value" name="Giá trị" stroke="#8884d8" fillOpacity={1} fill="url(#valGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="cost" name="Giá vốn" stroke="#82ca9d" fillOpacity={1} fill="url(#costGrad)" strokeWidth={1.5} strokeDasharray="4 4" />
                {selectedBenchmark !== "None" && (
                  <Area type="monotone" dataKey="benchmark" name={selectedBenchmark} stroke="#f59e0b" fillOpacity={1} fill="url(#benchGrad)" strokeWidth={1.5} strokeDasharray="3 3" />
                )}
              </AreaChart>
            </AutoSizedChart>
          )}
        </CardContent>
      </Card>

      {/* Asset Risk Breakdown Table */}
      <AssetRiskBreakdown
        portfolioId={portfolioId}
        timeRange={timeRange}
        historyCache={historyCache}
        portfolioReturns={derivedMetrics.dailyReturns}
        portfolioVolatility={derivedMetrics.volatility}
        benchmarkPrices={benchmarkPrices}
      />

      {/* Drill Down Drawer */}
      {selectedPoint && (
        <DrillDownDrawer
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedPoint(null);
          }}
          portfolioId={portfolioId}
          selectedDate={selectedPoint.date}
          portfolioValue={selectedPoint.value}
          totalCost={selectedPoint.cost}
          dailyReturn={selectedPoint.dailyReturn}
        />
      )}
    </div>
  );
}
