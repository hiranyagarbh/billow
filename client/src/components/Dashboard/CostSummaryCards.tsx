// ============================================
// Billow — Cost Summary Cards
// ============================================
import React from 'react';
import { DollarSign, Calendar, TrendingUp, Percent } from 'lucide-react';
import type { CostSummary } from '../../types';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface CostSummaryCardsProps {
  summary: CostSummary | null;
  loading: boolean;
}

export const CostSummaryCards: React.FC<CostSummaryCardsProps> = ({ summary, loading }) => {
  if (loading || !summary) {
    // Show 4 loading skeletons when data is fetching
    return (
      <div className="card-grid stagger-children">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton skeleton--card" />
        ))}
      </div>
    );
  }

  const {
    totalToday,
    totalThisMonth,
    forecastedMonthEnd,
    budgetUsedPercent,
  } = summary;

  // Determine budget status class based on percentage used
  const getBudgetStatusClass = (percent: number) => {
    if (percent >= 100) return 'badge--danger';
    if (percent >= 75) return 'badge--warning';
    return 'badge--success';
  };

  return (
    <div className="card-grid stagger-children">
      {/* Card 1: Today's Cost */}
      <div className="summary-card">
        <div className="summary-card__icon">
          <DollarSign size={20} />
        </div>
        <span className="summary-card__label">Today's Spend</span>
        <span className="summary-card__value">{formatCurrency(totalToday)}</span>
        <span className="summary-card__trend summary-card__trend--down" style={{ marginTop: 'auto' }}>
          Real-time tracking
        </span>
      </div>

      {/* Card 2: Monthly Spend */}
      <div className="summary-card">
        <div className="summary-card__icon">
          <Calendar size={20} />
        </div>
        <span className="summary-card__label">Month-to-Date</span>
        <span className="summary-card__value">{formatCurrency(totalThisMonth)}</span>
        <span className="summary-card__trend summary-card__trend--down" style={{ marginTop: 'auto' }}>
          This calendar month
        </span>
      </div>

      {/* Card 3: Forecasted Month End */}
      <div className="summary-card">
        <div className="summary-card__icon">
          <TrendingUp size={20} />
        </div>
        <span className="summary-card__label">Forecasted Spend</span>
        <span className="summary-card__value">{formatCurrency(forecastedMonthEnd)}</span>
        <span className="summary-card__trend summary-card__trend--up" style={{ marginTop: 'auto' }}>
          Estimated month end
        </span>
      </div>

      {/* Card 4: Budget Percentage */}
      <div className="summary-card">
        <div className="summary-card__icon">
          <Percent size={20} />
        </div>
        <span className="summary-card__label">Budget Used</span>
        <span className="summary-card__value">{formatPercentage(budgetUsedPercent)}</span>
        <div style={{ marginTop: 'auto' }}>
          <span className={`badge ${getBudgetStatusClass(budgetUsedPercent)}`}>
            {budgetUsedPercent >= 100 ? 'Limit Exceeded' : budgetUsedPercent >= 75 ? 'Warning Threshold' : 'Within Budget'}
          </span>
        </div>
      </div>
    </div>
  );
};
