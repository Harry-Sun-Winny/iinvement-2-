"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, Transaction, CreateTransactionDto, isUnauthorizedError } from "../../lib/api";
import PortfolioChart from "../[id]/chart";
import Alert from "@/components/ui/Alert";
import { Badge } from "@/components/ui/badge";
import { PortfolioOverviewPanel } from "@/components/dashboard/PortfolioOverviewPanel";
import { useTranslation } from "@/components/providers/I18nProvider";
import { convertCurrency } from "../../lib/finance/currency";
import { DailySessionSummary } from "@/components/dashboard/DailySessionSummary";
import { summarizeDailySession } from "../../lib/finance/daily-session";

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

function formatNumber(value: number, digits = 2) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value: number, digits = 2) {
  return `${formatNumber(value, digits)}%`;
}

function toUsdAmount(amount: number, currency: string | null | undefined, fxRates: Record<string, number>) {
  const normalized = currency?.trim().toUpperCase() || "USD";
  if (normalized === "USD" || normalized === "USDT" || normalized === "USDC") return amount;
  return convertCurrency(amount, normalized, "USD", fxRates);
}

function computeAllRealizedPnlCustom(
  transactions: Transaction[],
  method: "WAC" | "FIFO" | "LIFO",
  fxRates: Record<string, number>,
) {
  const ordered = [...transactions].sort((a, b) => {
    const dateA = new Date(a.transactionDate).getTime();
    const dateB = new Date(b.transactionDate).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
  });

  const result = new Map<string, RealizedPnlResult>();

  if (method === "WAC") {
    const positions = new Map<string, { qty: number; cost: number }>();
    for (const transaction of ordered) {
      const symbol = transaction.assetSymbol.toUpperCase();
      const position = positions.get(symbol) ?? { qty: 0, cost: 0 };
      const side = normalizeType(transaction.type);
      const priceUsd = toUsdAmount(transaction.price, transaction.currency, fxRates);

      if (side === "BUY") {
        position.qty += transaction.quantity;
        position.cost += transaction.quantity * priceUsd;
      } else if (side === "SELL") {
        if (position.qty > 0 && position.cost > 0) {
          const avgCost = position.cost / position.qty;
          const soldQty = Math.min(transaction.quantity, position.qty);
          const pnl = (priceUsd - avgCost) * soldQty;
          const pnlPct = avgCost > 0 ? ((priceUsd - avgCost) / avgCost) * 100 : 0;
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
  } else if (method === "FIFO") {
    const buyLotsMap = new Map<string, Array<{ id: string; qty: number; price: number }>>();

    for (const transaction of ordered) {
      const symbol = transaction.assetSymbol.toUpperCase();
      const side = normalizeType(transaction.type);
      const priceUsd = toUsdAmount(transaction.price, transaction.currency, fxRates);

      if (side === "BUY") {
        const lots = buyLotsMap.get(symbol) ?? [];
        lots.push({
          id: transaction.id,
          qty: transaction.quantity,
          price: priceUsd,
        });
        buyLotsMap.set(symbol, lots);
      } else if (side === "SELL") {
        const lots = buyLotsMap.get(symbol) ?? [];
        let sellQtyRemaining = transaction.quantity;
        let totalCostBasis = 0;
        let matchedQtyTotal = 0;

        for (const lot of lots) {
          if (sellQtyRemaining <= 0) break;
          if (lot.qty > 0) {
            const matchedQty = Math.min(sellQtyRemaining, lot.qty);
            totalCostBasis += matchedQty * lot.price;
            lot.qty -= matchedQty;
            sellQtyRemaining -= matchedQty;
            matchedQtyTotal += matchedQty;
          }
        }

        if (matchedQtyTotal > 0) {
          const avgCost = totalCostBasis / matchedQtyTotal;
          const pnl = (priceUsd - avgCost) * matchedQtyTotal;
          const pnlPct = avgCost > 0 ? ((priceUsd - avgCost) / avgCost) * 100 : 0;
          result.set(transaction.id, { avgCost, pnl, pnlPct });
        }
      }
    }
  } else if (method === "LIFO") {
    const buyLotsMap = new Map<string, Array<{ id: string; qty: number; price: number }>>();

    for (const transaction of ordered) {
      const symbol = transaction.assetSymbol.toUpperCase();
      const side = normalizeType(transaction.type);
      const priceUsd = toUsdAmount(transaction.price, transaction.currency, fxRates);

      if (side === "BUY") {
        const lots = buyLotsMap.get(symbol) ?? [];
        lots.push({
          id: transaction.id,
          qty: transaction.quantity,
          price: priceUsd,
        });
        buyLotsMap.set(symbol, lots);
      } else if (side === "SELL") {
        const lots = buyLotsMap.get(symbol) ?? [];
        let sellQtyRemaining = transaction.quantity;
        let totalCostBasis = 0;
        let matchedQtyTotal = 0;

        for (let i = lots.length - 1; i >= 0; i--) {
          if (sellQtyRemaining <= 0) break;
          const lot = lots[i];
          if (lot.qty > 0) {
            const matchedQty = Math.min(sellQtyRemaining, lot.qty);
            totalCostBasis += matchedQty * lot.price;
            lot.qty -= matchedQty;
            sellQtyRemaining -= matchedQty;
            matchedQtyTotal += matchedQty;
          }
        }

        if (matchedQtyTotal > 0) {
          const avgCost = totalCostBasis / matchedQtyTotal;
          const pnl = (priceUsd - avgCost) * matchedQtyTotal;
          const pnlPct = avgCost > 0 ? ((priceUsd - avgCost) / avgCost) * 100 : 0;
          result.set(transaction.id, { avgCost, pnl, pnlPct });
        }
      }
    }
  }

  return result;
}

export default function PortfolioPage() {
  const { t, language } = useTranslation();
  const isVi = language === "vi";
  const routeParams = (useParams() as { id?: string }) ?? {};
  const id = routeParams.id ?? "";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({ USD: 1, USDT: 1, USDC: 1, VND: 25400 });
  const [pricesLoaded, setPricesLoaded] = useState(false);
  const [currencyRatesLoaded, setCurrencyRatesLoaded] = useState(false);

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
  const [fee, setFee] = useState("0");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [sectors, setSectors] = useState<Record<string, string>>({});

  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  // Sorting & Filtering State
  const [pnlMethod, setPnlMethod] = useState<"WAC" | "FIFO" | "LIFO">("WAC");
  const [filterAsset, setFilterAsset] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("date_desc");

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
    setFee(t.fee ? String(t.fee) : "0");
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
    setFee("0");
    setType("BUY"); setCurrency("USD");
    setDate(new Date().toISOString().slice(0, 10));
    setError("");
  }

  function handleSymbolChange(val: string) {
    setSymbol(val.toUpperCase());
    setShowSuggestions(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSuggestions([]);
    if (val.length < 1) { return; }
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

  function getAvailableToSell(assetSymbol: string, upToDate?: string) {
    if (!assetSymbol.trim()) return 0;
    return transactions.reduce((qty, t) => {
      if (editingTx && t.id === editingTx.id) return qty;
      if (t.assetSymbol.toUpperCase() !== assetSymbol.toUpperCase()) return qty;
      if (upToDate && t.transactionDate > upToDate) return qty;
      const side = normalizeType(t.type);
      if (side === "BUY") return qty + t.quantity;
      if (side === "SELL") return qty - t.quantity;
      if (side === "STAKE") return qty - t.quantity;
      return qty;
    }, 0);
  }

  function handleQuantityChange(value: string) {
    const nextQty = Number(value);
    if (normalizeType(type) === "SELL" && symbol && Number.isFinite(nextQty)) {
      const available = getAvailableToSell(symbol, date);
      if (nextQty > available) {
        setQuantity(String(Math.max(available, 0)));
        setError(`Chỉ có thể bán tối đa ${formatNumber(available)} cổ phiếu ${symbol}.`);
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

    if (normalizedType === "SELL") {
      const adjustedHoldings = getAvailableToSell(symbol, date);

      if (qty > adjustedHoldings) {
        setError(`Tổng cổ phiếu bán (${qty}) vượt quá số lượng còn lại (${adjustedHoldings})`);
        return;
      }
    }

    if (normalizedType === "SWAP") {
      if (!swapTargetSymbol || !swapTargetQuantity || !swapTargetPrice) {
        setError("Vui lòng điền đầy đủ thông tin SWAP (mã đích, số lượng, giá)");
        return;
      }
      const adjustedHoldings = getAvailableToSell(symbol, date);
      if (qty > adjustedHoldings) {
        setError(`Tổng cổ phiếu bán (${qty}) vượt quá số lượng còn lại (${adjustedHoldings})`);
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
        currency: currency,
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
      currency, transactionDate: date, notes, fee: Number(fee || 0),
    };
    setError("");
    setIsSubmitting(true);
    try {
      if (editingTx) {
        const updated = await updateTransaction(id, editingTx.id, dto);
        setTransactions(prev => prev.map(t => t.id === editingTx.id ? updated : t));
      } else {
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
  const [sessionQuotes, setSessionQuotes] = useState<Record<string, { price: number; previousClose: number | null; tradingDate: string | null }>>({});

  const formatCurrencyValue = (value: number, code: string) => {
    if (!Number.isFinite(value)) return String(value);
    try {
      const locale = code === "VND" ? "vi-VN" : "en-US";
      return new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumFractionDigits: 2 }).format(value);
    } catch {
      return `${formatNumber(value)} ${code}`;
    }
  };

  const realizedPnlByTransaction = useMemo(
    () => computeAllRealizedPnlCustom(transactions, pnlMethod, currencyRates),
    [transactions, pnlMethod, currencyRates],
  );

  const portfolioSummary = useMemo(() => {
    const totalsByCurrency: Record<string, { buy: number; sell: number }> = {};
    const realizedByCurrency: Record<string, number> = {};
    const aggregatesBySymbol = new Map<string, { holdings: number; buyCost: number }>();
    const symbols = new Set<string>();
    const unrealizedPnlByTransaction = new Map<string, RealizedPnlResult>();
    let totalRealizedSellPnl = 0;

    const buyLotsMap = new Map<string, Array<{ qty: number; price: number }>>();

    const ordered = [...transactions].sort((a, b) => {
      const dateA = new Date(a.transactionDate).getTime();
      const dateB = new Date(b.transactionDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
    });

    for (const transaction of ordered) {
      const currencyCode = transaction.currency || "USD";
      const totals = totalsByCurrency[currencyCode] ?? { buy: 0, sell: 0 };
      const side = normalizeType(transaction.type);
      const transactionPriceUsd = toUsdAmount(transaction.price, transaction.currency, currencyRates);
      const transactionValue = transaction.quantity * transactionPriceUsd;
      const normalizedSymbol = transaction.assetSymbol.toUpperCase();
      symbols.add(transaction.assetSymbol);

      if (side === "BUY") {
        totals.buy += transactionValue;
        
        const lots = buyLotsMap.get(normalizedSymbol) ?? [];
        lots.push({ qty: transaction.quantity, price: transactionPriceUsd });
        buyLotsMap.set(normalizedSymbol, lots);

        const currentPrice = currentPrices[normalizedSymbol];
        if (currentPrice) {
          const pnl = transaction.quantity * currentPrice - transactionValue;
          unrealizedPnlByTransaction.set(transaction.id, {
            avgCost: transactionPriceUsd,
            pnl,
            pnlPct: (pnl / transactionValue) * 100,
          });
        }
      } else if (side === "SELL") {
        totals.sell += transactionValue;
        
        const lots = buyLotsMap.get(normalizedSymbol) ?? [];
        let sellQtyRemaining = transaction.quantity;

        if (pnlMethod === "FIFO") {
          for (const lot of lots) {
            if (sellQtyRemaining <= 0) break;
            if (lot.qty > 0) {
              const matchedQty = Math.min(sellQtyRemaining, lot.qty);
              lot.qty -= matchedQty;
              sellQtyRemaining -= matchedQty;
            }
          }
        } else if (pnlMethod === "LIFO") {
          for (let i = lots.length - 1; i >= 0; i--) {
            if (sellQtyRemaining <= 0) break;
            const lot = lots[i];
            if (lot.qty > 0) {
              const matchedQty = Math.min(sellQtyRemaining, lot.qty);
              lot.qty -= matchedQty;
              sellQtyRemaining -= matchedQty;
            }
          }
        } else { // WAC
          const agg = aggregatesBySymbol.get(normalizedSymbol) ?? { holdings: 0, buyCost: 0 };
          const avgCost = agg.holdings > 0 ? agg.buyCost / agg.holdings : 0;
          const soldQty = Math.min(transaction.quantity, agg.holdings);
          agg.holdings -= soldQty;
          agg.buyCost = Math.max(0, agg.buyCost - soldQty * avgCost);
          aggregatesBySymbol.set(normalizedSymbol, agg);
        }

        const realized = realizedPnlByTransaction.get(transaction.id);
        if (realized) {
          realizedByCurrency[currencyCode] = (realizedByCurrency[currencyCode] ?? 0) + realized.pnl;
          totalRealizedSellPnl += realized.pnl;
        }
      }

      if (side === "BUY" && pnlMethod === "WAC") {
        const agg = aggregatesBySymbol.get(normalizedSymbol) ?? { holdings: 0, buyCost: 0 };
        agg.holdings += transaction.quantity;
        agg.buyCost += transactionValue;
        aggregatesBySymbol.set(normalizedSymbol, agg);
      }

      totalsByCurrency[currencyCode] = totals;
    }

    let totalCostBasis = 0;
    let totalMarketValue = 0;
    
    for (const symbol of symbols) {
      const normalizedSymbol = symbol.toUpperCase();
      let holdings = 0;
      let buyCost = 0;

      if (pnlMethod === "WAC") {
        const agg = aggregatesBySymbol.get(normalizedSymbol);
        if (agg) {
          holdings = agg.holdings;
          buyCost = agg.buyCost;
        }
      } else {
        const lots = buyLotsMap.get(normalizedSymbol) ?? [];
        for (const lot of lots) {
          if (lot.qty > 0) {
            holdings += lot.qty;
            buyCost += lot.qty * lot.price;
          }
        }
      }

      totalCostBasis += buyCost;
      if (holdings > 0 && currentPrices[normalizedSymbol]) {
        totalMarketValue += holdings * currentPrices[normalizedSymbol];
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
  }, [transactions, currentPrices, currencyRates, realizedPnlByTransaction, pnlMethod]);

  useEffect(() => {
    if (transactions.length === 0) {
      setCurrentPrices({});
      setSessionQuotes({});
      setPricesLoaded(true);
      return;
    }
    const controller = new AbortController();
    const symbols = [...new Map(transactions.map(t => [t.assetSymbol.toUpperCase(), t.currency || "USD"]))];
    setPricesLoaded(false);
    Promise.all(
      symbols.map(async ([sym, transactionCurrency]) => {
        const cashCurrency = sym === "USD" || sym === "USDT" || sym === "USDC" || sym === "VND" ? sym : null;
        if (cashCurrency) {
          try {
            const price = toUsdAmount(1, cashCurrency, currencyRates);
            return [sym, { price, previousClose: price, tradingDate: null }] as const;
          } catch {
            return [sym, null] as const;
          }
        }
        try {
          const normalizedTransactionCurrency = String(transactionCurrency).trim().toUpperCase();
          const url = normalizedTransactionCurrency === "USD"
            ? `/api/stock-price?symbol=${encodeURIComponent(getPriceSymbol(sym))}`
            : `/api/stock-price?${new URLSearchParams({
              symbol: getPriceSymbol(sym),
              targetCurrency: "USD",
              preferredCurrency: normalizedTransactionCurrency,
            })}`;
          const res = await fetch(url, {
            signal: controller.signal,
          });
          const d = await res.json();
          if (!Number.isFinite(d.price) || d.price <= 0) return [sym.toUpperCase(), null] as const;
          const previousClose = Number.isFinite(d.previousClose)
            ? Number(d.previousClose)
            : Number.isFinite(d.change)
              ? Number(d.price) - Number(d.change)
              : null;
          return [sym.toUpperCase(), {
            price: Number(d.price),
            previousClose,
            tradingDate: typeof d.tradingDate === "string" ? d.tradingDate : null,
          }] as const;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          return [sym.toUpperCase(), null] as const;
        }
      }),
    )
      .then((entries) => {
        if (!controller.signal.aborted) {
          const nextPrices: Record<string, number> = {};
          const nextSessionQuotes: Record<string, { price: number; previousClose: number | null; tradingDate: string | null }> = {};
          for (const [symbol, quote] of entries) {
            if (quote != null) {
              nextPrices[symbol] = quote.price;
              nextSessionQuotes[symbol] = quote;
            }
          }
          setCurrentPrices(nextPrices);
          setSessionQuotes(nextSessionQuotes);
          setPricesLoaded(true);
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setCurrentPrices({});
          setSessionQuotes({});
          setPricesLoaded(true);
        }
      });
    return () => controller.abort();
  }, [transactions, currencyRates]);

  useEffect(() => {
    if (transactions.length === 0) {
      setCurrencyRates({ USD: 1, USDT: 1, USDC: 1, VND: 25400 });
      setCurrencyRatesLoaded(true);
      return;
    }
    const controller = new AbortController();
    const currencies = [...new Set(transactions.map(t => (t.currency || "USD").trim().toUpperCase()))];
    setCurrencyRatesLoaded(false);

    Promise.all(
      currencies.map(async (currencyCode) => {
        if (currencyCode === "USD" || currencyCode === "USDT" || currencyCode === "USDC") {
          return [currencyCode, 1] as const;
        }

        try {
          const res = await fetch(`/api/fx-rate?currency=${encodeURIComponent(currencyCode)}`, {
            signal: controller.signal,
          });
          const data = await res.json();
          const rate = Number(data.rate);
          const fallback = currencyCode === "VND" ? 25400 : undefined;
          return [currencyCode, Number.isFinite(rate) && rate > 0 && !data.error ? rate : fallback] as const;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          return [currencyCode, currencyCode === "VND" ? 25400 : undefined] as const;
        }
      }),
    )
      .then((entries) => {
        if (!controller.signal.aborted) {
          setCurrencyRates({ USD: 1, USDT: 1, USDC: 1, VND: 25400, ...Object.fromEntries(entries) });
          setCurrencyRatesLoaded(true);
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setCurrencyRates({ USD: 1, USDT: 1, USDC: 1, VND: 25400 });
          setCurrencyRatesLoaded(true);
        }
      });

    return () => controller.abort();
  }, [transactions]);

  const requiredSymbols = useMemo(
    () => [...new Set(transactions.map(t => t.assetSymbol.toUpperCase()))],
    [transactions],
  );

  const chartDataReady = useMemo(() => {
    if (transactions.length === 0) return true;
    return pricesLoaded
      && currencyRatesLoaded
      && requiredSymbols.every((symbol) => symbol in currentPrices);
  }, [transactions.length, pricesLoaded, currencyRatesLoaded, requiredSymbols, currentPrices]);

  const sessionHoldings = useMemo(() => {
    const quantities = new Map<string, number>();
    [...transactions]
      .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime())
      .forEach(transaction => {
        const symbol = transaction.assetSymbol.toUpperCase();
        const side = normalizeType(transaction.type);
        const signedQuantity = side === "SELL" ? -transaction.quantity : side === "BUY" ? transaction.quantity : 0;
        quantities.set(symbol, Math.max(0, (quantities.get(symbol) ?? 0) + signedQuantity));
      });
    return quantities;
  }, [transactions]);

  const dailySession = useMemo(
    () => summarizeDailySession([...sessionHoldings.entries()].map(([symbol, quantity]) => ({
      symbol,
      quantity,
      currentPrice: sessionQuotes[symbol]?.price ?? null,
      previousClose: sessionQuotes[symbol]?.previousClose ?? null,
    }))),
    [sessionHoldings, sessionQuotes],
  );
  const dailySessionTradingDate = useMemo(
    () => Object.values(sessionQuotes).map(quote => quote.tradingDate).filter(Boolean).sort().at(-1) ?? null,
    [sessionQuotes],
  );

  const [leftWidth, setLeftWidth] = useState(800);
  const isDraggingRef = useRef(false);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const newWidth = Math.max(400, Math.min(1200, e.clientX - 256));
    setLeftWidth(newWidth);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  function getSector(symbol: string) {
    return sectors[symbol] ?? SECTOR_MAP[symbol.toUpperCase()] ?? SECTOR_MAP[symbol] ?? "Khác";
  }

  function renderTransactionPnl(transaction: Transaction) {
    const side = normalizeType(transaction.type);
    if (side === "BUY") {
      const unrealized = portfolioSummary.unrealizedPnlByTransaction.get(transaction.id);
      if (!unrealized) return <span className="text-slate-600 text-xs">{isVi ? "Đang tải..." : "Loading..."}</span>;
      return (
        <span className={`font-semibold text-xs ${unrealized.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
          {unrealized.pnl >= 0 ? "▲" : "▼"} {unrealized.pnl >= 0 ? "+" : ""}{formatNumber(unrealized.pnl)} ({formatPercent(unrealized.pnlPct)})
        </span>
      );
    }

    if (side === "SELL") {
      const realized = realizedPnlByTransaction.get(transaction.id);
      if (!realized) return <span className="text-slate-600 text-xs">{isVi ? "Thiếu giá vốn" : "No cost basis"}</span>;
      const isProfit = realized.pnl >= 0;
      return (
        <div className="text-right">
          <span className={`font-semibold text-xs ${isProfit ? "text-green-400" : "text-red-400"}`}>
          {isProfit ? "▲ +" : "▼ "}{formatCurrencyValue(realized.pnl, "USD")} ({formatPercent(realized.pnlPct)})
          </span>
          <p className="mt-1 text-[11px] text-slate-500">
            {isVi ? "Giá vốn" : "Cost basis"} {formatCurrencyValue(realized.avgCost, "USD")}
          </p>
        </div>
      );
    }

    if (side === "SWAP" || side === "STAKE") {
      return <span className="text-slate-500 text-xs">{isVi ? "Chưa hỗ trợ tính P&L cho loại này" : "P&L calculation not supported"}</span>;
    }

    return null;
  }

  // Filter and Sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];
    
    // Filter by asset
    if (filterAsset !== "ALL") {
      result = result.filter(t => t.assetSymbol.toUpperCase() === filterAsset.toUpperCase());
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "date_desc") {
        return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
      }
      if (sortBy === "date_asc") {
        return new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      }
      if (sortBy === "qty_desc") {
        return b.quantity - a.quantity;
      }
      if (sortBy === "qty_asc") {
        return a.quantity - b.quantity;
      }
      if (sortBy === "value_desc") {
        return (b.quantity * b.price) - (a.quantity * a.price);
      }
      if (sortBy === "value_asc") {
        return (a.quantity * a.price) - (b.quantity * b.price);
      }
      return 0;
    });

    return result;
  }, [transactions, filterAsset, sortBy]);

  // Extract unique symbols for filtering select
  const uniqueSymbols = useMemo(() => {
    return [...new Set(transactions.map(t => t.assetSymbol.toUpperCase()))].sort();
  }, [transactions]);

  return (
    <div className="min-h-screen text-slate-100 flex antigravity-volumetric">

      <div className="flex flex-1 h-full overflow-hidden">
        <main style={{ width: `${leftWidth}px` }} className="shrink-0 h-full overflow-y-auto p-6 space-y-6">

          {error && (
            <div className="antigravity-panel p-4 text-sm text-red-400 border border-red-500/20 bg-red-500/5 backdrop-blur">
              {error}
            </div>
          )}

          <DailySessionSummary summary={dailySession} currency="USD" tradingDate={dailySessionTradingDate} />

          <PortfolioChart
            transactions={transactions}
            currentPrices={currentPrices}
            currencyRates={currencyRates}
            dataReady={chartDataReady}
          />

          <div className="antigravity-panel antigravity-float-slow overflow-hidden">
            {/* Embedded Header Controls */}
            <div className="flex flex-col border-b border-white/5 p-6 gap-4 bg-white/[0.01]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-bold text-white tracking-widest uppercase">{isVi ? "Lịch sử giao dịch" : "Transaction History"}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    if (transactions.length === 0) return;
                    const headers = ["Loại", "Mã tài sản", "Tên tài sản", "Ngày", "Số lượng", "Giá", "Tiền tệ", "Tổng tiền", "Ghi chú"];
                    const rows = transactions.map(t => [
                      normalizeType(t.type) === "BUY" ? "MUA" : normalizeType(t.type) === "SELL" ? "BÁN" : t.type,
                      t.assetSymbol,
                      t.assetName || "",
                      t.transactionDate?.slice(0, 10) || "",
                      t.quantity,
                      t.price,
                      t.currency,
                      t.quantity * t.price,
                      t.notes || ""
                    ]);
                    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `transaction_history_${id}.csv`);
                    link.style.visibility = "hidden";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }} disabled={transactions.length === 0} className="antigravity-btn px-4 py-1.5 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    📥 {isVi ? "Xuất CSV" : "Export CSV"}
                  </button>
                  <button onClick={() => showForm && !editingTx ? resetForm() : setShowForm(!showForm)}
                    className="antigravity-btn px-4 py-1.5 text-xs font-bold transition-all">
                    {showForm ? (isVi ? "✕ Đóng" : "✕ Close") : (isVi ? "+ Thêm GD" : "+ Add Tx")}
                  </button>
                </div>
              </div>
            </div>

            {/* Form Section inside Table Card */}
            {showForm && (
              <div className="border-b border-white/5 p-6 bg-white/[0.01]">
                <h4 className="font-bold text-xs uppercase tracking-wider text-white mb-4">{editingTx ? (isVi ? "✏️ Sửa giao dịch" : "✏️ Edit transaction") : (isVi ? "Thêm giao dịch mới" : "Add new transaction")}</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="relative" ref={suggestRef}>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Mã cổ phiếu *" : "Asset Symbol *"}</label>
                    <input value={symbol} onChange={e => handleSymbolChange(e.target.value)}
                      onFocus={() => symbol && setShowSuggestions(true)}
                      placeholder={isVi ? "VD: AAPL, GOOGL, VNM..." : "e.g., AAPL, GOOGL..."}
                      className="w-full antigravity-input rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none" />
                    {showSuggestions && (suggestions.length > 0 || searchLoading) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#0b0c10] border border-white/5 rounded-lg shadow-xl z-50 overflow-hidden">
                        {searchLoading && <div className="px-3 py-2 text-xs text-slate-500">{isVi ? "Đang tìm..." : "Searching..."}</div>}
                        {suggestions.map(s => (
                          <button key={s.symbol} onMouseDown={() => selectSuggestion(s)}
                            className="w-full px-3 py-2 text-left hover:bg-white/5 transition-colors flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-white text-xs">{s.symbol}</span>
                              <span className="text-slate-400 text-[10px] ml-2">{s.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{s.type}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Tên công ty" : "Company Name"}</label>
                    <input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder={isVi ? "Tự điền hoặc chọn từ gợi ý" : "Auto-filled or suggest"}
                      className="w-full antigravity-input rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Loại *" : "Type *"}</label>
                    <select value={type} onChange={e => setType(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                      <option value="BUY">{isVi ? "🟢 MUA" : "🟢 BUY"}</option>
                      <option value="SELL">{isVi ? "🔴 BÁN" : "🔴 SELL"}</option>
                      <option value="SWAP">{isVi ? "🔄 SWAP - Hoán đổi" : "🔄 SWAP - Exchange"}</option>
                      <option value="STAKE">{isVi ? "💎 STAKE - Đặt cọc" : "💎 STAKE - Lock"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Tiền tệ" : "Currency"}</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                      <option value="USD">USD</option>
                      <option value="VND">VND</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Số lượng *" : "Quantity *"}</label>
                    <input type="number" min="0" max={normalizeType(type) === "SELL" && symbol ? getAvailableToSell(symbol, date) : undefined} value={quantity} onChange={e => handleQuantityChange(e.target.value)} placeholder="10"
                      className="w-full antigravity-input rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                    {normalizeType(type) === "SELL" && symbol && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        {isVi ? "Có thể bán tối đa:" : "Max available to sell:"} <span className="font-semibold text-yellow-400">{formatNumber(getAvailableToSell(symbol, date))}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Giá *" : "Price *"}</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="150.00"
                      className="w-full antigravity-input rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                    {currentPrice !== null && Number(price) > 0 && (
                      <p className="mt-1 text-[10px] text-slate-450 leading-tight">
                        {isVi ? "Giá hiện tại:" : "Current price:"} <span className="text-white font-semibold">${formatNumber(currentPrice)}</span>{" "}
                        <span className={currentPrice >= Number(price) ? "text-emerald-450 font-bold" : "text-red-450 font-bold"}>
                          ({currentPrice >= Number(price) ? (isVi ? "Tăng +" : "Up +") : (isVi ? "Giảm " : "Down ")}{formatPercent(((currentPrice - Number(price)) / Number(price)) * 100)} {isVi ? "so với GD" : "vs Tx"})
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Ngày giao dịch" : "Transaction Date"}</label>
                    <input type="date" required value={date} onChange={e => handleDateChange(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Phí giao dịch" : "Fee"}</label>
                    <input type="number" min="0" value={fee} onChange={e => setFee(e.target.value)} placeholder="0.00"
                      className="w-full antigravity-input rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Ghi chú" : "Notes"}</label>
                    <input value={notes} onChange={e => setNotes(e.target.value)} placeholder={isVi ? "Tuỳ chọn..." : "Optional..."}
                      className="w-full antigravity-input rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                  </div>
                </div>
                {Number(quantity) > 0 && Number(price) > 0 && (
                  <div className="mb-4 p-3 bg-white/[0.02] border border-white/5 rounded-lg flex justify-between items-center text-xs font-bold text-slate-450">
                    <span>{isVi ? "TỔNG GIÁ TRỊ GIAO DỊCH:" : "TOTAL TRANSACTION VALUE:"}</span>
                    <span className="text-white text-sm">
                      {currency}{" "}
                      {(() => {
                        const q = Number(quantity || 0);
                        const p = Number(price || 0);
                        const f = Number(fee || 0);
                        const total = normalizeType(type) === "BUY" ? (q * p) + f : (q * p) - f;
                        return formatNumber(total);
                      })()}
                    </span>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={handleSubmit} disabled={isSubmitting} className="flex-grow py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-xs rounded-lg transition-colors">
                    {isSubmitting ? (isVi ? "Đang lưu..." : "Saving...") : editingTx ? `✓ ${isVi ? "Lưu thay đổi" : "Save Changes"}` : `✓ ${isVi ? "Xác nhận giao dịch" : "Confirm transaction"}`}
                  </button>
                  {editingTx && (
                    <button onClick={resetForm} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition-colors">{isVi ? "Hủy" : "Cancel"}</button>
                  )}
                </div>
              </div>
            )}

            {/* Filter & Sorting UI Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b border-white/5 bg-white/[0.005]">
              {/* Filter by Asset */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Xem tài sản" : "View Asset"}</label>
                <select value={filterAsset} onChange={e => setFilterAsset(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="ALL">{isVi ? "Tất cả tài sản" : "All Assets"}</option>
                  {uniqueSymbols.map(sym => (
                    <option key={sym} value={sym}>{sym}</option>
                  ))}
                </select>
              </div>

              {/* Sorting options */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Sắp xếp theo" : "Sort by"}</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="date_desc">{isVi ? "📅 Mới nhất" : "📅 Newest"}</option>
                  <option value="date_asc">{isVi ? "📅 Cũ nhất" : "📅 Oldest"}</option>
                  <option value="qty_desc">{isVi ? "📊 Số lượng: Lớn → Nhỏ" : "📊 Qty: High → Low"}</option>
                  <option value="qty_asc">{isVi ? "📊 Số lượng: Nhỏ → Lớn" : "📊 Qty: Low → High"}</option>
                  <option value="value_desc">{isVi ? "💰 Giá trị: Lớn → Nhỏ" : "💰 Value: High → Low"}</option>
                  <option value="value_asc">{isVi ? "💰 Giá trị: Nhỏ → Lớn" : "💰 Value: Low → High"}</option>
                </select>
              </div>

              {/* P&L Calculation Method */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">{isVi ? "Phương pháp tính P&L" : "P&L Method"}</label>
                <select value={pnlMethod} onChange={e => setPnlMethod(e.target.value as any)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="WAC">{isVi ? "⚖️ Bình quân gia quyền (WAC)" : "⚖️ Weighted Average (WAC)"}</option>
                  <option value="FIFO">{isVi ? "📥 Nhập trước xuất trước (FIFO)" : "📥 First In First Out (FIFO)"}</option>
                  <option value="LIFO">{isVi ? "📤 Nhập sau xuất trước (LIFO)" : "📤 Last In First Out (LIFO)"}</option>
                </select>
              </div>
            </div>

            {/* Table Content */}
            <div className="p-6">
              {filteredAndSortedTransactions.length === 0 && !showForm ? (
                <div className="text-center py-12 text-slate-550">
                  <p className="text-sm">{isVi ? "Chưa có giao dịch nào phù hợp với bộ lọc." : "No transactions match the selected filters."}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-4 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">{isVi ? "Loại" : "Type"}</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">{isVi ? "Mã" : "Symbol"}</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">{isVi ? "Công ty" : "Company"}</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">{isVi ? "Ngày" : "Date"}</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">{isVi ? "Số lượng" : "Qty"}</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">{isVi ? "Giá" : "Price"}</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">{isVi ? "Tổng tiền" : "Total"}</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">P&L</th>
                        <th className="text-center px-4 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">{isVi ? "Hành động" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredAndSortedTransactions.map(t => (
                        <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          {deleteConfirm === t.id ? (
                            <td colSpan={9} className="px-4 py-4">
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-red-400 font-bold">{isVi ? "Xóa giao dịch này?" : "Delete this transaction?"}</p>
                                <div className="flex gap-2">
                                  <button onClick={() => handleDelete(t.id)} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold rounded transition-colors">{isVi ? "Xóa" : "Delete"}</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded transition-colors">{isVi ? "Hủy" : "Cancel"}</button>
                                </div>
                              </div>
                            </td>
                          ) : (
                            <>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${normalizeType(t.type) === "BUY" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                  {normalizeType(t.type) === "BUY" ? (isVi ? "MUA" : "BUY") : (isVi ? "BÁN" : "SELL")}
                                </span>
                              </td>
                              <td className="px-4 py-4 font-semibold text-white">{t.assetSymbol}</td>
                              <td className="px-4 py-4 text-slate-300 text-xs">{t.assetName}</td>
                              <td className="px-4 py-4 text-slate-400 text-xs">{t.transactionDate?.slice(0,10)}</td>
                              <td className="px-4 py-4 text-right text-white">{formatNumber(t.quantity)}</td>
                              <td className="px-4 py-4 text-right text-white">{formatCurrencyValue(t.price, t.currency)}</td>
                              <td className={`px-4 py-4 text-right font-semibold ${normalizeType(t.type) === "BUY" ? "text-red-400" : "text-green-400"}`}>
                                {normalizeType(t.type) === "BUY" ? "-" : "+"}{formatCurrencyValue(t.quantity * t.price, t.currency)}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {renderTransactionPnl(t)}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex gap-2 justify-center">
                                  <button onClick={() => openEdit(t)} className="p-1 rounded text-slate-450 hover:text-white transition-colors">✏️</button>
                                  <button onClick={() => setDeleteConfirm(t.id)} className="p-1 rounded text-slate-450 hover:text-red-400 transition-colors">🗑️</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </main>

        {/* Draggable Divider Slider */}
        <div 
          onMouseDown={startResize}
          className="w-1.5 hover:w-2 shrink-0 bg-white/5 hover:bg-cyan-500/40 cursor-col-resize transition-all duration-150 h-full relative z-50 group"
          title="Drag to resize"
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-white/10 group-hover:bg-cyan-400" />
        </div>

        <div className="flex-1 h-full overflow-y-auto p-6 bg-transparent border-l border-white/5">
        <PortfolioOverviewPanel portfolioId={id as string} />
      </div>
    </div>
    </div>
  );
}
