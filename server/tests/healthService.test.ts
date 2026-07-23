/**
 * ─── Health Service Tests ────────────────────────────────────────────────────
 *
 * Covers formatUptime(), getHealthStatus(), and the request counter
 * from services/healthService.ts.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatUptime,
  getHealthStatus,
  recordRequest,
  getRequestCount,
} from "../src/services/healthService.js";

// ─── formatUptime ───────────────────────────────────────────────────────────

describe("formatUptime", () => {
  it("formats zero milliseconds", () => {
    assert.equal(formatUptime(0), "0h 0m 0s");
  });

  it("formats seconds only", () => {
    assert.equal(formatUptime(45_000), "0h 0m 45s");
  });

  it("formats minutes and seconds", () => {
    assert.equal(formatUptime(125_000), "0h 2m 5s");
  });

  it("formats hours, minutes, seconds", () => {
    // 1h 0m 0s = 3,600,000ms
    assert.equal(formatUptime(3_600_000), "1h 0m 0s");
  });

  it("formats complex duration without days", () => {
    // 2h 30m 15s = 9,015,000ms
    assert.equal(formatUptime(9_015_000), "2h 30m 15s");
  });

  it("includes days when uptime exceeds 24 hours", () => {
    // 1d 1h 1m 1s = 90,061,000ms
    assert.equal(formatUptime(90_061_000), "1d 1h 1m 1s");
  });

  it("handles exactly 1 day", () => {
    assert.equal(formatUptime(86_400_000), "1d 0h 0m 0s");
  });

  it("handles multiple days", () => {
    // 3d 0h 0m 0s = 259,200,000ms
    assert.equal(formatUptime(259_200_000), "3d 0h 0m 0s");
  });
});

// ─── getHealthStatus ────────────────────────────────────────────────────────

describe("getHealthStatus", () => {
  it("returns status 'ok'", () => {
    const health = getHealthStatus();
    assert.equal(health.status, "ok");
  });

  it("includes a valid ISO timestamp", () => {
    const health = getHealthStatus();
    const parsed = new Date(health.timestamp);
    assert.ok(!isNaN(parsed.getTime()), "timestamp should be a valid ISO date");
  });

  it("includes uptime with startedAt, readable, and seconds", () => {
    const health = getHealthStatus();
    assert.ok(health.uptime.startedAt, "should have startedAt");
    assert.ok(typeof health.uptime.readable === "string", "readable should be a string");
    assert.ok(typeof health.uptime.seconds === "number", "seconds should be a number");
    assert.ok(health.uptime.seconds >= 0, "seconds should be non-negative");
  });

  it("includes system info with Node version and memory", () => {
    const health = getHealthStatus();
    assert.ok(health.system.nodeVersion.startsWith("v"), "should start with 'v'");
    assert.ok(typeof health.system.platform === "string");
    assert.ok(health.system.memoryRssMb > 0, "RSS should be positive");
    assert.ok(health.system.heapUsedMb > 0, "heap used should be positive");
    assert.ok(health.system.heapTotalMb > 0, "heap total should be positive");
    assert.ok(
      health.system.heapUsedMb <= health.system.heapTotalMb,
      "heapUsed should not exceed heapTotal"
    );
  });

  it("includes app info with environment and mock mode", () => {
    const health = getHealthStatus();
    assert.ok(typeof health.app.environment === "string");
    assert.ok(typeof health.app.mockDataMode === "boolean");
    assert.ok(typeof health.app.totalRequests === "number");
  });

  it("uptime.startedAt is in the past", () => {
    const health = getHealthStatus();
    const started = new Date(health.uptime.startedAt).getTime();
    const now = Date.now();
    assert.ok(started <= now, "startedAt should be in the past");
  });
});

// ─── Request Counter ────────────────────────────────────────────────────────

describe("recordRequest / getRequestCount", () => {
  it("increments the request count", () => {
    const before = getRequestCount();
    recordRequest();
    recordRequest();
    recordRequest();
    const after = getRequestCount();
    assert.equal(after - before, 3, "should have incremented by 3");
  });

  it("reflects in getHealthStatus().app.totalRequests", () => {
    const before = getHealthStatus().app.totalRequests;
    recordRequest();
    const after = getHealthStatus().app.totalRequests;
    assert.equal(after - before, 1);
  });
});
