const RATE_LIMIT_MAX = 100
const RATE_LIMIT_WINDOW_MS = 60_000
const GC_THRESHOLD = 10_000

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

export function checkRateLimit(token: string): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(token)

  if (!existing || existing.resetAt < now) {
    const fresh: Bucket = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }
    buckets.set(token, fresh)
    return {
      allowed: true,
      limit: RATE_LIMIT_MAX,
      remaining: RATE_LIMIT_MAX - 1,
      resetAt: fresh.resetAt,
    }
  }

  existing.count += 1
  const remaining = Math.max(0, RATE_LIMIT_MAX - existing.count)
  return {
    allowed: existing.count <= RATE_LIMIT_MAX,
    limit: RATE_LIMIT_MAX,
    remaining,
    resetAt: existing.resetAt,
  }
}

export function maybeGcBuckets() {
  if (buckets.size < GC_THRESHOLD) return
  const now = Date.now()
  for (const [token, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) buckets.delete(token)
  }
}
