// ============================================
// Billow — Custom React Hook: useBudget
// ============================================
import { useState, useEffect, useCallback } from 'react';
import type { BudgetConfig } from '../types';
import { fetchBudget, updateBudget as updateBudgetApi } from '../utils/api';

export function useBudget() {
  const [budget, setBudget] = useState<BudgetConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadBudget = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBudget();
      setBudget(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch budget configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveBudget = async (newConfig: BudgetConfig) => {
    try {
      setLoading(true);
      setError(null);
      const updated = await updateBudgetApi(newConfig);
      setBudget(updated);
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save budget configuration.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  return { budget, loading, error, refetch: loadBudget, updateBudget: saveBudget };
}
