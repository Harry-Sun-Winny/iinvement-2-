type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

/**
 * Small in-process cache for market-data BFF routes.
 *
 * It coalesces identical requests that are already in flight so a dashboard
 * render cannot fan out duplicate provider calls while the first call waits.
 */
export class AsyncTtlCache {
  private readonly values = new Map<string, CacheEntry>();
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(private readonly maxEntries = 500) {}

  async getOrCreate<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const cached = this.values.get(key);

    if (cached && cached.expiresAt > now) {
      // Refresh insertion order so the size cap behaves like a lightweight LRU.
      this.values.delete(key);
      this.values.set(key, cached);
      return cached.value as T;
    }

    if (cached) {
      this.values.delete(key);
    }

    const inFlight = this.pending.get(key);
    if (inFlight) {
      return inFlight as Promise<T>;
    }

    const request = loader()
      .then((value) => {
        this.values.set(key, {
          expiresAt: Date.now() + Math.max(0, ttlMs),
          value,
        });
        this.trim();
        return value;
      })
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, request);
    return request;
  }

  clear() {
    this.values.clear();
    this.pending.clear();
  }

  get size() {
    return this.values.size;
  }

  private trim() {
    while (this.values.size > this.maxEntries) {
      const oldestKey = this.values.keys().next().value;
      if (oldestKey === undefined) return;
      this.values.delete(oldestKey);
    }
  }
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const workerCount = Math.min(items.length, Math.max(1, Math.floor(concurrency)));
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await mapper(items[index], index);
      }
    }),
  );

  return results;
}

export const marketRequestCache = new AsyncTtlCache();
