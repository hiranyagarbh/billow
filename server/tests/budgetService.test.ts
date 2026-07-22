/**
 * ─── Budget Service Tests ────────────────────────────────────────────────────
 *
 * Covers checkBudgetAlerts() from services/budgetService.ts.
 *
 * This is the only pure function in the service layer that doesn't
 * require mocking DynamoDB or module-level state, making it ideal
 * for straightforward unit testing.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkBudgetAlerts } from "../src/services/budgetService.js";
import type { BudgetConfig } from "../src/types/cost.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Standard test budget: $150/month, alerts at 50%, 75%, 90%, 100% */
function makeBudget(overrides?: Partial<BudgetConfig>): BudgetConfig {
  return {
    monthlyBudget: 150,
    alertThresholds: [50, 75, 90, 100],
    currency: "USD",
    alertMethod: "email",
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("checkBudgetAlerts", () => {
  it("returns no alerts when spend is below all thresholds", () => {
    const budget = makeBudget();
    // 30% of 150 = $45 → below the 50% threshold
    const alerts = checkBudgetAlerts(45, budget);
    assert.equal(alerts.length, 0);
  });

  it("returns one alert when exactly at the 50% threshold", () => {
    const budget = makeBudget();
    // 50% of 150 = $75
    const alerts = checkBudgetAlerts(75, budget);
    assert.equal(alerts.length, 1);
    assert.ok(alerts[0].includes("50%"), "alert should mention 50% threshold");
  });

  it("returns multiple alerts when spend crosses several thresholds", () => {
    const budget = makeBudget();
    // 80% of 150 = $120 → crosses 50% and 75%
    const alerts = checkBudgetAlerts(120, budget);
    assert.equal(alerts.length, 2);
    assert.ok(alerts[0].includes("50%"));
    assert.ok(alerts[1].includes("75%"));
  });

  it("includes OVER BUDGET warning when spend reaches 100%", () => {
    const budget = makeBudget();
    // 100% of 150 = $150
    const alerts = checkBudgetAlerts(150, budget);
    // Should cross 50%, 75%, 90%, and 100%
    assert.equal(alerts.length, 4);
    assert.ok(
      alerts[3].includes("OVER BUDGET"),
      "100% alert should say OVER BUDGET"
    );
  });

  it("handles over-budget spend (>100%)", () => {
    const budget = makeBudget();
    // 133% of 150 = $200
    const alerts = checkBudgetAlerts(200, budget);
    assert.equal(alerts.length, 4);
    assert.ok(alerts[3].includes("OVER BUDGET"));
    assert.ok(alerts[3].includes("$200.00"));
  });

  it("returns no alerts when thresholds array is empty", () => {
    const budget = makeBudget({ alertThresholds: [] });
    const alerts = checkBudgetAlerts(200, budget);
    assert.equal(alerts.length, 0);
  });

  it("handles a single threshold", () => {
    const budget = makeBudget({ alertThresholds: [80] });
    // 90% of 150 = $135 → crosses 80%
    const alerts = checkBudgetAlerts(135, budget);
    assert.equal(alerts.length, 1);
    assert.ok(alerts[0].includes("80%"));
  });

  it("includes dollar amounts in alert messages", () => {
    const budget = makeBudget();
    const alerts = checkBudgetAlerts(120, budget);
    // Both alerts should contain the spend and budget amounts
    for (const alert of alerts) {
      assert.ok(alert.includes("$120.00"), "alert should include current spend");
      assert.ok(alert.includes("$150.00"), "alert should include budget limit");
    }
  });

  it("handles zero budget without crashing", () => {
    const budget = makeBudget({ monthlyBudget: 0 });
    // Division by zero edge — usagePercent = Infinity
    assert.doesNotThrow(() => {
      checkBudgetAlerts(10, budget);
    });
  });
});
