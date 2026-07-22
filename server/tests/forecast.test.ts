/**
 * ─── Forecast Utility Tests ──────────────────────────────────────────────────
 *
 * Covers linearRegression() and forecastMonthEnd() from utils/forecast.ts.
 *
 * Uses the built-in Node.js test runner (node:test + node:assert).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { linearRegression, forecastMonthEnd } from "../src/utils/forecast.js";

// ─── linearRegression ───────────────────────────────────────────────────────

describe("linearRegression", () => {
  it("returns zero slope and intercept for empty input", () => {
    const result = linearRegression([]);
    assert.equal(result.slope, 0);
    assert.equal(result.intercept, 0);
    assert.equal(result.rSquared, 0);
  });

  it("returns the point value as intercept for a single point", () => {
    const result = linearRegression([{ x: 1, y: 42 }]);
    assert.equal(result.slope, 0);
    assert.equal(result.intercept, 42);
    assert.equal(result.rSquared, 0);
  });

  it("computes a perfect fit for two collinear points", () => {
    // Line: y = 2x + 1  →  (1, 3) and (2, 5)
    const result = linearRegression([
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ]);
    assert.ok(Math.abs(result.slope - 2) < 0.0001, `slope should be 2, got ${result.slope}`);
    assert.ok(Math.abs(result.intercept - 1) < 0.0001, `intercept should be 1, got ${result.intercept}`);
    assert.ok(Math.abs(result.rSquared - 1) < 0.0001, `R² should be 1, got ${result.rSquared}`);
  });

  it("computes correct regression for a perfect linear dataset", () => {
    // y = 3x + 10
    const points = [1, 2, 3, 4, 5].map((x) => ({ x, y: 3 * x + 10 }));
    const result = linearRegression(points);

    assert.ok(Math.abs(result.slope - 3) < 0.0001);
    assert.ok(Math.abs(result.intercept - 10) < 0.0001);
    assert.ok(Math.abs(result.rSquared - 1) < 0.0001);
  });

  it("returns R² < 1 for noisy data", () => {
    // Near-linear with some noise
    const points = [
      { x: 1, y: 2.1 },
      { x: 2, y: 3.9 },
      { x: 3, y: 6.2 },
      { x: 4, y: 7.8 },
      { x: 5, y: 10.1 },
    ];
    const result = linearRegression(points);

    // Slope should be roughly 2
    assert.ok(result.slope > 1.5 && result.slope < 2.5, `slope ~2, got ${result.slope}`);
    // R² should be close to 1 but not perfect
    assert.ok(result.rSquared > 0.95 && result.rSquared < 1, `R² ~0.99, got ${result.rSquared}`);
  });

  it("handles all identical x values (vertical line)", () => {
    const points = [
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
    ];
    const result = linearRegression(points);
    assert.equal(result.slope, 0, "slope should be 0 when all x are equal");
  });

  it("handles all identical y values (horizontal line)", () => {
    const points = [
      { x: 1, y: 7 },
      { x: 2, y: 7 },
      { x: 3, y: 7 },
    ];
    const result = linearRegression(points);
    assert.ok(Math.abs(result.slope) < 0.0001, "slope should be ~0");
    assert.ok(Math.abs(result.intercept - 7) < 0.0001, "intercept should be 7");
    assert.equal(result.rSquared, 1, "R² should be 1 for constant y");
  });
});

// ─── forecastMonthEnd ───────────────────────────────────────────────────────

describe("forecastMonthEnd", () => {
  it("returns zero prediction with low confidence for empty data", () => {
    const result = forecastMonthEnd([]);
    assert.equal(result.predictedMonthEnd, 0);
    assert.equal(result.confidence, "low");
    assert.equal(result.daysOfData, 0);
  });

  it("uses simple average for fewer than 3 days of data", () => {
    // 2 days in July → average extrapolated to 31 days
    const result = forecastMonthEnd([
      { date: "2025-07-01", cost: 10 },
      { date: "2025-07-02", cost: 10 },
    ]);

    // Average = 10, days in July = 31, predicted = 310
    assert.equal(result.predictedMonthEnd, 310);
    assert.equal(result.confidence, "low");
    assert.equal(result.daysOfData, 2);
  });

  it("uses simple average for exactly 1 day of data", () => {
    const result = forecastMonthEnd([{ date: "2025-07-01", cost: 5 }]);
    // 5 * 31 = 155
    assert.equal(result.predictedMonthEnd, 155);
    assert.equal(result.confidence, "low");
    assert.equal(result.daysOfData, 1);
  });

  it("uses regression for 3+ days and returns medium/high confidence", () => {
    // Steady $10/day for 10 days in July
    const costs = Array.from({ length: 10 }, (_, i) => ({
      date: `2025-07-${String(i + 1).padStart(2, "0")}`,
      cost: 10,
    }));

    const result = forecastMonthEnd(costs);

    // ~$310 (10/day × 31 days) — regression on cumulative data
    assert.ok(
      result.predictedMonthEnd > 280 && result.predictedMonthEnd < 340,
      `expected ~310, got ${result.predictedMonthEnd}`
    );
    assert.ok(
      result.confidence === "medium" || result.confidence === "high",
      `expected medium or high confidence, got ${result.confidence}`
    );
    assert.equal(result.daysOfData, 10);
  });

  it("never returns a negative prediction", () => {
    // Declining costs that could extrapolate below zero
    const costs = [
      { date: "2025-07-01", cost: 100 },
      { date: "2025-07-02", cost: 50 },
      { date: "2025-07-03", cost: 10 },
      { date: "2025-07-04", cost: 1 },
    ];

    const result = forecastMonthEnd(costs);
    assert.ok(result.predictedMonthEnd >= 0, "prediction must not be negative");
  });

  it("handles February correctly (28 days)", () => {
    const costs = Array.from({ length: 5 }, (_, i) => ({
      date: `2025-02-${String(i + 1).padStart(2, "0")}`,
      cost: 10,
    }));

    const result = forecastMonthEnd(costs);
    // Should extrapolate to ~28 days, not 30 or 31
    assert.ok(
      result.predictedMonthEnd < 350,
      `February prediction should be < 350, got ${result.predictedMonthEnd}`
    );
  });
});
