// ============================================
// Billow — Header Component
// ============================================
import React from 'react';
import { Menu } from 'lucide-react';
import type { Tab } from '../../types';

interface HeaderProps {
  activeTab: Tab;
  onMenuToggle: () => void;
  lastUpdated?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onMenuToggle,
  lastUpdated,
}) => {
  // Translate tab IDs into human-friendly titles
  const getPageTitle = (tab: Tab) => {
    switch (tab) {
      case 'dashboard':
        return 'Overview';
      case 'services':
        return 'AWS Services';
      case 'budget':
        return 'Budget Settings';
      case 'alerts':
        return 'Alert Logs';
      default:
        return 'Billow';
    }
  };

  return (
    <header className="header">
      {/* Title & Mobile Hamburger Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-base)' }}>
        <button 
          onClick={onMenuToggle}
          className="btn btn--icon"
          style={{ display: 'none' }} // Handled via responsive CSS classes in index.css
          id="sidebar-toggle-btn"
        >
          <Menu size={18} />
        </button>
        <h1 className="header__title">{getPageTitle(activeTab)}</h1>
      </div>

      {/* Actions */}
      <div className="header__actions">
        {lastUpdated && (
          <span className="header__last-updated">
            Sync: {lastUpdated}
          </span>
        )}
      </div>
    </header>
  );
};
