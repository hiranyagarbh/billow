// ============================================
// Billow — Budget Configuration Page
// ============================================
import React, { useState, useEffect } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { useCosts } from '../../hooks/useCosts';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { AlertTriangle, ShieldCheck, Save } from 'lucide-react';
import type { BudgetConfig } from '../../types';

export const BudgetPage: React.FC = () => {
  const { budget, loading: budgetLoading, updateBudget } = useBudget();
  const { data: costData, loading: costLoading } = useCosts();

  // State to hold input form values locally
  const [limitInput, setLimitInput] = useState<string>('');
  const [alertMethod, setAlertMethod] = useState<'email' | 'telegram' | 'both'>('both');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync state values when API loads the existing budget config
  useEffect(() => {
    if (budget) {
      setLimitInput(budget.monthlyBudget.toString());
      setAlertMethod(budget.alertMethod);
    }
  }, [budget]);

  if (budgetLoading || costLoading) {
    return (
      <div className="card">
        <div className="skeleton skeleton--heading" />
        <div style={{ marginTop: 'var(--spacing-xl)' }} className="skeleton skeleton--chart" />
      </div>
    );
  }

  const currentSpend = costData ? costData.totalThisMonth : 0;
  const budgetLimit = budget ? budget.monthlyBudget : 150;
  const percentUsed = budgetLimit > 0 ? (currentSpend / budgetLimit) * 100 : 0;
  const isOverBudget = currentSpend >= budgetLimit;

  // Handle Form Submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    const limit = parseFloat(limitInput);
    if (isNaN(limit) || limit <= 0) {
      alert('Please enter a valid positive budget amount.');
      return;
    }

    const newConfig: BudgetConfig = {
      monthlyBudget: limit,
      alertThresholds: budget?.alertThresholds || [50, 75, 90, 100],
      currency: budget?.currency || 'USD',
      alertMethod: alertMethod,
    };

    try {
      await updateBudget(newConfig);
      setSaveSuccess(true);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save budget settings.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-2xl)', alignItems: 'start' }} className="stagger-children">
      
      {/* Column 1: Progress Tracker */}
      <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-heading)' }}>
          Budget Burn Rate
        </h2>

        {/* Big Ring / Metrics */}
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
          <div style={{
            fontSize: 'var(--font-size-4xl)',
            fontWeight: 'var(--font-weight-extrabold)',
            color: isOverBudget ? 'var(--color-danger)' : 'var(--color-accent)',
          }}>
            {formatPercentage(percentUsed)}
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
            of your monthly limit utilized
          </div>
        </div>

        {/* Ledger Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Month-to-Date Cost</span>
            <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>{formatCurrency(currentSpend)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Total Monthly Limit</span>
            <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>{formatCurrency(budgetLimit)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Remaining Allowance</span>
            <span style={{
              fontWeight: 'var(--font-weight-bold)',
              color: isOverBudget ? 'var(--color-danger)' : 'var(--color-success)',
            }}>
              {isOverBudget ? '$0.00' : formatCurrency(budgetLimit - currentSpend)}
            </span>
          </div>
        </div>

        {/* Warning Alert banner */}
        {isOverBudget && (
          <div style={{
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
            color: 'var(--color-danger)',
            fontSize: 'var(--font-size-sm)',
          }}>
            <AlertTriangle size={18} />
            <span>Budget threshold breached. Automated warnings triggered.</span>
          </div>
        )}
      </div>

      {/* Column 2: Edit Form */}
      <div className="card animate-fade-in" style={{ animationDelay: '100ms' }}>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-heading)', marginBottom: 'var(--spacing-xl)' }}>
          Configure Settings
        </h2>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {/* Budget Limit Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="budget-limit">
              Monthly Spend Ceiling ($)
            </label>
            <input
              type="number"
              id="budget-limit"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              className="form-input"
              placeholder="e.g. 150"
              required
            />
          </div>

          {/* Alert Options */}
          <div className="form-group">
            <label className="form-label" htmlFor="alert-method">
              Notification Channel
            </label>
            <select
              id="alert-method"
              value={alertMethod}
              onChange={(e) => setAlertMethod(e.target.value as any)}
              className="form-input"
              style={{ background: 'var(--color-bg-input)' }}
            >
              <option value="telegram">Telegram Direct Messenger</option>
              <option value="email">AWS SES Email System</option>
              <option value="both">Send across both channels</option>
            </select>
          </div>

          {/* Success / Save Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--spacing-md)' }}>
            <div>
              {saveSuccess && (
                <span className="badge badge--success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} />
                  Settings saved successfully
                </span>
              )}
            </div>
            <button type="submit" className="btn btn--primary">
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
