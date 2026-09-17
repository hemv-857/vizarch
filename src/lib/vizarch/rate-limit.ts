// vizarch — Simple in-memory rate limiter for Free/Pro/Enterprise tiers.
// Tracks requests per IP+endpoint. Resets daily.

interface RateBucket {
  count: number;
  windowStart: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Map: key (ip:endpoint) → bucket
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

// Default tier for anonymous users (no auth yet)
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

  return {
    allowed,
    tier,
    remaining,
    limit: config.dailyLimit,
    resetAt,
  };
}

// Cleanup old buckets periodically (called on each request, cheap)
export function pruneOldBuckets() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > DAY_MS * 2) {
      buckets.delete(key);
    }
  }
}

// Get current usage stats (for debugging / admin)
export function getRateLimitStats() {
  pruneOldBuckets();
  return {
    activeBuckets: buckets.size,
    quotas: QUOTAS,
  };
}
