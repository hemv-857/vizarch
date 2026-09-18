// vizarch — Rate limiter with database persistence.
// Uses in-memory cache as L1, Prisma database as L2 for persistence across restarts.

import { db } from "@/lib/db";

interface RateBucket {
  count: number;
  windowStart: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// L1 cache: Map<key, bucket>
const buckets = new Map<string, RateBucket>();

export type QuotaTier = "free" | "pro" | "enterprise";

export interface QuotaConfig {
  dailyLimit: number;
  label: string;
}

export const QUOTAS: Record<QuotaTier, QuotaConfig> = {
  free: { dailyLimit: 50, label: "Free" },
  pro: { dailyLimit: 1000, label: "Pro" },
  enterprise: { dailyLimit: 10000, label: "Enterprise" },
};

const DEFAULT_TIER: QuotaTier = "free";

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  tier: QuotaTier;
  remaining: number;
  limit: number;
  resetAt: number;
}

// Synchronously check + increment the in-memory counter, then persist to DB async
export function checkRateLimit(
  req: Request,
  endpoint: string,
  tier: QuotaTier = DEFAULT_TIER,
): RateLimitResult {
  const ip = getClientIp(req);
  const key = `${ip}:${endpoint}:${tier}`;
  const config = QUOTAS[tier];
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { count: 0, windowStart: now };
    buckets.set(key, bucket);
  }

  // Reset if window expired
  if (now - bucket.windowStart > DAY_MS) {
    bucket.count = 0;
    bucket.windowStart = now;
  }

  bucket.count++;
  const remaining = Math.max(0, config.dailyLimit - bucket.count);
  const allowed = bucket.count <= config.dailyLimit;
  const resetAt = bucket.windowStart + DAY_MS;

  // Persist to database asynchronously (fire-and-forget)
  persistRateLimit(key, bucket.count, bucket.windowStart, tier).catch(() => {
    // ignore DB errors — L1 cache still works
  });

  return {
    allowed,
    tier,
    remaining,
    limit: config.dailyLimit,
    resetAt,
  };
}

// Load persisted rate limit state from database into L1 cache on startup
export async function loadPersistedRateLimits(): Promise<void> {
  try {
    const records = await db.rateLimit.findMany();
    const now = Date.now();
    for (const r of records) {
      const windowStart = r.windowStart.getTime();
      // Only restore if window hasn't expired
      if (now - windowStart < DAY_MS) {
        buckets.set(r.key, { count: r.count, windowStart });
      } else {
        // Expired — delete from DB
        await db.rateLimit.delete({ where: { id: r.id } }).catch(() => {});
      }
    }
    if (records.length > 0) {
      console.log(`[vizarch] loaded ${records.length} rate limit buckets from database`);
    }
  } catch {
    // DB might not be available yet — L1 cache will work standalone
  }
}

// Persist rate limit to database
async function persistRateLimit(
  key: string,
  count: number,
  windowStart: number,
  tier: QuotaTier,
): Promise<void> {
  try {
    await db.rateLimit.upsert({
      where: { key },
      create: { key, count, windowStart: new Date(windowStart), tier },
      update: { count, windowStart: new Date(windowStart), tier },
    });
  } catch {
    // ignore — L1 cache is the source of truth for rate limiting
  }
}

export function pruneOldBuckets() {
  const now = Date.now();
  // Prune L1 cache
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > DAY_MS * 2) {
      buckets.delete(key);
    }
  }
  // Prune DB entries (async, fire-and-forget)
  db.rateLimit.deleteMany({
    where: { windowStart: { lt: new Date(now - DAY_MS * 2) } },
  }).catch(() => {});
}

export function getRateLimitStats() {
  pruneOldBuckets();
  return {
    activeBuckets: buckets.size,
    quotas: QUOTAS,
  };
}
