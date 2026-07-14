// ============================================
// Billow — Sidebar Navigation Component
// ============================================
// WHAT ARE PROPS?
// Props (short for properties) are variables passed from a parent component
// to a child component, like arguments passed to a function.
//
// In this component, we receive:
// - activeTab: which tab is currently selected in the parent's state
// - onTabChange: a function to trigger when the user clicks a nav item
//
// Since we are a child component, we don't modify activeTab directly.
// Instead, we call the onTabChange function to tell the parent to update it.

import React from 'react';
import { LayoutDashboard, Server, Wallet, Bell, Cloud } from 'lucide-react';
import type { Tab } from '../../types';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
}) => {
  const navItems = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'services' as Tab, label: 'Services', icon: Server },
    { id: 'budget' as Tab, label: 'Budget', icon: Wallet },
    { id: 'alerts' as Tab, label: 'Alerts', icon: Bell },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar__brand">
        <div className="sidebar__logo-icon">
          <Cloud size={20} />
        </div>
        <span className="sidebar__logo">Billow</span>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar__nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                onClose(); // Close sidebar on mobile after clicking
              }}
              className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="sidebar__footer">
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
          Billow AWS Monitor v1.0
        </div>
      </div>
    </aside>
  );
};
