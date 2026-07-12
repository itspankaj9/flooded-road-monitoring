import React, { useState, useContext, useRef, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import './TopNavbar.css';

const TopNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const { alerts, currentLanguage, changeLanguage, t, isAppMode } = useContext(AppContext) || { alerts: [], currentLanguage: 'en', changeLanguage: () => {}, t: (k) => k, isAppMode: false };
  const dropdownRef = useRef(null);
  const langRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (langRef.current && !langRef.current.contains(event.target)) {
        setShowLanguage(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sort and take top 5 alerts
  const recentAlerts = [...alerts]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  const hasUnread = recentAlerts.length > 0;

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAlertIcon = (severity) => {
    switch(severity) {
      case 'Critical': return 'error';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      default: return 'notifications';
    }
  };

  return (
    <header className="top-navbar">
      <div className="container nav-container">
        <div className="nav-brand">
          <span className="nav-logo">GovInfrastructure</span>
          <nav className={`nav-links ${mobileOpen ? 'mobile-open' : ''}`}>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setMobileOpen(false)}>{t('home')}</NavLink>
            <NavLink to="/flood-monitoring" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setMobileOpen(false)}>{t('flood_monitoring')}</NavLink>
            <NavLink to="/road-updates" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setMobileOpen(false)}>{t('road_updates')}</NavLink>
            <NavLink to="/alerts" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setMobileOpen(false)}>{t('citizen_alerts')}</NavLink>
            {!isAppMode && (
              <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active admin-link' : 'nav-link admin-link'} onClick={() => setMobileOpen(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>admin_panel_settings</span>
                {t('admin')}
              </NavLink>
            )}
          </nav>
        </div>
        <div className="nav-actions">
          {/* Language Selector */}
          <div className="notification-wrapper" ref={langRef}>
            <button 
              className="icon-btn lang-btn" 
              aria-label="Language"
              onClick={() => setShowLanguage(!showLanguage)}
            >
              <span className="material-symbols-outlined">language</span>
              <span className="lang-text">{currentLanguage.toUpperCase()}</span>
            </button>
            
            {showLanguage && (
              <div className="lang-dropdown">
                <button className={`lang-option ${currentLanguage === 'en' ? 'active' : ''}`} onClick={() => { changeLanguage('en'); setShowLanguage(false); }}>
                  English (EN)
                </button>
                <button className={`lang-option ${currentLanguage === 'hi' ? 'active' : ''}`} onClick={() => { changeLanguage('hi'); setShowLanguage(false); }}>
                  हिन्दी (HI)
                </button>
                <button className={`lang-option ${currentLanguage === 'mr' ? 'active' : ''}`} onClick={() => { changeLanguage('mr'); setShowLanguage(false); }}>
                  मराठी (MR)
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="notification-wrapper" ref={dropdownRef}>
            <button 
              className="icon-btn" 
              aria-label="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <span className="material-symbols-outlined">notifications</span>
              {hasUnread && <span className="notification-badge"></span>}
            </button>
            
            {showNotifications && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h3>{t('notifications')}</h3>
                </div>
                <div className="notifications-list">
                  {recentAlerts.length === 0 ? (
                    <div className="notifications-empty">{t('no_notifications')}</div>
                  ) : (
                    recentAlerts.map(alert => (
                      <div key={alert.id} className={`notification-item severity-${alert.severity?.toLowerCase()}`}>
                        <div className="notification-icon">
                          <span className="material-symbols-outlined">{getAlertIcon(alert.severity)}</span>
                        </div>
                        <div className="notification-content">
                          <h4>{alert.title}</h4>
                          <span className="notification-time">{formatTime(alert.timestamp)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="notifications-footer">
                  <Link to="/alerts" onClick={() => setShowNotifications(false)}>{t('view_all_alerts')}</Link>
                </div>
              </div>
            )}
          </div>
          <button className="mobile-menu-btn" aria-label="Menu" onClick={() => setMobileOpen(!mobileOpen)}>
            <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
