/**
 * ─── Cost Routes ─────────────────────────────────────────────────────────────
 *
 * API endpoints for fetching AWS cost data.
 *
 * ROUTES:
 *   GET  /api/costs/summary       → Dashboard overview data
 *   GET  /api/costs/daily         → Daily costs for a date range
 *   GET  /api/costs/by-service    → Costs aggregated by AWS service
 *   GET  /api/costs/forecast      → Month-end spend prediction
 *
 * VALIDATION:
 * ──────────
 * We use "zod" to validate query parameters.  Zod is a library that lets
 * you define a "schema" (the expected shape of data) and then check if
 * incoming data matches.  If it doesn't, Zod throws a ZodError with
 * helpful messages about what went wrong.
 *
 * WHY VALIDATE?
 * If someone sends `?start=banana` instead of `?start=2024-07-01`, we
 * want to return a clear 400 error, not crash or return garbage data.
 */

import { Router } from "express";
import { z } from "zod";
import {
  getCostSummary,
  getCostsByDateRange,
  getCostsByService,
  getForecast,
} from "../services/costService.js";

// ── Create a new Express Router ──────────────────────────────────────────────
// Think of a Router as a "mini Express app" that handles a group of related
// routes.  We'll mount this on "/api/costs" in the main routes/index.ts file.
const router = Router();

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

/**
 * Schema for date range query parameters.
 *
 * z.string().regex(...) means "must be a string matching this pattern".
 * The pattern /^\d{4}-\d{2}-\d{2}$/ matches YYYY-MM-DD format.
 */
const dateRangeSchema = z.object({
  start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD format"),
  end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD format"),
});

// ─── GET /api/costs/summary ──────────────────────────────────────────────────

/**
 * Returns the full cost summary for the dashboard overview.
 *
 * No parameters needed — it automatically uses the current month.
 *
 * Response body: CostSummary
 */
router.get("/summary", async (_req, res, next) => {
  try {
    const summary = await getCostSummary();
    res.json(summary);
  } catch (error) {
    // Pass the error to the global error handler middleware
    next(error);
  }
});

// ─── GET /api/costs/daily ────────────────────────────────────────────────────

/**
 * Returns daily CostRecords for a date range.
 *
 * Query params:
 *   ?start=2024-07-01&end=2024-07-14
 *
 * Response body: CostRecord[]
 */
router.get("/daily", async (req, res, next) => {
  try {
    // Validate query parameters using our Zod schema
    // .parse() will throw a ZodError if validation fails
    const { start, end } = dateRangeSchema.parse(req.query);

    const records = await getCostsByDateRange({
      startDate: start,
      endDate: end,
    });

    res.json(records);
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/costs/by-service ───────────────────────────────────────────────

/**
 * Returns costs aggregated by AWS service for a date range.
 *
 * Query params:
 *   ?start=2024-07-01&end=2024-07-14
 *
 * Response body: ServiceCost[]
 */
router.get("/by-service", async (req, res, next) => {
  try {
    const { start, end } = dateRangeSchema.parse(req.query);

    const services = await getCostsByService({
      startDate: start,
      endDate: end,
    });

    res.json(services);
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/costs/forecast ─────────────────────────────────────────────────

/**
 * Returns month-end spend prediction using linear regression.
 *
 * No parameters needed — it automatically uses data from the current month.
 *
 * Response body: ForecastResult
 */
router.get("/forecast", async (_req, res, next) => {
  try {
    const forecast = await getForecast();
    res.json(forecast);
  } catch (error) {
    next(error);
  }
});

export default router;
