// Minimal in-process fixed-window rate limiter. Good enough for the single-node self-hosted
// deployment this app targets; a distributed deployment would swap this for a shared store (Redis).
// Keyed by an arbitrary string (we key the outside scan by IP and by domain separately).

type WindowState = { count: number; windowStartedAtMs: number };

const windowsByKey = new Map<string, WindowState>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  // Seconds until the current window resets; useful for a Retry-After header.
  retryAfterSeconds: number;
};

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  now?: number;
};

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now();
  const existing = windowsByKey.get(key);

  if (!existing || now - existing.windowStartedAtMs >= options.windowMs) {
    windowsByKey.set(key, { count: 1, windowStartedAtMs: now });
    return { allowed: true, remaining: options.limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= options.limit) {
    const retryAfterMs = options.windowMs - (now - existing.windowStartedAtMs);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  existing.count += 1;
  return { allowed: true, remaining: options.limit - existing.count, retryAfterSeconds: 0 };
}

// Test hook: clears all tracked windows so rate-limit tests start from a clean slate.
export function resetRateLimits(): void {
  windowsByKey.clear();
}
