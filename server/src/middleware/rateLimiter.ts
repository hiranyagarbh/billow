/**
 * ─── Rate Limiter Middleware ─────────────────────────────────────────────────
 *
 * A lightweight, in-memory sliding-window rate limiter to protect the API
 * from abuse without adding an external dependency like `express-rate-limit`.
 *
 * HOW IT WORKS:
 * ─────────────
 * Each client is identified by their IP address. We track the timestamps
 * of their recent requests in a Map. On each new request, we:
 *   1. Remove timestamps older than the sliding window
 *   2. Check if the remaining count exceeds the limit
 *   3. If so, respond with 429 Too Many Requests
 *   4. Otherwise, record the new timestamp and continue
 *
 * WHY NOT USE express-rate-limit?
 * ─────────────────────────────────
 * For a small single-instance project like Billow, a hand-rolled rate limiter
 * keeps dependencies lean and is easy to understand. If you scale to multiple
 * server instances, switch to a Redis-backed solution instead.
 */

import { Request, Response, NextFunction } from "express";

// ─── Configuration ──────────────────────────────────────────────────────────

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;

  /** Time window in milliseconds */
  windowMs: number;

  /** Custom message returned when limit is exceeded */
  message?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  message: "Too many requests. Please try again later.",
};

// ─── Request Tracking ───────────────────────────────────────────────────────

/**
 * In-memory store: maps client IP → array of request timestamps.
 *
 * ⚠️  This resets when the server restarts. For Billow's use case (dev tool
 *    with a single user), that's perfectly acceptable.
 */
const requestLog = new Map<string, number[]>();

// ─── Cleanup ────────────────────────────────────────────────────────────────

/**
 * Periodically prune stale entries to prevent memory growth.
 * Runs every 5 minutes and removes clients with no recent requests.
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of requestLog.entries()) {
    // Keep only timestamps within the default window
    const recent = timestamps.filter(
      (t) => now - t < DEFAULT_CONFIG.windowMs
    );
    if (recent.length === 0) {
      requestLog.delete(ip);
    } else {
      requestLog.set(ip, recent);
    }
  }
}, CLEANUP_INTERVAL_MS);

// ─── Middleware Factory ─────────────────────────────────────────────────────

/**
 * Creates a rate-limiting middleware.
 *
 * Usage:
 *   app.use('/api', createRateLimiter({ maxRequests: 60, windowMs: 60000 }));
 *
 * Or with defaults (100 req/min):
 *   app.use('/api', createRateLimiter());
 *
 * @param config - Optional overrides for max requests, window, and message
 */
export function createRateLimiter(config?: Partial<RateLimitConfig>) {
  const { maxRequests, windowMs, message } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use X-Forwarded-For if behind a reverse proxy, otherwise req.ip
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || req.ip
      || "unknown";

    const now = Date.now();
    const timestamps = requestLog.get(clientIp) ?? [];

    // Slide the window: keep only recent timestamps
    const recentTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (recentTimestamps.length >= maxRequests) {
      // Calculate when the client can retry
      const oldestInWindow = recentTimestamps[0];
      const retryAfterMs = windowMs - (now - oldestInWindow);
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      res.set("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: message,
        retryAfterSeconds,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Record this request
    recentTimestamps.push(now);
    requestLog.set(clientIp, recentTimestamps);

    // Add rate limit headers so clients can self-regulate
    res.set("X-RateLimit-Limit", String(maxRequests));
    res.set("X-RateLimit-Remaining", String(maxRequests - recentTimestamps.length));
    res.set("X-RateLimit-Reset", String(Math.ceil((now + windowMs) / 1000)));

    next();
  };
}
