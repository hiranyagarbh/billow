/**
 * ─── Forecasting Utilities ───────────────────────────────────────────────────
 *
 * This module predicts how much you'll spend by the end of the month using
 * **linear regression** — a simple but effective statistical technique.
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  WHAT IS LINEAR REGRESSION?                                        ║
 * ║                                                                    ║
 * ║  Imagine plotting your cumulative daily spend on a graph:           ║
 * ║                                                                    ║
 * ║    $│          ╱                                                    ║
 * ║     │        ╱                                                     ║
 * ║     │      ╱     ← best-fit line                                   ║
 * ║     │    ╱                                                         ║
 * ║     │  ╱                                                           ║
 * ║     │╱                                                             ║
 * ║     └──────────── days →                                           ║
 * ║                                                                    ║
 * ║  Linear regression finds the straight line that best fits your     ║
 * ║  data points.  We then extend that line to day 30 (or 31) to      ║
 * ║  predict where you'll end up.                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import type { ForecastResult } from "../types/cost.js";

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single (x, y) data point for regression. */
interface Point {
  x: number;
  y: number;
}

/** Everything the regression returns. */
interface RegressionResult {
  /** How steep the line is (dollars per day) */
  slope: number;

  /** Where the line crosses the Y axis */
  intercept: number;

  /**
   * R² (R-squared) — a number between 0 and 1 that tells you how well
   * the line fits the data.
   *   0.0 = terrible fit (data is basically random)
   *   1.0 = perfect fit  (every point sits exactly on the line)
   *
   * In practice:
   *   > 0.8  → great, our prediction is solid
   *   0.5–0.8 → decent, but take it with a grain of salt
   *   < 0.5  → poor, the trend isn't clear
   */
  rSquared: number;
}

// ─── Linear Regression ──────────────────────────────────────────────────────

/**
 * Performs **Ordinary Least Squares (OLS)** linear regression.
 *
 * MATH WALKTHROUGH (don't worry, it's simpler than it sounds):
 *
 * We want to find the line  y = slope * x + intercept  that minimises
 * the sum of squared vertical distances from each point to the line.
 *
 * Given n data points (x₁,y₁), (x₂,y₂), … , (xₙ,yₙ):
 *
 *   1. Compute means:
 *        x̄ = (x₁ + x₂ + … + xₙ) / n
 *        ȳ = (y₁ + y₂ + … + yₙ) / n
 *
 *   2. Slope (how steep the line is):
 *        slope = Σ[(xᵢ − x̄)(yᵢ − ȳ)]  /  Σ[(xᵢ − x̄)²]
 *
 *        Numerator:   for each point, multiply how far it is from the
 *                     average x by how far it is from the average y,
 *                     then sum those products up.
 *
 *        Denominator: for each point, square how far it is from the
 *                     average x, then sum those up.
 *
 *   3. Intercept (where the line crosses y=0):
 *        intercept = ȳ − slope * x̄
 *
 *   4. R² (goodness of fit):
 *        SS_res = Σ[(yᵢ − ŷᵢ)²]           (residual: actual vs predicted)
 *        SS_tot = Σ[(yᵢ − ȳ)²]            (total: actual vs mean)
 *        R²     = 1 − (SS_res / SS_tot)
 *
 * @param points - Array of {x, y} data points (must have at least 2)
 * @returns slope, intercept, and R² of the best-fit line
 */
