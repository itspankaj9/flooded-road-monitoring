import React, { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import './MobileBottomNav.css';

const tabs = [
  { path: '/', icon: 'home', label: 'Home', end: true },
  { path: '/flood-monitoring', icon: 'flood', label: 'Flood' },
  { path: '/road-updates', icon: 'edit_road', label: 'Roads' },
  { path: '/alerts', icon: 'campaign', label: 'Alerts', hasBadge: true },
  { path: '/admin', icon: 'admin_panel_settings', label: 'Admin' },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const { alerts, isAppMode } = useContext(AppContext) || { alerts: [], isAppMode: false };
  const hasAlerts = alerts && alerts.length > 0;

  // Filter out admin tab when in app mode
  const visibleTabs = isAppMode ? tabs.filter(t => t.path !== '/admin') : tabs;

  return (
    <nav className="mobile-bottom-nav" role="navigation" aria-label="Main navigation">
      {visibleTabs.map(tab => {
        // Determine active state
        const isActive = tab.end
          ? location.pathname === tab.path
          : location.pathname.startsWith(tab.path);

        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={`mobile-tab ${isActive ? 'active' : ''}`}
            aria-label={tab.label}
          >
            <span className="mobile-tab-icon">
              <span className="material-symbols-outlined">{tab.icon}</span>
              {tab.hasBadge && hasAlerts && (
                <span className="mobile-tab-badge" />
              )}
            </span>
            <span className="mobile-tab-label">{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
