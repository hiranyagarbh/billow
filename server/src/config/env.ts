/**
 * ─── Environment Configuration ───────────────────────────────────────────────
 *
 * This file loads environment variables from a `.env` file using the `dotenv`
 * package. Every setting the server needs is centralised here so the rest of
 * the codebase can just `import { config } from './env.js'` and get typed,
 * validated values — no raw `process.env` scattered everywhere.
 *
 * HOW IT WORKS:
 * 1. `dotenv/config` reads `.env` at startup and copies values into process.env.
 * 2. We pick out the vars we care about and coerce them to the right types.
 * 3. The exported `config` object is frozen — nobody can accidentally mutate it.
 */

// ── Side-effect import: loads .env into process.env ──────────────────────────
import "dotenv/config";

/**
 * Shape of our application config.
 * Every property is readonly so TypeScript yells if you try to reassign.
 */
export interface AppConfig {
  /** Port the Express server listens on */
  readonly PORT: number;

  /** AWS region for SDK calls (e.g. 'us-east-1') */
  readonly AWS_REGION: string;

  /** DynamoDB table name for cost records */
  readonly DYNAMODB_TABLE_COSTS: string;

  /** DynamoDB table name for budget configuration */
  readonly DYNAMODB_TABLE_BUDGET: string;

  /** Optional custom DynamoDB endpoint (e.g. local DynamoDB) */
  readonly DYNAMODB_ENDPOINT: string | undefined;

  /** 'development' | 'production' | 'test' */
  readonly NODE_ENV: string;

  /** Allowed CORS origin (your React dev server URL) */
  readonly CORS_ORIGIN: string;

  /**
   * When true the server returns generated mock data instead of hitting AWS.
   * Perfect for local development — no AWS credentials needed!
   */
  readonly USE_MOCK_DATA: boolean;
}

// ── Build the config object ──────────────────────────────────────────────────
export const config: AppConfig = Object.freeze({
  PORT: parseInt(process.env.PORT ?? "4000", 10),
  AWS_REGION: process.env.AWS_REGION ?? "us-east-1",
  DYNAMODB_TABLE_COSTS: process.env.DYNAMODB_TABLE_COSTS ?? "BillowCosts",
  DYNAMODB_TABLE_BUDGET: process.env.DYNAMODB_TABLE_BUDGET ?? "BillowBudget",
  DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT || undefined,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  USE_MOCK_DATA: (process.env.USE_MOCK_DATA ?? "true") === "true",
});