export function linearRegression(points: Point[]): RegressionResult {
  const n = points.length;

  // Edge case: can't draw a line through fewer than 2 points
  if (n < 2) {
    return { slope: 0, intercept: points[0]?.y ?? 0, rSquared: 0 };
  }

  // ── Step 1: Calculate the means (averages) ──────────────────────────────
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  // ── Step 2: Calculate slope ─────────────────────────────────────────────
  let numerator = 0;   // Σ[(xᵢ − x̄)(yᵢ − ȳ)]
  let denominator = 0;  // Σ[(xᵢ − x̄)²]
  for (const p of points) {
    const dx = p.x - meanX; // how far this x is from the average x
    const dy = p.y - meanY; // how far this y is from the average y
    numerator += dx * dy;
    denominator += dx * dx;
  }

  // If denominator is 0, all x values are the same → can't determine slope
  const slope = denominator === 0 ? 0 : numerator / denominator;

  // ── Step 3: Calculate intercept ─────────────────────────────────────────
  const intercept = meanY - slope * meanX;

  // ── Step 4: Calculate R² ────────────────────────────────────────────────
  let ssRes = 0; // sum of squared residuals (prediction errors)
  let ssTot = 0; // total sum of squares (deviation from mean)
  for (const p of points) {
    const predicted = slope * p.x + intercept; // ŷᵢ = what our line predicts
    ssRes += (p.y - predicted) ** 2;           // (actual − predicted)²
    ssTot += (p.y - meanY) ** 2;               // (actual − mean)²
  }

  // R² = 1 means perfect fit; 0 means no better than guessing the mean
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared };
}

// ─── Forecast Month-End Spend ────────────────────────────────────────────────

/**
 * Predicts the total spend by the end of the current month.
 *
 * STRATEGY:
 *   1. Convert daily costs into cumulative costs.
 *      Day 1: $5        → cumulative $5
 *      Day 2: $7        → cumulative $12
 *      Day 3: $6        → cumulative $18
 *
 *   2. Run linear regression on (dayNumber, cumulativeCost).
 *
 *   3. Use the regression line to predict the value at the last day
 *      of the month (day 28, 29, 30, or 31).
 *
 *   4. If we have fewer than 3 days of data, regression is unreliable,
 *      so we fall back to a simple approach:
 *        average daily cost × days in month
 *
 * @param dailyCosts - Array of { date: 'YYYY-MM-DD', cost: number }
 *                     representing daily costs so far this month
 * @returns ForecastResult with predicted month-end spend and confidence
 */
export function forecastMonthEnd(
  dailyCosts: { date: string; cost: number }[]
): ForecastResult {
  const daysOfData = dailyCosts.length;

  // ── No data at all ──────────────────────────────────────────────────────
  if (daysOfData === 0) {
    return { predictedMonthEnd: 0, confidence: "low", daysOfData: 0 };
  }

  // ── Figure out how many days are in this month ──────────────────────────
  // Parse the first date to find the month/year
  const firstDate = new Date(dailyCosts[0].date);
  const year = firstDate.getFullYear();
  const month = firstDate.getMonth(); // 0-indexed (Jan=0, Feb=1, …)

  // Trick: day 0 of the NEXT month gives us the last day of THIS month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // ── Fewer than 3 days → use simple average ──────────────────────────────
  if (daysOfData < 3) {
    const totalSoFar = dailyCosts.reduce((sum, d) => sum + d.cost, 0);
    const avgPerDay = totalSoFar / daysOfData;
    const predicted = avgPerDay * daysInMonth;

    return {
      predictedMonthEnd: Math.round(predicted * 100) / 100,
      confidence: "low",
      daysOfData,
    };
  }

  // ── Build cumulative cost data points ───────────────────────────────────
  // Sort by date just in case they're out of order
  const sorted = [...dailyCosts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let cumulative = 0;
  const points: Point[] = sorted.map((d, index) => {
    cumulative += d.cost;
    return {
      x: index + 1,  // day number (1, 2, 3, …)
      y: cumulative,  // running total ($5, $12, $18, …)
    };
  });

  // ── Run linear regression ───────────────────────────────────────────────
  const { slope, intercept, rSquared } = linearRegression(points);

  // Predict: plug in the last day of the month
  const predicted = slope * daysInMonth + intercept;

  // ── Determine confidence ────────────────────────────────────────────────
  // Based on both how well the line fits (R²) and how much data we have
  let confidence: ForecastResult["confidence"];
  if (rSquared > 0.8 && daysOfData >= 15) {
    confidence = "high";
  } else if (rSquared > 0.5 && daysOfData >= 5) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    // Make sure we don't predict a negative spend (doesn't make sense)
    predictedMonthEnd: Math.max(0, Math.round(predicted * 100) / 100),
    confidence,
    daysOfData,
  };
}
