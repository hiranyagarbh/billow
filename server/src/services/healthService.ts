/**
 * ─── Health Service ──────────────────────────────────────────────────────────
 *
 * Tracks server uptime and exposes system diagnostics for the /api/health
 * endpoint. Designed to give operators a quick snapshot of server state
 * without needing to SSH in or check external monitoring.
 *
 * WHAT'S TRACKED:
 * ───────────────
 *   • Server start time and human-readable uptime
 *   • Process memory usage (heap + RSS)
 *   • Node.js version
 *   • Data source mode (mock vs DynamoDB)
 *   • Total requests served since last restart
 */

import { config } from "../config/env.js";

// ─── Boot Timestamp ─────────────────────────────────────────────────────────
// Captured once when the module is first imported (i.e., at server start).
const startedAt = new Date();

// ─── Request Counter ────────────────────────────────────────────────────────
let totalRequests = 0;

/**
 * Increments the global request counter by one.
 * Call this from a middleware to count every inbound request.
 */
export function recordRequest(): void {
  totalRequests++;
}

/**
 * Returns the current request count.
 * Useful for tests that need to assert the counter incremented.
 */
export function getRequestCount(): number {
  return totalRequests;
}

// ─── Uptime Formatting ──────────────────────────────────────────────────────

/**
 * Converts a duration in milliseconds into a human-readable string.
 *
 * Examples:
 *   formatUptime(3_600_000)     → "1h 0m 0s"
 *   formatUptime(90_061_000)    → "1d 1h 1m 1s"
 *   formatUptime(45_000)        → "0h 0m 45s"
 */
export function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
  return `${hours}h ${minutes}m ${secs}s`;
}

// ─── Health Snapshot ────────────────────────────────────────────────────────

/** Shape of the health check response. */
export interface HealthStatus {
  status: "ok";
  timestamp: string;
  uptime: {
    /** ISO 8601 timestamp of when the server started */
    startedAt: string;
    /** Human-readable uptime string */
    readable: string;
    /** Raw uptime in seconds */
    seconds: number;
  };
  system: {
    /** Node.js version (e.g., "v22.5.0") */
    nodeVersion: string;
    /** Platform (e.g., "darwin", "linux") */
    platform: string;
    /** Resident Set Size in MB — total memory allocated to the process */
    memoryRssMb: number;
    /** Heap used in MB — actual JS object memory */
    heapUsedMb: number;
    /** Heap total in MB — V8 heap capacity */
    heapTotalMb: number;
  };
  app: {
    /** Current environment (development / production / test) */
    environment: string;
    /** Whether the server is using mock data */
    mockDataMode: boolean;
    /** Total API requests served since last restart */
    totalRequests: number;
  };
}

/**
 * Builds a complete health status snapshot.
 *
 * This is a pure function of the current time and process state,
 * making it easy to test by comparing field presence and types.
 */
export function getHealthStatus(): HealthStatus {
  const now = new Date();
  const uptimeMs = now.getTime() - startedAt.getTime();
  const mem = process.memoryUsage();

  return {
    status: "ok",
    timestamp: now.toISOString(),
    uptime: {
      startedAt: startedAt.toISOString(),
      readable: formatUptime(uptimeMs),
      seconds: Math.floor(uptimeMs / 1000),
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryRssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    },
    app: {
      environment: config.NODE_ENV,
      mockDataMode: config.USE_MOCK_DATA,
      totalRequests,
    },
  };
}
