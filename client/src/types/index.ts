// ============================================
// Billow — Shared TypeScript Types
// ============================================
// These interfaces define the "shape" of our data.
// TypeScript uses these to catch bugs BEFORE runtime.

export interface ServiceCost {
  serviceName: string;
  cost: number;
  percentage: number;
}

export interface CostRecord {
  date: string;
  totalCost: number;
  currency: string;
  services: ServiceCost[];
  forecastedMonthEnd: number;
  collectedAt: string;
}

export interface BudgetConfig {
  monthlyBudget: number;
  alertThresholds: number[];
  currency: string;
  alertMethod: 'email' | 'telegram' | 'both';
}

export interface CostSummary {
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  forecastedMonthEnd: number;
  budgetUsedPercent: number;
  topServices: ServiceCost[];
  dailyCosts: { date: string; cost: number }[];
}

export interface ForecastResult {
  predictedMonthEnd: number;
  confidence: 'low' | 'medium' | 'high';
  daysOfData: number;
}

export type Tab = 'dashboard' | 'services' | 'budget' | 'alerts';
export type Theme = 'dark' | 'light';
