/**
 * ─── Mock Data Service ───────────────────────────────────────────────────────
 *
 * Generates realistic-looking AWS cost data for local development and demos.
 * No AWS credentials needed!
 *
 * KEY DESIGN DECISION — DETERMINISTIC RANDOMNESS:
 * ────────────────────────────────────────────────
 * We use a "seeded" pseudo-random number generator (PRNG) instead of
 * Math.random().  This means the same date always produces the same cost
 * values — your dashboard won't flicker with different numbers on every
 * refresh.  The seed is derived from the date string.
 *
 * The PRNG algorithm used here is a simple "mulberry32" — a fast 32-bit
 * generator that's perfectly fine for generating demo data (NOT for crypto!).
 */

import type {
  BudgetConfig,
  CostRecord,
  CostSummary,
  ServiceCost,
} from "../types/cost.js";
import { forecastMonthEnd } from "../utils/forecast.js";

// ─── Seeded Random Number Generator ─────────────────────────────────────────

/**
 * Converts a string into a 32-bit hash number.
 * This is how we turn a date like "2024-07-14" into a seed for our PRNG.
 *
 * The algorithm (djb2) works by:
 *   1. Start with a magic number (5381)
 *   2. For each character, multiply the hash by 33 and add the char code
 *   3. Use bitwise OR to keep it a 32-bit integer
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // convert to unsigned 32-bit
}

/**
 * Mulberry32 — a tiny, fast PRNG that produces repeatable sequences.
 *
 * Usage:
 *   const rand = createSeededRandom("2024-07-14");
 *   rand();  // always 0.7312...  for this seed
 *   rand();  // always 0.1284...  (second call)
 *
 * @param seed - A string to derive the random seed from
 * @returns A function that returns a pseudo-random number in [0, 1)
 */
