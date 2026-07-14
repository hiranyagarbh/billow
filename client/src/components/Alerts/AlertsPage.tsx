// ============================================
// Billow — Alert History Logs Page
// ============================================
import React, { useState, useMemo } from 'react';
import { AlertTriangle, ShieldCheck, Mail, Send } from 'lucide-react';
import { useBudget } from '../../hooks/useBudget';
import { useCosts } from '../../hooks/useCosts';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface AlertLog {
  id: string;
  date: string;
  message: string;
  thresholdExceeded: number;
  severity: 'warning' | 'critical';
  resolved: boolean;
}

export const AlertsPage: React.FC = () => {
  // Fetch real-time budget limit and monthly cost data from our hooks
  const { budget, loading: budgetLoading } = useBudget();
  const { data: costData, loading: costLoading } = useCosts();

  // Local state to keep track of alerts the user has manually acknowledged/dismissed
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Compute active alerts in real-time based on actual spend vs budget configuration
  const activeAlerts = useMemo((): AlertLog[] => {
    if (!budget || !costData) return [];

    const currentSpend = costData.totalThisMonth;
    const budgetLimit = budget.monthlyBudget;
    const percentUsed = budgetLimit > 0 ? (currentSpend / budgetLimit) * 100 : 0;

    const list: AlertLog[] = [];

    // Check each alert threshold configured in the budget
    budget.alertThresholds.forEach((threshold) => {
      const id = `alert-${threshold}`;
      
      // If the spend has crossed this threshold, and the user hasn't dismissed it
      if (percentUsed >= threshold && !dismissedAlerts.includes(id)) {
        const isCritical = threshold >= 90;
        list.push({
          id,
          // Simulated timestamp: today's date for demo context
          date: new Date().toISOString(),
          message: isCritical
            ? `Critical budget alert: Monthly spend of ${formatCurrency(currentSpend)} has breached ${threshold}% of your ${formatCurrency(budgetLimit)} limit (${formatPercentage(percentUsed)} used).`
            : `Budget warning: Monthly spend of ${formatCurrency(currentSpend)} has crossed ${threshold}% of your ${formatCurrency(budgetLimit)} limit (${formatPercentage(percentUsed)} used).`,
          thresholdExceeded: threshold,
          severity: isCritical ? 'critical' : 'warning',
          resolved: false,
        });
      }
    });

    // Sort showing critical alerts first
    return list.sort((a, b) => b.thresholdExceeded - a.thresholdExceeded);
  }, [budget, costData, dismissedAlerts]);

  // Handler to acknowledge/clear alert notifications
  const handleClearAlert = (id: string) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  if (budgetLoading || costLoading) {
    return (
      <div className="card">
        <div className="skeleton skeleton--heading" />
        <div style={{ marginTop: 'var(--spacing-xl)' }} className="skeleton skeleton--chart" />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-2xl)', alignItems: 'start' }} className="stagger-children">
      
      {/* Column 1: Alerts Log Ledger */}
      <div className="card animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-heading)' }}>
            System Notifications
          </h2>
          <span className="badge badge--info">{activeAlerts.length} Active Warnings</span>
        </div>

        {activeAlerts.length === 0 ? (
          /* Empty state */
          <div className="empty-state">
            <div className="empty-state__icon" style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-lg) auto',
            }}>
              <ShieldCheck size={24} />
            </div>
            <h3 className="empty-state__title">Systems Operational</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              No budget thresholds crossed. Everything is running smoothly!
            </p>
          </div>
        ) : (
          /* Alerts List */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {activeAlerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              
              return (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'start',
                    justifyContent: 'space-between',
                    padding: 'var(--spacing-md) var(--spacing-base)',
                    borderRadius: '2px', // Flat corners to match the AWS theme
                    border: '1px solid var(--color-border)',
                    backgroundColor: isCritical ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                    borderColor: isCritical ? 'var(--color-danger)' : 'var(--color-warning)',
                    gap: 'var(--spacing-md)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'start' }}>
                    <div style={{
                      color: isCritical ? 'var(--color-danger)' : 'var(--color-warning)',
                      marginTop: '2px',
                    }}>
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <div style={{
                        fontSize: 'var(--font-size-base)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-heading)',
                      }}>
                        {isCritical ? 'Critical Threshold Breached' : 'Budget Warning Threshold'}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {alert.message}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}>
                        Logged: Real-time Monitor Active
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClearAlert(alert.id)}
                    className="btn btn-sm"
                    style={{
                      padding: '4px 8px',
                      fontSize: 'var(--font-size-xs)',
                      borderColor: 'rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    Acknowledge
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Column 2: Webhooks & Integrations panel */}
      <div className="card animate-fade-in" style={{ animationDelay: '100ms', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-heading)' }}>
          Integrations
        </h2>
        
        {/* Email integration card */}
        <div style={{
          padding: 'var(--spacing-base)',
          borderRadius: '2px',
          border: '1px solid var(--color-border)',
          display: 'flex',
          gap: 'var(--spacing-md)',
        }}>
          <div style={{ color: 'var(--color-accent)' }}><Mail size={20} /></div>
          <div>
            <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-heading)' }}>AWS SES Email</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Subscribed to daily budget snapshots.
            </div>
          </div>
        </div>

        {/* Telegram Integration card */}
        <div style={{
          padding: 'var(--spacing-base)',
          borderRadius: '2px',
          border: '1px solid var(--color-border)',
          display: 'flex',
          gap: 'var(--spacing-md)',
        }}>
          <div style={{ color: 'var(--color-info)' }}><Send size={20} /></div>
          <div>
            <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-heading)' }}>Telegram Messenger</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Connected via @BillowAlertsBot.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
