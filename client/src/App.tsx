// ============================================
// Billow — Main Application Component
// ============================================
// WHAT IS STATE IN REACT?
// State represents values that can change over time and trigger a re-render
// of the user interface. We manage it using the `useState` hook.
//
// In this App component:
// 1. activeTab: tracks which nav page to display (Overview, Services, Budget, Alerts)
// 2. theme: tracks dark or light mode
// 3. isSidebarOpen: tracks whether the mobile sidebar drawer is open
//
// WHAT IS EFFECT IN REACT?
// The `useEffect` hook lets us sync our component state with external systems
// (like the browser DOM, local storage, or API calls). Here, we use it to
// add/remove the 'light' or 'dark' theme tag on the html element whenever
// the user toggles the theme.

import React, { useState } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { ServicesPage } from './components/Services/ServicesPage';
import { BudgetPage } from './components/Budget/BudgetPage';
import { AlertsPage } from './components/Alerts/AlertsPage';
import type { Tab } from './types';
import { useBudget } from './hooks/useBudget';

const App: React.FC = () => {
  // ─── State Hooks ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Custom budget hook so we can pass the configured monthly budget limit
  // down to the dashboard chart as a dashed threshold line.
  const { budget } = useBudget();

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // ─── Render Page Helper ─────────────────────────────────────────────────────
  // We use simple conditional rendering (a switch statement) instead of React Router
  // to keep the project easy to understand for beginners.
  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage budgetLimit={budget?.monthlyBudget || 150} />;
      case 'services':
        return <ServicesPage />;
      case 'budget':
        return <BudgetPage />;
      case 'alerts':
        return <AlertsPage />;
      default:
        return <DashboardPage budgetLimit={budget?.monthlyBudget || 150} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />

      {/* Main Content Area Container */}
      <div className="app-main">
        {/* Top Header bar */}
        <Header
          activeTab={activeTab}
          onMenuToggle={toggleSidebar}
          lastUpdated={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        />

        {/* Dynamic page content */}
        <main className="app-content">
          {renderPage()}
        </main>
      </div>

      {/* Overlay to dim background when mobile menu is drawer open */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 45,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}
    </div>
  );
};

export default App;
