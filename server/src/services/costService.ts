/**
 * ─── Cost Service ────────────────────────────────────────────────────────────
 *
 * This is the "brain" for cost data.  It sits between the API routes and
 * the data sources (mock data or DynamoDB).
 *
 * WHY A SERVICE LAYER?
 * ────────────────────
 * Routes should be thin — just parse the request and send a response.
 * All business logic lives here so it's easy to test and reuse.
 *
 * The `config.USE_MOCK_DATA` flag controls which data source is used:
 *   • true  → mockDataService (no AWS needed, great for development)
 *   • false → DynamoDB (real AWS data, needs credentials)
 */

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../config/env.js";
import { docClient } from "../config/dynamodb.js";
import type {
  CostRecord,
  CostSummary,
  DateRange,
  ForecastResult,
  ServiceCost,
} from "../types/cost.js";
import { forecastMonthEnd } from "../utils/forecast.js";
import {
  generateMockCostSummary,
  generateMockDailyCosts,
  generateMockServiceBreakdown,
} from "./mockDataService.js";

// ─── Dashboard Summary ──────────────────────────────────────────────────────

/**
 * Fetches the full cost summary for the dashboard overview page.
 *
 * This powers the main dashboard cards:
 *   • Total today / this week / this month
 *   • Forecasted month-end spend
 *   • Budget usage percentage
 *   • Top services breakdown
 *   • Daily cost chart data
 */
export async function getCostSummary(): Promise<CostSummary> {
  // ── Mock mode: return generated data ────────────────────────────────────
  if (config.USE_MOCK_DATA) {
    return generateMockCostSummary();
  }

  // ── Real mode: query DynamoDB ───────────────────────────────────────────
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstOfMonth = new Date(year, month, 1).toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const records = await fetchCostRecords(firstOfMonth, todayStr);

  // Build daily costs array from records
  const dailyCosts = records.map((r) => ({
    date: r.date,
    cost: r.totalCost,
  }));

  const totalToday = records.find((r) => r.date === todayStr)?.totalCost ?? 0;
  const totalThisMonth = dailyCosts.reduce((sum, d) => sum + d.cost, 0);

  // Calculate this week's total (Monday → today)
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysSinceMonday);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const totalThisWeek = dailyCosts
    .filter((d) => d.date >= weekStartStr)
    .reduce((sum, d) => sum + d.cost, 0);

  const forecast = forecastMonthEnd(dailyCosts);

  // Aggregate services from all records
  const serviceMap = new Map<string, number>();
  for (const record of records) {
    for (const svc of record.services) {
      serviceMap.set(
        svc.serviceName,
        (serviceMap.get(svc.serviceName) ?? 0) + svc.cost
      );
    }
  }
  const totalServiceCost = Array.from(serviceMap.values()).reduce(
    (a, b) => a + b,
    0
  );
  const topServices: ServiceCost[] = Array.from(serviceMap.entries())
    .map(([serviceName, cost]) => ({
      serviceName,
      cost: Math.round(cost * 100) / 100,
      percentage: Math.round((cost / totalServiceCost) * 10000) / 100,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Budget usage — we'll assume $150 default if no budget is configured
  const budgetUsedPercent = Math.round((totalThisMonth / 150) * 10000) / 100;

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

// ─── Daily Costs by Date Range ──────────────────────────────────────────────

/**
 * Returns an array of CostRecords for a given date range.
 *
 * Example: GET /api/costs/daily?start=2024-07-01&end=2024-07-14
 */
export async function getCostsByDateRange(
  range: DateRange
): Promise<CostRecord[]> {
  if (config.USE_MOCK_DATA) {
    return generateMockDailyCosts(range.startDate, range.endDate);
  }
  return fetchCostRecords(range.startDate, range.endDate);
}

// ─── Service Breakdown for Date Range ───────────────────────────────────────

/**
 * Returns aggregated costs per AWS service for a date range.
 * Used to populate the "Cost by Service" pie/bar chart.
 */
export async function getCostsByService(
  range: DateRange
): Promise<ServiceCost[]> {
  if (config.USE_MOCK_DATA) {
    return generateMockServiceBreakdown();
  }

  const records = await fetchCostRecords(range.startDate, range.endDate);
  const serviceMap = new Map<string, number>();

  for (const record of records) {
    for (const svc of record.services) {
      serviceMap.set(
        svc.serviceName,
        (serviceMap.get(svc.serviceName) ?? 0) + svc.cost
      );
    }
  }

  const total = Array.from(serviceMap.values()).reduce((a, b) => a + b, 0);
  return Array.from(serviceMap.entries())
    .map(([serviceName, cost]) => ({
      serviceName,
      cost: Math.round(cost * 100) / 100,
      percentage: total > 0 ? Math.round((cost / total) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost);
}

// ─── Forecast ────────────────────────────────────────────────────────────────

/**
 * Predicts month-end spend based on daily costs so far this month.
 * Uses linear regression (see utils/forecast.ts for the math).
 */
export async function getForecast(): Promise<ForecastResult> {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstOfMonth = new Date(year, month, 1).toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  let dailyCosts: { date: string; cost: number }[];

  if (config.USE_MOCK_DATA) {
    const records = generateMockDailyCosts(firstOfMonth, todayStr);
    dailyCosts = records.map((r) => ({ date: r.date, cost: r.totalCost }));
  } else {
    const records = await fetchCostRecords(firstOfMonth, todayStr);
    dailyCosts = records.map((r) => ({ date: r.date, cost: r.totalCost }));
  }

  return forecastMonthEnd(dailyCosts);
}

// ─── DynamoDB Helper ─────────────────────────────────────────────────────────

/**
 * Queries the DynamoDB costs table for records in a date range.
 *
 * Assumes the table has:
 *   - Partition key: "pk" (value: "COSTS")
 *   - Sort key: "date" (value: "YYYY-MM-DD")
 *
 * This uses a KeyConditionExpression to efficiently query only the
 * dates we need (DynamoDB is optimised for this pattern).
 */
async function fetchCostRecords(
  startDate: string,
  endDate: string
): Promise<CostRecord[]> {
  const command = new QueryCommand({
    TableName: config.DYNAMODB_TABLE_COSTS,
    KeyConditionExpression:
      "pk = :pk AND #date BETWEEN :start AND :end",
    ExpressionAttributeNames: {
      "#date": "date", // "date" is a reserved word in DynamoDB
    },
    ExpressionAttributeValues: {
      ":pk": "COSTS",
      ":start": startDate,
      ":end": endDate,
    },
  });

  const result = await docClient.send(command);
  return (result.Items ?? []) as CostRecord[];
}
