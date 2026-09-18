// vizarch — In-memory query cache.
// Hashes (description, style) → cached DiagramResult for repeat requests.

import type { DiagramResult } from "./types";

interface CacheEntry {
  key: string;
  value: DiagramResult;
  insertedAt: number;
}

const MAX_ENTRIES = 200;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, CacheEntry>();

export function makeCacheKey(
  description: string,
  styleJson: string,
): string {
  // Simple non-cryptographic hash (djb2-like)
  const seed = `${description}::${styleJson}`;
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

export function getCached(key: string): DiagramResult | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.insertedAt > TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCached(key: string, value: DiagramResult): void {
  if (cache.size >= MAX_ENTRIES) {
    // Evict oldest 25 entries (FIFO-ish)
    const keys = Array.from(cache.keys()).slice(0, 25);
    for (const k of keys) cache.delete(k);
  }
  cache.set(key, {
    key,
    value: { ...value, meta: { ...value.meta, cacheHit: false } },
    insertedAt: Date.now(),
  });
}

export function clearCache(): void {
  cache.clear();
}

export function cacheStats() {
  return {
    size: cache.size,
    max: MAX_ENTRIES,
    ttlMs: TTL_MS,
  };
}
