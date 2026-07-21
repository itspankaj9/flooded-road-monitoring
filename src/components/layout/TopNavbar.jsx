import React, { useState, useContext, useRef, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import './TopNavbar.css';

const TopNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const { alerts, currentLanguage, changeLanguage, t, isAppMode, theme, toggleTheme, sensors, weather } = useContext(AppContext) || { alerts: [], currentLanguage: 'en', changeLanguage: () => {}, t: (k) => k, isAppMode: false, theme: 'dark', toggleTheme: () => {}, sensors: [], weather: null };
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

  const dangerSensors = (sensors || []).filter(s => s.status === 'danger').length;
  const warningSensors = (sensors || []).filter(s => s.status === 'warning').length;
  const systemStatus = dangerSensors > 0
    ? t('critical_alert')
    : warningSensors > 0
    ? t('elevated_risk')
    : t('all_systems_normal');
  const isRaining = weather?.isRaining || false;

  return (
    <header className="top-navbar">
      <div className="container nav-container">
        <div className="nav-brand">
          <div className="nav-logo-wrapper desktop-hidden">
            <img src="/logo.png" alt="FloodWatch Logo" className="nav-logo-img" />
            <span className="nav-logo">FloodWatch</span>
          </div>
          <div className="top-nav-status mobile-hidden">
            <span className="status-indicator">
              <span className={`status-dot ${dangerSensors > 0 ? 'pulse-red' : warningSensors > 0 ? 'pulse-amber' : 'pulse-green'}`}></span>
            </span>
            <span className="status-text">
              {t('system_status')}: <strong>{systemStatus}</strong>
            </span>
            {weather && (
              <span className="status-weather">
                <span className="weather-divider">·</span>
                <img src={weather.iconUrl} alt={weather.description} className="weather-icon-mini" />
                <span className="weather-temp-text">{weather.temp}°C — {weather.description}</span>
                {isRaining && <span className="weather-rain-warning"> ⚠ Rain active</span>}
              </span>
            )}
          </div>
        </div>
        <div className="nav-actions">
          {/* Theme Toggle */}
          <button 
            className="icon-btn theme-toggle-btn" 
            aria-label="Toggle Theme"
            onClick={toggleTheme}
            style={{ marginRight: '8px' }}
          >
            <span className="material-symbols-outlined">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

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
          <button className="mobile-menu-btn desktop-hidden" aria-label="Menu" onClick={() => setMobileOpen(!mobileOpen)}>
            <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
