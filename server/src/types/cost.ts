/**
 * ─── Cost & Budget Type Definitions ──────────────────────────────────────────
 *
 * These TypeScript interfaces define the "shape" of every piece of data
 * flowing through the Billow backend.  Think of them as blueprints:
 *
 *   • They don't produce any JavaScript at runtime (interfaces are erased).
 *   • They DO make the compiler check that every object matches the shape.
 *   • They give you autocomplete in your editor — huge productivity win!
 *
 * TIP: If you're new to TypeScript, hover over any field name in VS Code
 *      to see its type and JSDoc comment.
 */

// ─── Per-service cost for a single day ───────────────────────────────────────

/** One row in the "cost by service" breakdown. */
export interface ServiceCost {
  /** AWS service name, e.g. "Amazon EC2" */
  serviceName: string;

  /** Dollar amount for this service */
  cost: number;

  /** What percentage of the day's total this service represents (0-100) */
  percentage: number;
}

// ─── Daily cost snapshot ─────────────────────────────────────────────────────

/** A single day's cost record — what we store in DynamoDB. */
export interface CostRecord {
  /** Calendar date in YYYY-MM-DD format */
  date: string;

  /** Sum of all service costs for this day */
  totalCost: number;

  /** Currency code, usually "USD" */
  currency: string;

  /** Breakdown by AWS service */
  services: ServiceCost[];

  /** Predicted total spend by month end (in dollars) */
  forecastedMonthEnd: number;

  /** When this record was collected — ISO 8601 timestamp */
  collectedAt: string;
}

// ─── Budget configuration ────────────────────────────────────────────────────

/** User-configurable monthly budget + alert rules. */
export interface BudgetConfig {
  /** Maximum monthly spend the user is comfortable with */
  monthlyBudget: number;

  /**
   * Alert at these percentages of the budget.
   * Example: [50, 75, 90, 100] → alert at 50%, 75%, 90%, and 100%.
   */
  alertThresholds: number[];

  /** Currency code, usually "USD" */
  currency: string;

  /** How the user wants to receive budget alerts */
  alertMethod: "email" | "telegram" | "both";
}

// ─── Dashboard summary ──────────────────────────────────────────────────────

/**
 * The "big picture" object sent to the React dashboard.
 * Contains everything the frontend needs for the overview page.
 */
export interface CostSummary {
  /** Cost for today so far */
  totalToday: number;

  /** Cost for the current calendar week (Mon–Sun) */
  totalThisWeek: number;

  /** Cost for the current calendar month */
  totalThisMonth: number;

  /** Predicted total spend by month end */
  forecastedMonthEnd: number;

  /** How much of the monthly budget has been used (0–100+) */
  budgetUsedPercent: number;

  /** Top services ranked by cost */
  topServices: ServiceCost[];

  /** Day-by-day cost array for the sparkline / bar chart */
  dailyCosts: { date: string; cost: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Simple date range for query parameters. */
export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/** Result from the linear regression forecasting engine. */
export interface ForecastResult {
  /** Dollar amount predicted by month end */
  predictedMonthEnd: number;

  /**
   * How much to trust this number:
   *   - 'low'    → fewer than 5 days of data or poor fit
   *   - 'medium' → decent fit with 5-15 days
   *   - 'high'   → good fit with 15+ days
   */
  confidence: "low" | "medium" | "high";

  /** How many days of data were used in the prediction */
  daysOfData: number;
}
