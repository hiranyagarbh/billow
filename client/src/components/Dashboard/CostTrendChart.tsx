// ============================================
// Billow — Cost Trend Line Chart Component
// ============================================
import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface CostPoint {
  date: string;
  cost: number;
}

interface CostTrendChartProps {
  dailyCosts: CostPoint[];
  loading: boolean;
  budgetLimit?: number;
}

export const CostTrendChart: React.FC<CostTrendChartProps> = ({
  dailyCosts,
  loading,
  budgetLimit = 150,
}) => {
  const [daysFilter, setDaysFilter] = useState<number>(30);

  // Filter the cost data based on the selected range (7, 30, or 90 days)
  const filteredData = useMemo(() => {
    if (!dailyCosts) return [];
    return dailyCosts.slice(-daysFilter);
  }, [dailyCosts, daysFilter]);

  // Calculate daily budget line for reference
  // e.g. Monthly budget limit divided by 30 days
  const dailyBudgetReference = useMemo(() => {
    return budgetLimit / 30;
  }, [budgetLimit]);

  if (loading) {
    return (
      <div className="chart-container">
        <div className="skeleton skeleton--chart" />
      </div>
    );
  }

  // Custom tooltips when hovering over chart points
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as CostPoint;
      return (
        <div className="custom-tooltip">
          <span style={{ fontWeight: 'bold' }}>{formatDate(data.date)}: </span>
          <span>{formatCurrency(data.cost)}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      <div className="chart-container__header">
        <div>
          <h2 className="chart-container__title">Cost Over Time</h2>
          <p className="chart-container__subtitle">Daily spend breakdown for the past {daysFilter} days</p>
        </div>
        
        {/* Toggle buttons for filtering date range */}
        <div className="tab-toggle">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setDaysFilter(days)}
              className={`tab-toggle__btn ${daysFilter === days ? 'tab-toggle__btn--active' : ''}`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 15, right: 15, left: 10, bottom: 10 }}
          >
            {/* Background grids: both horizontal and vertical lines like CloudWatch */}
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            
            {/* X and Y axes */}
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="var(--color-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
              minTickGap={45} // Prevents dates from overlapping
            />
            <YAxis 
              stroke="var(--color-text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
              dx={-5}
            />
            
            {/* Custom Tooltip - animation disabled */}
            <Tooltip isAnimationActive={false} animationDuration={0} content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border)' }} />
            
            {/* Reference line for budget threshold */}
            <ReferenceLine 
              y={dailyBudgetReference} 
              stroke="var(--color-danger)" 
              strokeDasharray="4 4"
              label={{ 
                value: 'Daily Budget Limit', 
                position: 'top', 
                fill: 'var(--color-danger)', 
                fontSize: 10,
                fontWeight: 600
              }} 
            />

            {/* The Line component (AWS Blue color) - animation disabled */}
            <Line
              type="monotone"
              dataKey="cost"
              stroke="var(--color-info)" // Standard AWS blue line color
              strokeWidth={2}
              isAnimationActive={false}
              dot={{ r: 3, stroke: 'var(--color-info)', strokeWidth: 1, fill: '#ffffff' }}
              activeDot={{ r: 5, stroke: 'var(--color-info)', strokeWidth: 1, fill: 'var(--color-info)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
