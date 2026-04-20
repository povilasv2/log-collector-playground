import { LRUCache } from "lru-cache";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface LimiterOpts {
  capacity: number;
  refillPerSec: number;
  maxKeys: number;
}

function makeLimiter({ capacity, refillPerSec, maxKeys }: LimiterOpts) {
  const cache = new LRUCache<string, Bucket>({ max: maxKeys, ttl: 1000 * 60 * 60 });
  return (key: string): { ok: boolean; retryAfterMs: number } => {
    const now = Date.now();
    const b = cache.get(key) ?? { tokens: capacity, lastRefill: now };
    const elapsed = (now - b.lastRefill) / 1000;
    b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerSec);
    b.lastRefill = now;
    if (b.tokens >= 1) {
      b.tokens -= 1;
      cache.set(key, b);
      return { ok: true, retryAfterMs: 0 };
    }
    cache.set(key, b);
    const deficit = 1 - b.tokens;
    return { ok: false, retryAfterMs: Math.ceil((deficit / refillPerSec) * 1000) };
  };
}

// 10 runs per 60s and 100 runs per hour, enforced independently.
const perMinute = makeLimiter({ capacity: 10, refillPerSec: 10 / 60, maxKeys: 5000 });
const perHour = makeLimiter({ capacity: 100, refillPerSec: 100 / 3600, maxKeys: 5000 });

export function checkRateLimit(key: string) {
  const m = perMinute(key);
  if (!m.ok) return m;
  const h = perHour(key);
  if (!h.ok) return h;
  return { ok: true as const, retryAfterMs: 0 };
}
