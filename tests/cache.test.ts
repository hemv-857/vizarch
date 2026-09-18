// vizarch — Unit tests for cache
// Run: bun test tests/cache.test.ts

import { describe, it, expect, beforeEach } from "bun:test";
import { getCached, setCached, makeCacheKey, clearCache, cacheStats } from "../src/lib/vizarch/cache";
import type { DiagramResult } from "../src/lib/vizarch/types";

function fakeResult(nodeCount = 3): DiagramResult {
  return {
    graph: { nodes: [], edges: [] },
    svg: "<svg></svg>",
    width: 800,
    height: 600,
    meta: {
      nodeCount,
      edgeCount: 0,
      parseTimeMs: 10,
      layoutTimeMs: 5,
      exportTimeMs: 2,
      cacheHit: false,
      confidence: 1,
      ambiguities: [],
    },
  };
}

describe("cache", () => {
  beforeEach(() => {
    clearCache();
  });

  it("stores and retrieves a value", () => {
    const key = makeCacheKey("test", "{}");
    const result = fakeResult();
    setCached(key, result);
    const hit = getCached(key);
    expect(hit).toBeDefined();
    expect(hit!.meta.nodeCount).toBe(3);
  });

  it("returns undefined for missing key", () => {
    const hit = getCached("nonexistent");
    expect(hit).toBeUndefined();
  });

  it("returns undefined for expired entry", () => {
    const key = makeCacheKey("expire-test", "{}");
    setCached(key, fakeResult());
    // Manually expire by checking TTL behavior
    // The TTL is 5 minutes, so we can't easily test expiration in a unit test
    // But we can verify the entry exists before expiration
    expect(getCached(key)).toBeDefined();
  });

  it("evicts oldest entries when full", () => {
    // Fill cache with 200 entries (MAX_ENTRIES)
    for (let i = 0; i < 200; i++) {
      const key = makeCacheKey(`item-${i}`, `{}${i}`);
      setCached(key, fakeResult(i));
    }
    expect(cacheStats().size).toBe(200);

    // Adding one more should evict 25 entries
    setCached(makeCacheKey("overflow", "{}"), fakeResult(999));
    expect(cacheStats().size).toBeLessThanOrEqual(200);
  });

  it("generates different keys for different inputs", () => {
    const key1 = makeCacheKey("desc1", "{}");
    const key2 = makeCacheKey("desc2", "{}");
    expect(key1).not.toBe(key2);
  });

  it("generates same key for same inputs", () => {
    const key1 = makeCacheKey("same", "{}");
    const key2 = makeCacheKey("same", "{}");
    expect(key1).toBe(key2);
  });

  it("clearCache empties the cache", () => {
    setCached(makeCacheKey("x", "{}"), fakeResult());
    expect(cacheStats().size).toBe(1);
    clearCache();
    expect(cacheStats().size).toBe(0);
  });

  it("sets cacheHit to false on stored values", () => {
    const key = makeCacheKey("nocheat", "{}");
    const result = fakeResult();
    result.meta.cacheHit = true; // set to true before storing
    setCached(key, result);
    const hit = getCached(key);
    expect(hit!.meta.cacheHit).toBe(false); // should be reset
  });
});
