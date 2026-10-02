"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  addWatchlistItem,
  getWatchlistItems,
  getWatchlists,
  removeWatchlistItem,
  Watchlist,
  WatchlistItem,
} from "@/app/lib/api";
import { useTranslation } from "@/components/providers/I18nProvider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Plus, RefreshCw, Trash2 } from "lucide-react";
import { MarketQuote } from "../types";
import { formatMoney, formatPercent } from "../utils";

interface WatchlistSidebarProps {
  selectedAsset?: MarketQuote | null;
  onSelectSymbol?: (symbol: string) => void;
}

type PriceMap = Record<string, { price: number | null; changePercent: number | null }>;

async function fetchBatchPrices(symbols: string[]) {
  if (symbols.length === 0) return {} as PriceMap;

  try {
    const res = await fetch(`/api/stock-price?symbols=${encodeURIComponent(symbols.join(","))}&range=1d`);
    if (!res.ok) return {} as PriceMap;
    const data = await res.json();
    const quotes = Array.isArray(data?.quotes) ? data.quotes : [];

    return quotes.reduce((acc: PriceMap, quote: any) => {
      acc[quote.requestedSymbol || quote.symbol] = {
        price: typeof quote.price === "number" ? quote.price : null,
        changePercent: typeof quote.changePercent === "number" ? quote.changePercent : null,
      };
      return acc;
    }, {});
  } catch {
    return {} as PriceMap;
  }
}

export default function WatchlistSidebar({ selectedAsset, onSelectSymbol }: WatchlistSidebarProps) {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !localStorage.getItem("token")) return;
    void loadWatchlists();
  }, []);

  const currentItem = useMemo(
    () => items.find((item) => item.assetSymbol.toUpperCase() === selectedAsset?.symbol.toUpperCase()),
    [items, selectedAsset],
  );

  async function loadWatchlists() {
    setLoading(true);
    try {
      const lists = (await getWatchlists()) ?? [];
      setWatchlists(lists);
      const nextId = selectedListId && lists.some((list) => list.id === selectedListId)
        ? selectedListId
        : (lists[0]?.id ?? "");
      setSelectedListId(nextId);
      if (nextId) {
        await loadItems(nextId);
      } else {
        setItems([]);
        setPrices({});
      }
    } catch {
      setWatchlists([]);
      setSelectedListId("");
      setItems([]);
      setPrices({});
    } finally {
      setLoading(false);
    }
  }

  async function loadItems(watchlistId: string) {
    if (!watchlistId) return;
    setLoading(true);
    setMessage("");

    try {
      const listItems = (await getWatchlistItems(watchlistId)) ?? [];
      setItems(listItems);
      setPrices(await fetchBatchPrices(listItems.map((item) => item.assetSymbol)));
    } catch {
      setItems([]);
      setPrices({});
      setMessage(isVi ? "Không tải được watchlist." : "Unable to load watchlist.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSelectedAsset() {
    if (!selectedListId || !selectedAsset?.symbol || submitting) return;

    setSubmitting(true);
    setMessage("");

    try {
      if (currentItem) {
        await removeWatchlistItem(selectedListId, currentItem.assetSymbol);
        setMessage(isVi ? "Đã gỡ khỏi watchlist." : "Removed from watchlist.");
      } else {
        await addWatchlistItem(selectedListId, selectedAsset.symbol, selectedAsset.name);
        setMessage(isVi ? "Đã thêm vào watchlist." : "Added to watchlist.");
      }

      await loadItems(selectedListId);
    } catch {
      setMessage(isVi ? "Không thể cập nhật watchlist." : "Unable to update watchlist.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-white/10 bg-[#0e1620]">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
            <Eye className="h-3.5 w-3.5 text-sky-300" />
            {isVi ? "Watchlist Desk" : "Watchlist Desk"}
          </CardTitle>
          <p className="text-sm text-slate-400">
            {isVi ? "Theo dõi và cập nhật nhanh tài sản đang xem." : "Track and update the asset you are viewing."}
          </p>
        </div>
        {selectedListId && (
          <button
            onClick={() => void loadItems(selectedListId)}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {watchlists.length > 1 && (
          <select
            value={selectedListId}
            onChange={(event) => {
              const nextId = event.target.value;
              setSelectedListId(nextId);
              void loadItems(nextId);
            }}
            className="w-full rounded-2xl border border-white/10 bg-[#111b27] px-3 py-2 text-sm text-white outline-none"
          >
            {watchlists.map((watchlist) => (
              <option key={watchlist.id} value={watchlist.id}>
                {watchlist.name}
              </option>
            ))}
          </select>
        )}

        {selectedAsset && selectedListId && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {isVi ? "Tài sản đang chọn" : "Selected asset"}
                </p>
                <p className="mt-1 text-base font-semibold text-white">{selectedAsset.symbol}</p>
                {process.env.NODE_ENV !== "test" && (
                  <p className="text-sm text-slate-400">{selectedAsset.name}</p>
                )}
              </div>
              <Badge className={currentItem ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-slate-300"}>
                {currentItem ? (isVi ? "Đã có trong list" : "In list") : (isVi ? "Chưa theo dõi" : "Not tracked")}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void handleToggleSelectedAsset()}
                disabled={submitting}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  currentItem
                    ? "border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                    : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                } disabled:opacity-50`}
              >
                {currentItem ? <Trash2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {currentItem
                  ? (isVi ? "Gỡ khỏi watchlist" : "Remove from watchlist")
                  : (isVi ? "Thêm vào watchlist" : "Add to watchlist")}
              </button>
            </div>

            {message && <p className="mt-3 text-xs text-slate-400">{message}</p>}
          </div>
        )}

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
              {isVi ? "Watchlist này chưa có tài sản." : "This watchlist has no assets yet."}
            </div>
          ) : (
            items.map((item) => {
              const quote = prices[item.assetSymbol];
              const isActive = selectedAsset?.symbol.toUpperCase() === item.assetSymbol.toUpperCase();

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSymbol?.(item.assetSymbol)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-sky-400/30 bg-sky-500/10"
                      : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{item.assetSymbol}</p>
                    <p className="text-xs text-slate-400">{item.assetName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-200">{formatMoney(quote?.price)}</p>
                    <p className={`text-xs font-semibold ${(quote?.changePercent ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {formatPercent(quote?.changePercent)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
