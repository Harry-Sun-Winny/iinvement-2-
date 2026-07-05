import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWatchlists, getWatchlistItems, Watchlist, WatchlistItem, getStockPrice } from "@/app/lib/api";
import { Eye, RefreshCw } from "lucide-react";

export default function WatchlistSidebar() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !localStorage.getItem("token")) return;
    loadWatchlists();
  }, []);

  async function loadWatchlists() {
    try {
      const lists = (await getWatchlists()) ?? [];
      setWatchlists(lists);
      if (lists.length > 0) {
        setSelectedListId(lists[0].id);
        await loadItems(lists[0].id);
      } else {
        setSelectedListId("");
        setItems([]);
        setPrices({});
      }
    } catch (e) {
      console.error(e);
      setWatchlists([]);
      setSelectedListId("");
      setItems([]);
      setPrices({});
    }
  }

  async function loadItems(watchlistId: string) {
    if (!watchlistId) return;
    setLoading(true);
    try {
      const listItems = (await getWatchlistItems(watchlistId)) ?? [];
      setItems(listItems);
      // Fetch prices
      const priceMap: Record<string, number> = {};
      await Promise.all(
        listItems.map(async (item) => {
          const p = await getStockPrice(item.assetSymbol);
          if (p?.price) {
            priceMap[item.assetSymbol] = p.price;
          }
        })
      );
      setPrices(priceMap);
    } catch (e) {
      console.error(e);
      setItems([]);
      setPrices({});
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="antigravity-panel border-white/5 bg-white/[0.01]">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-blue-400" /> Watchlist Desk
        </CardTitle>
        {selectedListId && (
          <button
            onClick={() => loadItems(selectedListId)}
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 py-4">
        {watchlists.length > 1 && (
          <select
            value={selectedListId}
            onChange={(e) => {
              setSelectedListId(e.target.value);
              loadItems(e.target.value);
            }}
            className="w-full text-xs rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1.5 text-white outline-none"
          >
            {watchlists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}

        {items.length === 0 ? (
          <p className="text-[10px] text-slate-500 font-mono text-center py-4">No items in watchlist</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-slate-950/40 border border-white/5 rounded-lg p-2 text-xs">
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-white">{item.assetSymbol}</span>
                  <span className="text-[9px] text-slate-400 truncate max-w-[120px]">{item.assetName}</span>
                </div>
                <span className="font-mono text-slate-200 font-bold">
                  {prices[item.assetSymbol] ? `$${prices[item.assetSymbol].toFixed(2)}` : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
