// ============================================
// Billow — API Client
// ============================================
import type { CostSummary, CostRecord, ServiceCost, BudgetConfig } from '../types';

// The backend API URL. Vite loads env vars prefixed with VITE_.
// We fall back to localhost:4000 if not specified.
const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000';

/**
 * Generic API request helper that handles response errors and parses JSON.
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    
    if (!response.ok) {
      // Try to parse error details from JSON
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Fallback to generic status message if not JSON
      }
      throw new Error(errorMessage);
    }
    
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Request to ${url} failed:`, error);
    throw error;
  }
}

/**
 * Fetches the daily summary dashboard data (totals, charts, etc.)
 */
export async function fetchCostSummary(): Promise<CostSummary> {
  return apiRequest<CostSummary>('/api/costs/summary');
}

/**
 * Fetches detailed daily cost records within a date range.
 */
export async function fetchDailyCosts(startDate: string, endDate: string): Promise<CostRecord[]> {
  return apiRequest<CostRecord[]>(`/api/costs/daily?start=${startDate}&end=${endDate}`);
}

/**
 * Fetches service cost breakdowns within a date range.
 */
export async function fetchServiceCosts(startDate: string, endDate: string): Promise<ServiceCost[]> {
  return apiRequest<ServiceCost[]>(`/api/costs/by-service?start=${startDate}&end=${endDate}`);
}

/**
 * Fetches current budget configuration.
 */
export async function fetchBudget(): Promise<BudgetConfig> {
  return apiRequest<BudgetConfig>('/api/budget');
}

/**
 * Updates the budget configuration.
 */
export async function updateBudget(config: BudgetConfig): Promise<BudgetConfig> {
  return apiRequest<BudgetConfig>('/api/budget', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}
