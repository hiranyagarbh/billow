/**
 * ─── Mock Data Service Tests ─────────────────────────────────────────────────
 *
 * Validates the deterministic mock data generators from mockDataService.ts.
 *
 * Key property under test: the seeded PRNG produces identical output for
 * the same date, ensuring dashboard values don't flicker across refreshes.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateMockCostSummary,
  generateMockDailyCosts,
  generateMockServiceBreakdown,
  generateMockBudget,
} from "../src/services/mockDataService.js";

// ─── generateMockBudget ─────────────────────────────────────────────────────

describe("generateMockBudget", () => {
  it("returns a valid budget config with expected defaults", () => {
    const budget = generateMockBudget();
    assert.equal(budget.monthlyBudget, 150);
    assert.deepEqual(budget.alertThresholds, [50, 75, 90, 100]);
    assert.equal(budget.currency, "USD");
    assert.equal(budget.alertMethod, "email");
  });
});

// ─── generateMockServiceBreakdown ───────────────────────────────────────────

describe("generateMockServiceBreakdown", () => {
  it("returns an array of service costs", () => {
    const services = generateMockServiceBreakdown();
    assert.ok(Array.isArray(services));
    assert.ok(services.length > 0, "should return at least one service");
  });

  it("includes expected AWS service names", () => {
    const services = generateMockServiceBreakdown();
    const names = services.map((s) => s.serviceName);
    assert.ok(names.includes("Amazon EC2"), "should include EC2");
    assert.ok(names.includes("Amazon S3"), "should include S3");
    assert.ok(names.includes("AWS Lambda"), "should include Lambda");
  });

  it("sorts services by cost descending", () => {
    const services = generateMockServiceBreakdown();
    for (let i = 1; i < services.length; i++) {
      assert.ok(
        services[i - 1].cost >= services[i].cost,
        `services should be sorted by cost desc: ${services[i - 1].cost} >= ${services[i].cost}`
      );
    }
  });

  it("has percentages that sum to approximately 100", () => {
    const services = generateMockServiceBreakdown();
    const totalPct = services.reduce((sum, s) => sum + s.percentage, 0);
    assert.ok(
      Math.abs(totalPct - 100) < 1,
      `percentages should sum to ~100, got ${totalPct}`
    );
  });

  it("produces deterministic results (same output on repeated calls)", () => {
    const first = generateMockServiceBreakdown();
    const second = generateMockServiceBreakdown();
    assert.deepEqual(first, second);
  });
});

// ─── generateMockDailyCosts ─────────────────────────────────────────────────

describe("generateMockDailyCosts", () => {
  it("returns one CostRecord per day in the range", () => {
    const records = generateMockDailyCosts("2025-07-01", "2025-07-07");
    assert.equal(records.length, 7, "should have 7 records for a 7-day range");
  });

  it("each record has required fields", () => {
    const records = generateMockDailyCosts("2025-07-01", "2025-07-03");
    for (const record of records) {
      assert.ok(record.date, "record should have a date");
      assert.ok(typeof record.totalCost === "number", "totalCost should be a number");
      assert.equal(record.currency, "USD");
      assert.ok(Array.isArray(record.services), "services should be an array");
      assert.ok(record.services.length > 0, "should have at least one service");
      assert.ok(typeof record.forecastedMonthEnd === "number", "forecastedMonthEnd should be a number");
      assert.ok(record.collectedAt, "should have a collectedAt timestamp");
    }
  });

  it("produces deterministic records for the same date range", () => {
    const first = generateMockDailyCosts("2025-07-01", "2025-07-03");
    const second = generateMockDailyCosts("2025-07-01", "2025-07-03");

    assert.equal(first.length, second.length);
    for (let i = 0; i < first.length; i++) {
      assert.equal(first[i].date, second[i].date);
      assert.equal(first[i].totalCost, second[i].totalCost);
    }
  });

  it("returns an empty array when start > end", () => {
    const records = generateMockDailyCosts("2025-07-10", "2025-07-05");
    assert.equal(records.length, 0);
  });

  it("handles a single-day range", () => {
    const records = generateMockDailyCosts("2025-07-01", "2025-07-01");
    assert.equal(records.length, 1);
    assert.equal(records[0].date, "2025-07-01");
  });
});

// ─── generateMockCostSummary ────────────────────────────────────────────────

describe("generateMockCostSummary", () => {
  it("returns a valid CostSummary object", () => {
    const summary = generateMockCostSummary();

    assert.ok(typeof summary.totalToday === "number");
    assert.ok(typeof summary.totalThisWeek === "number");
    assert.ok(typeof summary.totalThisMonth === "number");
    assert.ok(typeof summary.forecastedMonthEnd === "number");
    assert.ok(typeof summary.budgetUsedPercent === "number");
    assert.ok(Array.isArray(summary.topServices));
    assert.ok(Array.isArray(summary.dailyCosts));
  });

  it("has dailyCosts starting from the first of the current month", () => {
    const summary = generateMockCostSummary();
    // Derive expected first-of-month the same way mockDataService does
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const expectedFirst = first.toISOString().split("T")[0];

    assert.ok(summary.dailyCosts.length > 0);
    assert.equal(summary.dailyCosts[0].date, expectedFirst);
  });

  it("totalThisMonth equals the sum of all dailyCosts", () => {
    const summary = generateMockCostSummary();
    const summedDaily = summary.dailyCosts.reduce((sum, d) => sum + d.cost, 0);
    // Allow small floating-point rounding difference
    assert.ok(
      Math.abs(summary.totalThisMonth - summedDaily) < 0.02,
      `totalThisMonth (${summary.totalThisMonth}) should ≈ sum of dailyCosts (${summedDaily})`
    );
  });

  it("totalToday is a positive number", () => {
    const summary = generateMockCostSummary();
    assert.ok(summary.totalToday > 0, "today's cost should be positive");
  });
});
