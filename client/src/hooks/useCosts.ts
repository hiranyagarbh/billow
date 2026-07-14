// ============================================
// Billow — Custom React Hook: useCosts
// ============================================
// WHAT IS A CUSTOM HOOK?
// A custom hook is a reusable JavaScript function that starts with "use".
// It lets us package React state (useState) and side effects (useEffect)
// so multiple components can share the same logic.
//
// In this hook:
// 1. We track data (CostSummary), loading state, and error message.
// 2. We trigger fetchCostSummary() when the component using the hook mounts.
// 3. We return these values so the dashboard page can easily access them.

import { useState, useEffect, useCallback } from 'react';
import type { CostSummary } from '../types';
import { fetchCostSummary } from '../utils/api';

export function useCosts() {
  const [data, setData] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // useCallback memoizes this function so it isn't re-created on every render.
  // This prevents infinite render loops when used inside useEffect.
  const loadCosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await fetchCostSummary();
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading cost data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect triggers the fetch operation once when the component mounts.
  useEffect(() => {
    loadCosts();
  }, [loadCosts]);

  return { data, loading, error, refetch: loadCosts };
}
