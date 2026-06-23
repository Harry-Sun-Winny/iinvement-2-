"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, Transaction, CreateTransactionDto, isUnauthorizedError } from "../../lib/api";
import PortfolioChart from "./chart";

interface SearchResult { symbol: string; name: string; type: string; }

const SECTOR_MAP: Record<string, string> = {};
const PRICE_SYMBOL_ALIASES: Record<string, string> = {
  INTEL: "INTC",
  TSMC: "TSM",
};

function getPriceSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  return PRICE_SYMBOL_ALIASES[normalized] ?? normalized;
}

interface RealizedPnlResult {
  avgCost: number;
  pnl: number;
  pnlPct: number;
}

function normalizeType(value: string) {
  return value?.toUpperCase().trim();
}

function computeAllRealizedPnl(transactions: Transaction[]) {
  const ordered = [...transactions].sort((a, b) => {
    const dateA = new Date(a.transactionDate).getTime();
    const dateB = new Date(b.transactionDate).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
  });
  const positions = new Map<string, { qty: number; cost: number }>();
  const result = new Map<string, RealizedPnlResult>();

  for (const transaction of ordered) {
    const symbol = transaction.assetSymbol.toUpperCase();
    const position = positions.get(symbol) ?? { qty: 0, cost: 0 };
    const side = normalizeType(transaction.type);

    if (side === "BUY") {
      position.qty += transaction.quantity;
      position.cost += transaction.quantity * transaction.price;
    } else if (side === "SELL") {
      if (position.qty > 0 && position.cost > 0) {
        const avgCost = position.cost / position.qty;
        const pnl = (transaction.price - avgCost) * transaction.quantity;
        const pnlPct = avgCost > 0 ? ((transaction.price - avgCost) / avgCost) * 100 : 0;
        result.set(transaction.id, { avgCost, pnl, pnlPct });
      }

      if (position.qty > 0) {
        const avgCost = position.cost / position.qty;
        const soldQty = Math.min(transaction.quantity, position.qty);
        position.qty -= soldQty;
        position.cost = Math.max(0, position.cost - soldQty * avgCost);
      }
    }

    positions.set(symbol, position);
  }

  return result;
}