function createSeededRandom(seed: string): () => number {
  let state = hashString(seed);
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a random number between `min` and `max` using the seeded PRNG.
 */
function seededRange(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

// ─── AWS Service Definitions ────────────────────────────────────────────────

/**
 * Realistic AWS service cost ranges (per day, in USD).
 * These are typical for a small-to-medium side project or startup.
 */
const AWS_SERVICES = [
  { name: "Amazon EC2",          minCost: 2.0,  maxCost: 5.0  },
  { name: "Amazon S3",           minCost: 0.5,  maxCost: 1.5  },
  { name: "AWS Lambda",          minCost: 0.1,  maxCost: 0.5  },
  { name: "Amazon DynamoDB",     minCost: 0.3,  maxCost: 0.8  },
  { name: "Amazon CloudFront",   minCost: 0.2,  maxCost: 0.6  },
  { name: "Amazon RDS",          minCost: 1.0,  maxCost: 3.0  },
  { name: "Amazon API Gateway",  minCost: 0.05, maxCost: 0.2  },
  { name: "Amazon CloudWatch",   minCost: 0.1,  maxCost: 0.3  },
] as const;

// ─── Helper: Generate costs for a single date ──────────────────────────────

/**
 * Creates a ServiceCost[] array for one day.
 *
 * Weekday costs are ~20% higher than weekends to simulate real traffic
 * patterns (more users = more compute = higher costs on workdays).
 */
function generateDayCosts(dateStr: string): ServiceCost[] {
  const rand = createSeededRandom(dateStr);
  const dayOfWeek = new Date(dateStr).getDay(); // 0=Sun, 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Weekdays are busier → slightly higher costs
  const weekdayMultiplier = isWeekend ? 0.8 : 1.0;

  // Generate cost for each AWS service
  const services: ServiceCost[] = AWS_SERVICES.map((svc) => {
    const baseCost = seededRange(rand, svc.minCost, svc.maxCost);
    // Add some daily "jitter" (±15%) so costs aren't boringly smooth
    const jitter = 1 + seededRange(rand, -0.15, 0.15);
    const cost = Math.round(baseCost * weekdayMultiplier * jitter * 100) / 100;
    return {
      serviceName: svc.name,
      cost,
      percentage: 0, // we'll calculate this after totalling
    };
  });

  // Calculate total and fill in percentages
  const total = services.reduce((sum, s) => sum + s.cost, 0);
  for (const svc of services) {
    svc.percentage = Math.round((svc.cost / total) * 10000) / 100; // 2 decimal places
  }

  // Sort by cost descending (biggest spenders first)
  services.sort((a, b) => b.cost - a.cost);

  return services;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generates a full CostSummary for the dashboard overview.
 *
 * This is the main function the frontend calls to populate:
 *   • The "spent today / this week / this month" cards
 *   • The daily cost chart
 *   • The top services list
 *   • The forecast widget
 */
export function generateMockCostSummary(): CostSummary {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // ── Generate daily costs for the current month so far ──────────────────
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstOfMonth = new Date(year, month, 1);

  const dailyCosts: { date: string; cost: number }[] = [];
  const cursor = new Date(firstOfMonth);

  while (cursor <= today) {
    const dateStr = cursor.toISOString().split("T")[0];
    const services = generateDayCosts(dateStr);
    const dayCost = services.reduce((sum, s) => sum + s.cost, 0);
    dailyCosts.push({
      date: dateStr,
      cost: Math.round(dayCost * 100) / 100,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // ── Calculate summary values ───────────────────────────────────────────
  const totalToday = dailyCosts[dailyCosts.length - 1]?.cost ?? 0;
  const totalThisMonth = dailyCosts.reduce((sum, d) => sum + d.cost, 0);

  // This week (Monday → today)
  const dayOfWeek = today.getDay();
  // In JS, Sunday=0, Monday=1 … Saturday=6.  We want Monday as start.
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysSinceMonday);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const totalThisWeek = dailyCosts
    .filter((d) => d.date >= weekStartStr)
    .reduce((sum, d) => sum + d.cost, 0);

  // ── Forecast ───────────────────────────────────────────────────────────
  const forecast = forecastMonthEnd(dailyCosts);

  // ── Top services (aggregate for the month) ─────────────────────────────
  const topServices = generateMockServiceBreakdown();

  // ── Budget usage ───────────────────────────────────────────────────────
  const budget = generateMockBudget();
  const budgetUsedPercent =
    Math.round((totalThisMonth / budget.monthlyBudget) * 10000) / 100;

  return {
    totalToday: Math.round(totalToday * 100) / 100,
    totalThisWeek: Math.round(totalThisWeek * 100) / 100,
    totalThisMonth: Math.round(totalThisMonth * 100) / 100,
    forecastedMonthEnd: forecast.predictedMonthEnd,
    budgetUsedPercent,
    topServices,
    dailyCosts,
  };
}

/**
 * Generates CostRecord[] for a date range.
 * Used by the "daily costs" API endpoint.
 */
export function generateMockDailyCosts(
  startDate: string,
  endDate: string
): CostRecord[] {
  const records: CostRecord[] = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);

  while (cursor <= end) {
    const dateStr = cursor.toISOString().split("T")[0];
    const services = generateDayCosts(dateStr);
    const totalCost = services.reduce((sum, s) => sum + s.cost, 0);

    // Build cumulative costs up to this day for forecast
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthDailyCosts: { date: string; cost: number }[] = [];
    const inner = new Date(monthStart);
    while (inner <= cursor) {
      const innerDate = inner.toISOString().split("T")[0];
      const innerServices = generateDayCosts(innerDate);
      const innerTotal = innerServices.reduce((sum, s) => sum + s.cost, 0);
      monthDailyCosts.push({ date: innerDate, cost: innerTotal });
      inner.setDate(inner.getDate() + 1);
    }
    const forecast = forecastMonthEnd(monthDailyCosts);

    records.push({
      date: dateStr,
      totalCost: Math.round(totalCost * 100) / 100,
      currency: "USD",
      services,
      forecastedMonthEnd: forecast.predictedMonthEnd,
      collectedAt: new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate(),
        23, 59, 59
      ).toISOString(),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return records;
}

/**
 * Aggregated service breakdown for the current month.
 * Sums up each service's cost across all days this month.
 */
export function generateMockServiceBreakdown(): ServiceCost[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Accumulate per-service costs for the month
  const serviceMap = new Map<string, number>();

  const cursor = new Date(year, month, 1);
  while (cursor <= today) {
    const dateStr = cursor.toISOString().split("T")[0];
    const dayCosts = generateDayCosts(dateStr);
    for (const svc of dayCosts) {
      serviceMap.set(
        svc.serviceName,
        (serviceMap.get(svc.serviceName) ?? 0) + svc.cost
      );
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Convert map to sorted array
  const total = Array.from(serviceMap.values()).reduce((a, b) => a + b, 0);
  const result: ServiceCost[] = Array.from(serviceMap.entries())
    .map(([serviceName, cost]) => ({
      serviceName,
      cost: Math.round(cost * 100) / 100,
      percentage: Math.round((cost / total) * 10000) / 100,
    }))
    .sort((a, b) => b.cost - a.cost);

  return result;
}

/**
 * Returns a default budget configuration.
 * Monthly budget of $150 with alerts at 50%, 75%, 90%, and 100%.
 */
export function generateMockBudget(): BudgetConfig {
  return {
    monthlyBudget: 150,
    alertThresholds: [50, 75, 90, 100],
    currency: "USD",
    alertMethod: "email",
  };
}
