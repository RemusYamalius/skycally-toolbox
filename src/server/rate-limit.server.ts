import { getRequestHeader } from "@tanstack/react-start/server";

type Bucket = { count: number; resetAt: number };

// Per-isolate in-memory buckets. Not globally shared across Workers isolates,
// but it caps the damage a single scripted client can do from one IP.
const buckets = new Map<string, Bucket>();

function clientIp(): string {
  return (
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-real-ip") ||
    (getRequestHeader("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

/**
 * Simple fixed-window per-IP limiter for server functions that call paid APIs.
 * Throws RATE_LIMITED when the caller exceeds `limit` requests per `windowMs`.
 */
export function enforceRateLimit(scope: string, limit: number, windowMs = 60_000): void {
  const key = `${scope}:${clientIp()}`;
  const now = Date.now();

  // Opportunistic cleanup so the map cannot grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new Error("RATE_LIMITED");
}
