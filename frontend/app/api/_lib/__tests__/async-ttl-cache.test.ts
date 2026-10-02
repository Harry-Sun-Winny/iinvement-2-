import { describe, expect, it, vi } from "vitest";
import { AsyncTtlCache, mapWithConcurrency } from "../async-ttl-cache";

describe("AsyncTtlCache", () => {
  it("coalesces identical in-flight requests and reuses the cached value", async () => {
    const cache = new AsyncTtlCache();
    let resolveLoader!: (value: number) => void;
    const loader = vi.fn(() => new Promise<number>((resolve) => {
      resolveLoader = resolve;
    }));

    const first = cache.getOrCreate("quote:AAPL", 1_000, loader);
    const second = cache.getOrCreate("quote:AAPL", 1_000, loader);
    resolveLoader(42);

    await expect(Promise.all([first, second])).resolves.toEqual([42, 42]);
    await expect(cache.getOrCreate("quote:AAPL", 1_000, loader)).resolves.toBe(42);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("reloads an entry after its TTL expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T00:00:00Z"));
    const cache = new AsyncTtlCache();
    const loader = vi.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    await expect(cache.getOrCreate("history:AAPL", 1_000, loader)).resolves.toBe(1);
    vi.advanceTimersByTime(1_001);
    await expect(cache.getOrCreate("history:AAPL", 1_000, loader)).resolves.toBe(2);
    expect(loader).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("does not cache a rejected request", async () => {
    const cache = new AsyncTtlCache();
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error("provider unavailable"))
      .mockResolvedValueOnce(7);

    await expect(cache.getOrCreate("quote:MSFT", 1_000, loader)).rejects.toThrow("provider unavailable");
    await expect(cache.getOrCreate("quote:MSFT", 1_000, loader)).resolves.toBe(7);
  });
});

describe("mapWithConcurrency", () => {
  it("preserves input order and caps active work", async () => {
    let active = 0;
    let peak = 0;

    const values = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      return value * 10;
    });

    expect(values).toEqual([10, 20, 30, 40, 50]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
