// ============================================
// Billow — Dashboard Overview Page
// ============================================
// WHAT IS COMPONENT COMPOSITION?
// React lets us build small, focused components (like CostSummaryCards,
// CostTrendChart, ServiceBreakdown) and piece them together like Lego bricks
// to build full pages.
//
// In this page component:
// 1. We import the custom hook `useCosts` to fetch all necessary cost summaries.
// 2. We pass the data and loading state down into our sub-components.
// 3. We provide a retry button if the backend is offline or returns an error.

import React from 'react';
import { CostSummaryCards } from './CostSummaryCards';
import { CostTrendChart } from './CostTrendChart';
import { ServiceBreakdown } from './ServiceBreakdown';
import { useCosts } from '../../hooks/useCosts';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface DashboardPageProps {
  budgetLimit?: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ budgetLimit = 150 }) => {
  const { data, loading, error, refetch } = useCosts();

  // If there's an error fetching data (e.g. backend server is offline)
  if (error) {
    return (
      <div className="card animate-fade-in" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-4xl)',
        textAlign: 'center',
        gap: 'var(--spacing-base)',
        maxWidth: 600,
        margin: 'var(--spacing-4xl) auto',
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertTriangle size={24} />
        </div>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-heading)' }}>
          Connection Error
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)', lineHeight: 1.5 }}>
          {error}. Make sure the Billow Express server is running on port 4000.
        </p>
        <button onClick={refetch} className="btn btn--primary" style={{ marginTop: 'var(--spacing-md)' }}>
          <RefreshCw size={16} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)' }}>
      {/* 4 Summary Cards Grid */}
      <CostSummaryCards summary={data} loading={loading} />

      {/* Main Analytics Section: Trend Line + Service Pie */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 'var(--spacing-2xl)',
        alignItems: 'stretch',
      }} className="stagger-children">
        
        {/* Trend Area Chart (Left column) */}
        <div>
          <CostTrendChart 
            dailyCosts={data?.dailyCosts || []} 
            loading={loading} 
            budgetLimit={budgetLimit}
          />
        </div>

        {/* Service Breakdown Donut (Right column) */}
        <div>
          <ServiceBreakdown 
            services={data?.topServices || []} 
            loading={loading} 
          />
        </div>
      </div>
    </div>
  );
};
