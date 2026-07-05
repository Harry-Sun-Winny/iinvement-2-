export interface CachePolicy {
  ttlMs: number;
  category: "realtime" | "metadata" | "historical" | "news";
}

export const CACHE_POLICIES: Record<string, CachePolicy> = {
  quote: { ttlMs: 10_000, category: "realtime" },      // Real-time price quotes
  profile: { ttlMs: 3600_000, category: "metadata" },  // Metadata like logos/sectors (1h)
  history: { ttlMs: 300_000, category: "historical" }, // Yahoo history (5m)
  fmp: { ttlMs: 300_000, category: "historical" },     // Key metrics / income statement (5m)
  news: { ttlMs: 1800_000, category: "news" },         // News feeds (30m)
};