export default function PortfolioPage() {
  const routeParams = useParams<{ id?: string }>() ?? {};
  const id = routeParams.id ?? "";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [symbol, setSymbol] = useState("");
  const [assetName, setAssetName] = useState("");
  const [type, setType] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [swapTargetSymbol, setSwapTargetSymbol] = useState("");
  const [swapTargetQuantity, setSwapTargetQuantity] = useState("");
  const [swapTargetPrice, setSwapTargetPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [sectors, setSectors] = useState<Record<string, string>>({});

  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) { window.location.href = "/login"; return; }
    loadTx();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleApiError(error: unknown) {
    if (isUnauthorizedError(error) || (error as any)?.message?.includes("Không có quyền truy cập")) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return true;
    }
    return false;
  }

  async function loadTx() {
    try {
      setTransactions(await getTransactions(id));
    } catch (e: any) {
      if (!handleApiError(e)) setError(e.message || "Lỗi khi tải giao dịch");
    }
  }

  async function openEdit(t: Transaction) {
    setEditingTx(t);
    setSymbol(t.assetSymbol);
    setAssetName(t.assetName);
    setType(t.type?.toUpperCase().trim() ?? "BUY");
    setQuantity(String(t.quantity));
    setPrice(String(t.price));
    setCurrency(t.currency);
    setDate(t.transactionDate.slice(0, 10));
    setNotes(t.notes || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await fetchPriceForDate(t.assetSymbol, t.transactionDate.slice(0, 10));
  }

  async function fetchPriceForDate(sym: string, dateStr: string, fillPrice = false) {
    try {
      const res = await fetch(`/api/stock-price?symbol=${encodeURIComponent(getPriceSymbol(sym))}&date=${dateStr}&targetCurrency=${currency}`);
      const data = await res.json();
      if (data.price) {
        setCurrentPrice(data.price);
        if (fillPrice) setPrice(data.price.toFixed(2));
      }
    } catch {}
  }

  function resetForm() {
    setEditingTx(null);
    setShowForm(false);
    setSymbol(""); setAssetName(""); setQuantity(""); setPrice(""); setNotes("");
    setType("BUY"); setCurrency("USD");
    setDate(new Date().toISOString().slice(0, 10));
    setError("");
  }

  function handleSymbolChange(val: string) {
    setSymbol(val.toUpperCase());
    setShowSuggestions(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length < 1) { setSuggestions([]); return; }
    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stock-search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch { setSuggestions([]); }
      setSearchLoading(false);
    }, 300);
  }

  function selectSuggestion(s: SearchResult) {
    setSymbol(s.symbol);
    setAssetName(s.name);
    setSuggestions([]);
    setShowSuggestions(false);
    fetchPriceForDate(s.symbol, date, true);
  }

  async function handleDateChange(newDate: string) {
    setDate(newDate);
    if (symbol) {
      await fetchPriceForDate(symbol, newDate, !editingTx);
    }
  }

  function getAvailableToSell(assetSymbol: string) {
    if (!assetSymbol.trim()) return 0;
    return transactions.reduce((qty, t) => {
      if (editingTx && t.id === editingTx.id) return qty;
      if (t.assetSymbol.toUpperCase() !== assetSymbol.toUpperCase()) return qty;
      const side = normalizeType(t.type);
      if (side === "BUY") return qty + t.quantity;
      if (side === "SELL") return qty - t.quantity;
      if (side === "STAKE") return qty - t.quantity; // staked amount locked from selling
      return qty;
    }, 0);
  }

  function handleQuantityChange(value: string) {
    const nextQty = Number(value);
    if (normalizeType(type) === "SELL" && symbol && Number.isFinite(nextQty)) {
      const available = getAvailableToSell(symbol);
      if (nextQty > available) {
        setQuantity(String(Math.max(available, 0)));
        setError(`Chỉ có thể bán tối đa ${available.toLocaleString(undefined, { maximumFractionDigits: 6 })} cổ phiếu ${symbol}.`);
        return;
      }
    }
    setError("");
    setQuantity(value);
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    if (!date) {
      setError("Vui lòng chọn ngày giao dịch");
      return;
    }
    if (!symbol || !quantity || !price) { setError("Vui lòng điền đầy đủ thông tin"); return; }
    
    const normalizedType = type.toUpperCase();
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) { setError("Số lượng phải lớn hơn 0"); return; }
    
    // Validate SELL transaction
    if (normalizedType === "SELL") {
      const adjustedHoldings = getAvailableToSell(symbol);
      
      if (qty > adjustedHoldings) {
        setError(`Tổng cổ phiếu bán (${qty}) vượt quá số lượng còn lại (${adjustedHoldings})`);
        return;
      }
    }
    
    // For SWAP, create two transactions: SELL source and BUY target, to keep ledger consistent.
    if (normalizedType === "SWAP") {
      if (!swapTargetSymbol || !swapTargetQuantity || !swapTargetPrice) {
        setError("Vui lòng điền đầy đủ thông tin SWAP (mã đích, số lượng, giá)");
        return;
      }
      const sellDto: CreateTransactionDto = {
        assetSymbol: symbol,
        assetName: assetName || symbol,
        type: "SELL",
        quantity: qty,
        price: Number(price),
        currency,
        transactionDate: date,
        notes: `SWAP → ${swapTargetSymbol}` + (notes ? ` | ${notes}` : ""),
      };
      const buyDto: CreateTransactionDto = {
        assetSymbol: swapTargetSymbol,
        assetName: swapTargetSymbol,
        type: "BUY",
        quantity: Number(swapTargetQuantity),
        price: Number(swapTargetPrice),
        currency: currency, // assume same currency for simplicity
        transactionDate: date,
        notes: `SWAP from ${symbol}`,
      };
      try {
        const sellTx = await createTransaction(id, sellDto);
        const buyTx = await createTransaction(id, buyDto);
        setTransactions(prev => [buyTx, sellTx, ...prev]);
        resetForm();
      } catch (e: any) {
        if (!handleApiError(e)) setError(e.message || "Lỗi khi lưu giao dịch swap");
      }
      return;
    }

    const dto: CreateTransactionDto = {
      assetSymbol: symbol, assetName: assetName || symbol,
      type: normalizedType, quantity: qty, price: Number(price),
      currency, transactionDate: date, notes,
    };
    const token = localStorage.getItem("token");
    setError("");
    setIsSubmitting(true);
    try {
      if (editingTx) {
        // UPDATE
        const updated = await updateTransaction(id, editingTx.id, dto);
        setTransactions(prev => prev.map(t => t.id === editingTx.id ? updated : t));
      } else {
        // CREATE
        const t = await createTransaction(id, dto);
        setTransactions(prev => [t, ...prev]);
      }
      resetForm();
    } catch (e: any) {
      if (!handleApiError(e)) setError(e.message || "Lỗi khi lưu giao dịch");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(txId: string) {
    try {
      await deleteTransaction(id, txId);
      setTransactions(prev => prev.filter(t => t.id !== txId));
      setDeleteConfirm(null);
    } catch (e: any) {
      if (!handleApiError(e)) setError(e.message || "Lỗi khi xóa giao dịch");
    }
  }

  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  const formatCurrencyValue = (value: number, code: string) => {
    if (!Number.isFinite(value)) return String(value);
    try {
      const locale = code === "VND" ? "vi-VN" : "en-US";
      return new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumFractionDigits: 2 }).format(value);
    } catch {
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${code}`;
    }
  };

  const realizedPnlByTransaction = useMemo(
    () => computeAllRealizedPnl(transactions),
    [transactions],
  );

  const portfolioSummary = useMemo(() => {
    const totalsByCurrency: Record<string, { buy: number; sell: number }> = {};
    const realizedByCurrency: Record<string, number> = {};
    const aggregatesBySymbol = new Map<string, { holdings: number; buyCost: number }>();
    const symbols = new Set<string>();
    const unrealizedPnlByTransaction = new Map<string, RealizedPnlResult>();
    let totalRealizedSellPnl = 0;

    for (const transaction of transactions) {
      const currencyCode = transaction.currency || "USD";
      const totals = totalsByCurrency[currencyCode] ?? { buy: 0, sell: 0 };
      const side = normalizeType(transaction.type);
      const transactionValue = transaction.quantity * transaction.price;
      const normalizedSymbol = transaction.assetSymbol.toUpperCase();
      const aggregate = aggregatesBySymbol.get(normalizedSymbol) ?? { holdings: 0, buyCost: 0 };
      symbols.add(transaction.assetSymbol);

      if (side === "BUY") {
        totals.buy += transactionValue;
        aggregate.holdings += transaction.quantity;
        aggregate.buyCost += transactionValue;

        const currentPrice = currentPrices[transaction.assetSymbol];
        if (currentPrice) {
          const pnl = transaction.quantity * currentPrice - transactionValue;
          unrealizedPnlByTransaction.set(transaction.id, {
            avgCost: transaction.price,
            pnl,
            pnlPct: (pnl / transactionValue) * 100,
          });
        }
      } else if (side === "SELL") {
        totals.sell += transactionValue;
        aggregate.holdings -= transaction.quantity;
        const realized = realizedPnlByTransaction.get(transaction.id);
        if (realized) {
          realizedByCurrency[currencyCode] = (realizedByCurrency[currencyCode] ?? 0) + realized.pnl;
          totalRealizedSellPnl += realized.pnl;
        }
      }

      totalsByCurrency[currencyCode] = totals;
      aggregatesBySymbol.set(normalizedSymbol, aggregate);
    }

    let totalCostBasis = 0;
    let totalMarketValue = 0;
    for (const symbol of symbols) {
      const aggregate = aggregatesBySymbol.get(symbol.toUpperCase());
      if (!aggregate) continue;
      totalCostBasis += aggregate.buyCost;
      if (aggregate.holdings > 0 && currentPrices[symbol]) {
        totalMarketValue += aggregate.holdings * currentPrices[symbol];
      }
    }

    const pnl = totalMarketValue - totalCostBasis;
    return {
      transactionCount: transactions.length,
      totalsByCurrency,
      realizedByCurrency,
      totalRealizedSellPnl,
      totalCostBasis,
      totalMarketValue,
      pnl,
      pnlPct: totalCostBasis > 0 ? (pnl / totalCostBasis) * 100 : 0,
      unrealizedPnlByTransaction,
    };
  }, [transactions, currentPrices, realizedPnlByTransaction]);

  useEffect(() => {
    if (transactions.length === 0) return;
    const controller = new AbortController();
    const symbols = [...new Set(transactions.map(t => t.assetSymbol))];
    symbols.forEach(async sym => {
      try {
        const res = await fetch(`/api/stock-price?symbol=${encodeURIComponent(getPriceSymbol(sym))}`, {
          signal: controller.signal,
        });
        const d = await res.json();
        if (!controller.signal.aborted && d.price) {
          setCurrentPrices(prev => ({ ...prev, [sym]: d.price }));
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Keep the existing silent failure behavior for price lookups.
      }
    });
    return () => controller.abort();
  }, [transactions]);
  

  function getSector(symbol: string) {
  return sectors[symbol] ?? SECTOR_MAP[symbol.toUpperCase()] ?? SECTOR_MAP[symbol] ?? "Khác";
}

  function renderTransactionPnl(transaction: Transaction) {
    const side = normalizeType(transaction.type);
    if (side === "BUY") {
      const unrealized = portfolioSummary.unrealizedPnlByTransaction.get(transaction.id);
      if (!unrealized) return <span className="text-slate-600 text-xs">Đang tải...</span>;
      return (
        <span className={`font-semibold text-xs ${unrealized.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
          {unrealized.pnl >= 0 ? "▲" : "▼"} {unrealized.pnl >= 0 ? "+" : ""}{unrealized.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({unrealized.pnlPct.toFixed(1)}%)
        </span>
      );
    }

    if (side === "SELL") {
      const realized = realizedPnlByTransaction.get(transaction.id);
      if (!realized) return <span className="text-slate-600 text-xs">Thiếu giá vốn</span>;
      const isProfit = realized.pnl >= 0;
      return (
        <div className="text-right">
          <span className={`font-semibold text-xs ${isProfit ? "text-green-400" : "text-red-400"}`}>
            {isProfit ? "▲ +" : "▼ "}{formatCurrencyValue(realized.pnl, transaction.currency)} ({realized.pnlPct.toFixed(1)}%)
          </span>
          <p className="mt-1 text-[11px] text-slate-500">
            Giá vốn {formatCurrencyValue(realized.avgCost, transaction.currency)}
          </p>
        </div>
      );
    }

    // SWAP/STAKE và các loại khác chưa hỗ trợ tính P&L
    return (
      <span className="text-slate-500 text-[11px] leading-tight block text-right">
        {"Chưa hỗ trợ tính P&L cho loại này"}
      </span>
    );
  }

  return (
    <div className="app-shell flex">
      <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col p-4 gap-2 fixed h-full">
        <div className="mb-6 px-2">
          <h1 className="text-lg font-bold text-white">💹 Investment</h1>
          <p className="text-xs text-slate-500">Platform</p>
        </div>
        <button onClick={() => window.location.href = "/"} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all">📊 Dashboard</button>
        <button onClick={() => window.location.href = "/analysis"} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all">🤖 AI Analysis</button>
        <div className="mt-auto">
          <button onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }} className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-left">🚪 Đăng xuất</button>
        </div>
      </aside>

      <main className="ml-56 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => window.location.href = "/"} className="text-slate-500 hover:text-white transition-colors">← Quay lại</button>
            <div>
              <p className="text-slate-500 text-sm">Portfolio</p>
              <h2 className="text-2xl font-bold text-white">Giao dịch</h2>
            </div>
          </div>

          <div className="grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">Tổng giao dịch</p>
              <p className="text-2xl font-bold text-blue-400">{portfolioSummary.transactionCount}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">Chi phí mua</p>
              <div className="text-2xl font-bold text-green-400 space-y-1">
                {Object.entries(portfolioSummary.totalsByCurrency).length === 0 && <div>{formatCurrencyValue(0, "USD")}</div>}
                {Object.entries(portfolioSummary.totalsByCurrency).map(([cur, value]) => (
                  <div key={cur}>{formatCurrencyValue(value.buy, cur)}</div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Tiền bôi ra</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">Tổng bán</p>
              <div className="text-xl font-bold text-red-400 break-words leading-tight space-y-1">
                {Object.entries(portfolioSummary.totalsByCurrency).length === 0 && <div>{formatCurrencyValue(0, "USD")}</div>}
                {Object.entries(portfolioSummary.totalsByCurrency).map(([cur, value]) => (
                  <div key={cur}>{formatCurrencyValue(value.sell, cur)}</div>
                ))}
              </div>
              <div className="text-xs mt-2 font-semibold">
                {Object.entries(portfolioSummary.realizedByCurrency).map(([cur, value]) => {
                  const isProfit = value >= 0;
                  return (
                    <p key={cur} className={`${isProfit ? "text-green-400" : "text-red-400"}`}>
                      Lãi đã chốt ({cur}): {isProfit ? "+" : ""}{formatCurrencyValue(value, cur)}
                    </p>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">Giá trị hiện tại</p>
              <p className="text-2xl font-bold text-cyan-400">{portfolioSummary.totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-slate-500 mt-1">Cổ phiếu còn nắm</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">Lợi nhuận/Lỗ</p>
              <p className={`text-2xl font-bold ${portfolioSummary.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {portfolioSummary.pnl >= 0 ? "▲ +" : "▼ "}{portfolioSummary.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className={`text-xs mt-1 ${portfolioSummary.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>({portfolioSummary.pnlPct.toFixed(1)}%)</p>
            </div>
          </div>

          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
          <PortfolioChart transactions={transactions} currentPrices={currentPrices} />

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Lịch sử giao dịch</h3>
            <button onClick={() => showForm && !editingTx ? resetForm() : setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
              {showForm ? "✕ Đóng" : "+ Thêm GD"}
            </button>
          </div>

          {showForm && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
              <h4 className="font-semibold mb-4">{editingTx ? "✏️ Sửa giao dịch" : "Thêm giao dịch mới"}</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="relative" ref={suggestRef}>
                  <label className="text-xs text-slate-500 mb-1 block">Mã cổ phiếu *</label>
                  <input value={symbol} onChange={e => handleSymbolChange(e.target.value)}
                    onFocus={() => symbol && setShowSuggestions(true)}
                    placeholder="VD: AAPL, GOOGL, VNM..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                  {showSuggestions && (suggestions.length > 0 || searchLoading) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                      {searchLoading && <div className="px-3 py-2 text-xs text-slate-500">Đang tìm...</div>}
                      {suggestions.map(s => (
                        <button key={s.symbol} onMouseDown={() => selectSuggestion(s)}
                          className="w-full px-3 py-2.5 text-left hover:bg-slate-700 transition-colors flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-white text-sm">{s.symbol}</span>
                            <span className="text-slate-400 text-xs ml-2">{s.name}</span>
                          </div>
                          <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">{s.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Tên công ty</label>
                  <input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="Tự điền hoặc chọn từ gợi ý"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Loại *</label>
                  <select value={type} onChange={e => setType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                    <option value="BUY">🟢 MUA</option>
                    <option value="SELL">🔴 BÁN</option>
                    <option value="SWAP">🔄 SWAP - Hoán đổi</option>
                    <option value="STAKE">💎 STAKE - Đặt cọc</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Tiền tệ</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                    <option value="USD">USD - Đô la Mỹ</option>
                    <option value="VND">VND - Việt Nam Đồng</option>
                    <option value="USDT">USDT - Tether</option>
                    <option value="BTC">BTC - Bitcoin</option>
                    <option value="ETH">ETH - Ethereum</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Số lượng *</label>
                  <input type="number" min="0" max={normalizeType(type) === "SELL" && symbol ? getAvailableToSell(symbol) : undefined} value={quantity} onChange={e => handleQuantityChange(e.target.value)} placeholder="10"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                  {normalizeType(type) === "SELL" && symbol && (
                    <p className="mt-1 text-xs text-slate-400">
                      Có thể bán tối đa: <span className="font-semibold text-yellow-400">{getAvailableToSell(symbol).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Giá * <span className="text-blue-400">(tự động điền khi chọn mã)</span></label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="150.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
                {normalizeType(type) === "SWAP" && (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Mã đích (to) *</label>
                      <input value={swapTargetSymbol} onChange={e => setSwapTargetSymbol(e.target.value.toUpperCase())} placeholder="VD: MSFT"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Số lượng đích *</label>
                      <input type="number" value={swapTargetQuantity} onChange={e => setSwapTargetQuantity(e.target.value)} placeholder="10"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Giá đích *</label>
                      <input type="number" value={swapTargetPrice} onChange={e => setSwapTargetPrice(e.target.value)} placeholder="150.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                    </div>
                  </div>
                )}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Ngày giao dịch</label>
                  <input type="date" required value={date} onChange={e => handleDateChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Ghi chú</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tuỳ chọn..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              {editingTx && currentPrice && (
                 <div className="mb-3 p-3 bg-slate-800 rounded-lg text-sm flex justify-between items-center">
                     <span className="text-slate-400">Giá vào ngày {date}: <span className="text-white font-semibold">{formatCurrencyValue(currentPrice, currency)}</span></span>
                     <span className={Number(price) > currentPrice ? "text-red-400" : Number(price) < currentPrice ? "text-green-400" : "text-slate-400"}>
                     {Number(price) > currentPrice
                     ? `↑ Cao hơn ${formatCurrencyValue(Number(price) - currentPrice, currency)} (+${(((Number(price) - currentPrice) / currentPrice) * 100).toFixed(1)}%)`
                     : Number(price) < currentPrice
                     ? `↓ Thấp hơn ${formatCurrencyValue(currentPrice - Number(price), currency)} (-${(((currentPrice - Number(price)) / currentPrice) * 100).toFixed(1)}%)`
                      : "Bằng giá hiện tại"}
                     </span>
                </div>
               )}
              {quantity && price && (
                <div className="mb-4 p-3 bg-slate-800 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tổng tiền: </span>
                    <span className={`font-semibold ${type === "BUY" ? "text-red-400" : "text-green-400"}`}>
                      {type === "BUY" ? "-" : "+"}{formatCurrencyValue(Number(quantity) * Number(price), currency)}
                    </span>
                  </div>
                  {type === "SELL" && (
                    <div className="flex justify-between mt-2 pt-2 border-t border-slate-700">
                      <span className="text-slate-400">Số lượng còn lại: </span>
                      <span className="text-yellow-400 font-semibold">{Math.max(0, getAvailableToSell(symbol) - Number(quantity)).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold rounded-lg transition-colors">
                  {isSubmitting ? "Đang lưu..." : editingTx ? "✓ Lưu thay đổi" : "✓ Xác nhận giao dịch"}
                </button>
                {editingTx && (
                  <button onClick={resetForm} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors">Hủy</button>
                )}
              </div>
            </div>
          )}

          {transactions.length === 0 && !showForm && (
            <div className="text-center py-12 text-slate-500">
              <p className="text-4xl mb-3">📭</p>
              <p>Chưa có giao dịch nào. Nhấn "+ Thêm GD" để bắt đầu!</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs">Loại</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs">Mã</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs">Công ty</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs">Ngày</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs">Số lượng</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs">Giá</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs">Tổng tiền</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs">P&L</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    {deleteConfirm === t.id ? (
                      <td colSpan={9} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-red-400">Xóa giao dịch này?</p>
                          <div className="flex gap-2">
                            <button onClick={() => handleDelete(t.id)} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded transition-colors">Xóa</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded transition-colors">Hủy</button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${normalizeType(t.type) === "BUY" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                            {normalizeType(t.type) === "BUY" ? "🟢 MUA" : "🔴 BÁN"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">{t.assetSymbol}</td>
                        <td className="px-4 py-3 text-slate-300 text-xs">{t.assetName}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{t.transactionDate?.slice(0,10)}</td>
                        <td className="px-4 py-3 text-right text-white">{t.quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right text-white">{formatCurrencyValue(t.price, t.currency)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${normalizeType(t.type) === "BUY" ? "text-red-400" : "text-green-400"}`}>
                          {normalizeType(t.type) === "BUY" ? "-" : "+"}{formatCurrencyValue(t.quantity * t.price, t.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {renderTransactionPnl(t)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => openEdit(t)} className="p-1 rounded text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">✏️</button>
                            <button onClick={() => setDeleteConfirm(t.id)} className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">🗑️</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
