// ============================================
// Billow — AWS Services Breakdown Page
// ============================================
import React, { useState, useMemo } from 'react';
import { useCosts } from '../../hooks/useCosts';
import { getServiceColor, formatCurrency, formatPercentage } from '../../utils/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AlertCircle, ArrowUpDown } from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { data, loading, error } = useCosts();
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Memoize sorted services so we only recalculate when data or sort changes
  const sortedServices = useMemo(() => {
    if (!data || !data.topServices) return [];
    
    return [...data.topServices].sort((a, b) => {
      return sortDirection === 'desc' ? b.cost - a.cost : a.cost - b.cost;
    });
  }, [data, sortDirection]);

  // Basic flat tooltip helper
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <span style={{ fontWeight: 'bold' }}>{data.serviceName}: </span>
          <span>{formatCurrency(data.cost)}</span>
        </div>
      );
    }
    return null;
  };

  // Toggle sort order
  const toggleSort = () => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton skeleton--chart" />
        <div style={{ marginTop: 'var(--spacing-xl)' }} className="skeleton skeleton--text" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-3xl)' }}>
        <AlertCircle size={32} color="var(--color-danger)" style={{ marginBottom: 'var(--spacing-base)' }} />
        <p style={{ color: 'var(--color-text-secondary)' }}>Could not load service data. Please retry from dashboard.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)' }}>
      {/* 1. Bar Chart Visualization */}
      <div className="chart-container">
        <div className="chart-container__header">
          <div>
            <h2 className="chart-container__title">Service Cost Distribution</h2>
            <p className="chart-container__subtitle">Compare resource expenditures across AWS services</p>
          </div>
        </div>

        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedServices}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              {/* Vertical grids for horizontal bars */}
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} vertical={true} />
              
              {/* XAxis becomes the Cost numerical axis */}
              <XAxis 
                type="number"
                stroke="var(--color-text-muted)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
                dy={5}
              />
              
              {/* YAxis becomes the Service Name category axis */}
              <YAxis 
                dataKey="serviceName"
                type="category"
                stroke="var(--color-text-muted)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={160}
                // Shorten very long names in the chart tick labels, full name visible in tooltip
                tickFormatter={(name) => name.length > 25 ? `${name.substring(0, 22)}...` : name}
              />
              
              {/* Custom Tooltip - animation disabled */}
              <Tooltip 
                isAnimationActive={false}
                animationDuration={0}
                content={<CustomTooltip />}
              />
              
              {/* Horizontal Bar with right-side rounded corners - animation disabled */}
              <Bar dataKey="cost" layout="vertical" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {sortedServices.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getServiceColor(entry.serviceName)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Detailed Service Audit Table */}
      <div className="card animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-heading)' }}>
            Service Ledger
          </h2>
          <button onClick={toggleSort} className="btn btn--ghost">
            <ArrowUpDown size={14} />
            <span>Sort: {sortDirection === 'desc' ? 'Highest first' : 'Lowest first'}</span>
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>AWS Service</th>
                <th style={{ textAlign: 'right' }}>Month-to-Date Spend</th>
                <th style={{ textAlign: 'right' }}>% of Total Spend</th>
                <th style={{ textAlign: 'center' }}>Cost Center Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedServices.map((service, index) => {
                const serviceColor = getServiceColor(service.serviceName);
                
                // Determine billing badge level
                let badgeClass = 'badge--success';
                let statusLabel = 'Low cost';
                if (service.cost > 40) {
                  badgeClass = 'badge--danger';
                  statusLabel = 'Critical cost driver';
                } else if (service.cost > 15) {
                  badgeClass = 'badge--warning';
                  statusLabel = 'Moderate cost driver';
                }

                return (
                  <tr key={index}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <div style={{
                          width: 12,
                          height: 12,
                          borderRadius: '3px',
                          backgroundColor: serviceColor,
                        }} />
                        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-heading)' }}>
                          {service.serviceName}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'var(--font-weight-medium)' }}>
                      {formatCurrency(service.cost)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                      {formatPercentage(service.percentage)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${badgeClass}`}>{statusLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
