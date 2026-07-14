// ============================================
// Billow — Service Cost Breakdown Donut Chart
// ============================================
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ServiceCost } from '../../types';
import { getServiceColor, formatCurrency, formatPercentage } from '../../utils/formatters';

interface ServiceBreakdownProps {
  services: ServiceCost[];
  loading: boolean;
}

export const ServiceBreakdown: React.FC<ServiceBreakdownProps> = ({ services, loading }) => {
  // Compute total monthly budget sum
  const totalSum = useMemo(() => {
    if (!services) return 0;
    return services.reduce((sum, item) => sum + item.cost, 0);
  }, [services]);

  if (loading) {
    return (
      <div className="chart-container">
        <div className="skeleton skeleton--chart" />
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>No service data available.</p>
      </div>
    );
  }

  // Basic flat tooltip helper
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ServiceCost;
      return (
        <div className="custom-tooltip">
          <span style={{ fontWeight: 'bold' }}>{data.serviceName}: </span>
          <span>{formatCurrency(data.cost)} ({formatPercentage(data.percentage)})</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="chart-container__header">
        <div>
          <h2 className="chart-container__title">Costs by Service</h2>
          <p className="chart-container__subtitle">Breakdown of current spending distribution</p>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-xl)' }}>
        {/* Donut Chart */}
        <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={services}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="cost"
                nameKey="serviceName"
                isAnimationActive={false} // Disable slide animations
              >
                {services.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getServiceColor(entry.serviceName)} 
                    stroke="var(--color-bg-secondary)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip isAnimationActive={false} animationDuration={0} content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Central Cost Sum Text overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Total</span>
            <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
              {formatCurrency(totalSum)}
            </span>
          </div>
        </div>

        {/* Flat Custom Legend list (increased limit to 8 for better readability/detail) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 220 }}>
          {services.slice(0, 8).map((service, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '0px', // Flat style
                  backgroundColor: getServiceColor(service.serviceName),
                }} />
                <span style={{ color: 'var(--color-text-secondary)', maxWidth: 155, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={service.serviceName}>
                  {service.serviceName}
                </span>
              </div>
              <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                {formatCurrency(service.cost)}
                <span style={{ color: 'var(--color-text-muted)', fontSize: '10px', marginLeft: '4px' }}>
                  ({formatPercentage(service.percentage)})
                </span>
              </div>
            </div>
          ))}
          {services.length > 8 && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'right', paddingRight: 'var(--spacing-sm)' }}>
              + {services.length - 8} more services
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
