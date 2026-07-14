/**
 * ─── Budget Service ──────────────────────────────────────────────────────────
 *
 * Manages the user's monthly budget configuration and alert thresholds.
 *
 * Three main responsibilities:
 *   1. getBudget()          — Retrieve the current budget config
 *   2. updateBudget()       — Save a new budget config
 *   3. checkBudgetAlerts()  — See if current spend exceeds any thresholds
 *
 * Like costService, this switches between mock data and DynamoDB
 * based on the USE_MOCK_DATA config flag.
 */

import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../config/env.js";
import { docClient } from "../config/dynamodb.js";
import type { BudgetConfig } from "../types/cost.js";
import { generateMockBudget } from "./mockDataService.js";

// ─── In-memory budget for mock mode ─────────────────────────────────────────
// When running with mock data we store the budget in memory.
// It resets every time the server restarts — that's fine for development.
let mockBudget: BudgetConfig | null = null;

// ─── Get Budget ──────────────────────────────────────────────────────────────

/**
 * Retrieves the current budget configuration.
 *
 * • Mock mode:  Returns a default budget (or one that was previously set
 *               via updateBudget during this server session).
 * • Real mode:  Fetches from DynamoDB.
 */
export async function getBudget(): Promise<BudgetConfig> {
  if (config.USE_MOCK_DATA) {
    // Return the in-memory budget if it's been set, otherwise default
    return mockBudget ?? generateMockBudget();
  }

  // ── DynamoDB lookup ─────────────────────────────────────────────────────
  const command = new GetCommand({
    TableName: config.DYNAMODB_TABLE_BUDGET,
    Key: { pk: "BUDGET", sk: "CONFIG" },
  });

  const result = await docClient.send(command);

  if (!result.Item) {
    // No budget configured yet — return defaults
    return generateMockBudget();
  }

  return result.Item as BudgetConfig;
}

// ─── Update Budget ───────────────────────────────────────────────────────────

/**
 * Saves a new budget configuration.
 *
 * • Mock mode:  Stores in the module-level `mockBudget` variable.
 * • Real mode:  Writes to DynamoDB.
 *
 * @param budgetConfig - The new budget settings to save
 */
export async function updateBudget(
  budgetConfig: BudgetConfig
): Promise<BudgetConfig> {
  if (config.USE_MOCK_DATA) {
    // Just store in memory — will reset on server restart
    mockBudget = { ...budgetConfig };
    return mockBudget;
  }

  // ── DynamoDB write ──────────────────────────────────────────────────────
  const command = new PutCommand({
    TableName: config.DYNAMODB_TABLE_BUDGET,
    Item: {
      pk: "BUDGET",
      sk: "CONFIG",
      ...budgetConfig,
    },
  });

  await docClient.send(command);
  return budgetConfig;
}

// ─── Check Budget Alerts ─────────────────────────────────────────────────────

/**
 * Checks if the current month's spending has crossed any alert thresholds.
 *
 * Example:
 *   Budget: $150, Thresholds: [50, 75, 90, 100], Current Spend: $120
 *
 *   Usage = 120/150 = 80%
 *   → Crossed 50% ✓  (alert!)
 *   → Crossed 75% ✓  (alert!)
 *   → Crossed 90% ✗  (not yet)
 *   → Crossed 100% ✗ (not yet)
 *
 * Returns an array of human-readable alert messages.
 *
 * @param currentSpend - How much has been spent this month so far
 * @param budget       - The user's budget configuration
 * @returns Array of alert messages (empty if no thresholds exceeded)
 */
export function checkBudgetAlerts(
  currentSpend: number,
  budget: BudgetConfig
): string[] {
  const alerts: string[] = [];

  // Calculate what percentage of the budget has been used
  const usagePercent = (currentSpend / budget.monthlyBudget) * 100;

  // Check each threshold
  for (const threshold of budget.alertThresholds) {
    if (usagePercent >= threshold) {
      if (threshold >= 100) {
        // Over budget — this is a big deal!
        alerts.push(
          `🚨 OVER BUDGET! You've spent $${currentSpend.toFixed(2)} ` +
            `of your $${budget.monthlyBudget.toFixed(2)} monthly budget ` +
            `(${usagePercent.toFixed(1)}%).`
        );
      } else {
        alerts.push(
          `⚠️ Budget alert: ${threshold}% threshold reached. ` +
            `$${currentSpend.toFixed(2)} of $${budget.monthlyBudget.toFixed(2)} ` +
            `(${usagePercent.toFixed(1)}% used).`
        );
      }
    }
  }

  return alerts;
}
