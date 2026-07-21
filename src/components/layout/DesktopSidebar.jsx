import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import './DesktopSidebar.css';

const DesktopSidebar = () => {
  const { t, isAppMode } = useContext(AppContext) || { t: (k) => k, isAppMode: false };

  if (isAppMode) return null;

  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <img src="/logo.png" alt="FloodWatch Logo" className="sidebar-logo-img" />
        </div>
        <div className="sidebar-logo-text">FloodWatch</div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
          <span className="material-symbols-outlined">dashboard</span>
          {t('home')}
        </NavLink>
        <NavLink to="/flood-monitoring" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
          <span className="material-symbols-outlined">water</span>
          {t('flood_monitoring')}
        </NavLink>
        <NavLink to="/road-updates" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
          <span className="material-symbols-outlined">add_road</span>
          {t('road_updates')}
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
          <span className="material-symbols-outlined">campaign</span>
          {t('citizen_alerts')}
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/admin" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
          <span className="material-symbols-outlined">admin_panel_settings</span>
          {t('admin')}
        </NavLink>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
