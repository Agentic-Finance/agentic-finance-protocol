/**
 * In-memory rate limiter for API endpoints.
 *
 * Usage:
 *   import { rateLimit } from '@/app/lib/rate-limit';
 *   const limiter = rateLimit({ windowMs: 60_000, max: 100 });
 *
 *   // In API route:
 *   const { success, remaining } = limiter.check(identifier);
 *   if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
 */

interface RateLimitConfig {
  /** Time window in milliseconds (default: 60_000 = 1 minute) */
  windowMs?: number;
  /** Max requests per window (default: 100) */
  max?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

export function rateLimit(config: RateLimitConfig = {}) {
  const windowMs = config.windowMs ?? 60_000;
  const max = config.max ?? 100;

  // Use a unique store per config to avoid collisions
  const storeKey = `${windowMs}:${max}`;
  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }
  const store = stores.get(storeKey)!;

  // Periodic cleanup (every 5 minutes)
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  };

  let lastCleanup = Date.now();

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();

      // Cleanup every 5 minutes
      if (now - lastCleanup > 300_000) {
        cleanup();
        lastCleanup = now;
      }

      const entry = store.get(identifier);

      if (!entry || entry.resetAt < now) {
        // New window
        store.set(identifier, { count: 1, resetAt: now + windowMs });
        return { success: true, remaining: max - 1, resetAt: now + windowMs };
      }

      entry.count++;

      if (entry.count > max) {
        return { success: false, remaining: 0, resetAt: entry.resetAt };
      }

      return { success: true, remaining: max - entry.count, resetAt: entry.resetAt };
    },

    /** Reset a specific identifier's counter */
    reset(identifier: string) {
      store.delete(identifier);
    },
  };
}

// ── Pre-configured limiters for common use cases ──

/** General API: 100 req/min */
export const apiLimiter = rateLimit({ windowMs: 60_000, max: 100 });

/** Write operations (register, execute): 20 req/min */
export const writeLimiter = rateLimit({ windowMs: 60_000, max: 20 });

/** Key generation: 5 req/min */
export const keyLimiter = rateLimit({ windowMs: 60_000, max: 5 });
