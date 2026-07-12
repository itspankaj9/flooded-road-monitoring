import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';
import RouteNavigator from '../components/RouteNavigator';
import { windDirection } from '../lib/weatherService';
import './HomePortal.css';

const HomePortal = () => {
  const { sensors, roadworks, alerts, weather, weatherLoading, t } = useAppContext();

  // Derived stats from real data
  const dangerSensors = sensors.filter(s => s.status === 'danger').length;
  const warningSensors = sensors.filter(s => s.status === 'warning').length;
  const activeRoadworks = roadworks.length;
  const latestAlerts = alerts.slice(0, 6);

  const systemStatus = dangerSensors > 0
    ? t('critical_alert')
    : warningSensors > 0
    ? t('elevated_risk')
    : t('all_systems_normal');

  const isRaining = weather?.isRaining || false;

  return (
    <div className="home-portal">
      {/* Live Status Banner */}
      <div className="status-banner">
        <div className="status-banner-content">
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

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background"></div>
        <div className="container hero-content">
          <span className="hero-subtitle">{t('hero_subtitle')}</span>
          <h1 className="hero-title">{t('hero_title')}</h1>
          <p className="hero-description">{t('hero_desc')}</p>
          <div className="hero-actions">
            <Link to="/alerts" className="btn btn-primary">
              <span className="material-symbols-outlined filled">report</span>
              {t('btn_view_alerts')}
            </Link>
            <Link to="/flood-monitoring" className="btn btn-outline hero-btn-outline">
              {t('flood_monitoring')}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats Bento Grid */}
      <section className="container stats-grid-section">
        <div className="stats-grid">
          {/* Water Levels */}
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-wrapper primary"><span className="material-symbols-outlined">water</span></div>
              <span className="badge badge-success">Live</span>
            </div>
            <div className="stat-body">
              <p className="text-caption">{t('stat_water_levels')}</p>
              <h3 className="stat-value">
                {dangerSensors > 0 ? t('stat_critical') : warningSensors > 0 ? t('stat_elevated') : sensors.length === 0 ? t('stat_no_sensors') : t('stat_normal')}
              </h3>
            </div>
          </div>

          {/* Active Work Zones */}
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-wrapper primary"><span className="material-symbols-outlined">construction</span></div>
              <span className="text-caption">{t('statewide')}</span>
            </div>
            <div className="stat-body">
              <p className="text-caption">{t('stat_work_zones')}</p>
              <h3 className="stat-value">{activeRoadworks}</h3>
            </div>
          </div>

          {/* Active Advisories */}
          <div className="stat-card">
            <div className="stat-header">
              <div className={`stat-icon-wrapper ${alerts.length > 0 ? 'error' : 'primary'}`}>
                <span className="material-symbols-outlined">warning</span>
              </div>
              <span className={`badge ${alerts.length > 0 ? 'badge-warning' : 'badge-success'}`}>
                {alerts.length > 0 ? t('stat_elevated') : t('stat_normal')}
              </span>
            </div>
            <div className="stat-body">
              <p className="text-caption">{t('stat_advisories')}</p>
              <h3 className="stat-value">{alerts.length}</h3>
            </div>
          </div>

          {/* Live Weather */}
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-wrapper primary">
                {weatherLoading
                  ? <span className="material-symbols-outlined">cloud</span>
                  : <img src={weather?.iconUrl} alt="weather" style={{ width: '28px', height: '28px' }} />
                }
              </div>
              <span className="text-caption">{weather?.cityName ?? 'Weather'}</span>
            </div>
            <div className="stat-body">
              <p className="text-caption">
                {weatherLoading ? 'Loading...' : weather?.description ?? 'N/A'}
              </p>
              <h3 className="stat-value">
                {weatherLoading ? '—' : `${weather?.temp ?? '—'}°C`}
              </h3>
              {weather && (
                <p className="text-caption" style={{ marginTop: '4px' }}>
                  Humidity {weather.humidity}% · Wind {weather.windSpeed} m/s {windDirection(weather.windDeg)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Map & Safe Route Navigator (SINGLE MAP) ─── */}
      <section className="container route-navigator-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <span className="material-symbols-outlined" style={{ color: '#22c55e' }}>map</span>
              Interactive Map & Safe Routes
            </h2>
            <p className="route-section-desc">Live sensors · Admin-marked road updates · Plan safe routes avoiding danger zones</p>
          </div>
          <Link to="/road-updates" className="text-btn">
            {t('view_road_updates')} <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
        <RouteNavigator />
      </section>

      {/* ─── Latest Alerts (Full-width Grid) ─── */}
      <section className="container home-alerts-section">
        <div className="section-header">
          <h2 className="section-title">{t('latest_alerts')}</h2>
          <Link to="/alerts" className="text-btn">{t('view_all')}</Link>
        </div>
        {latestAlerts.length === 0 ? (
          <div className="no-alerts-placeholder">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>check_circle</span>
            <p style={{ opacity: 0.5, fontSize: '14px', marginTop: '8px' }}>{t('no_alerts_placeholder')}</p>
          </div>
        ) : (
          <div className="home-alerts-grid">
            {latestAlerts.map(alert => {
              const alertTypeLabels = {
                error: 'Critical', warning: 'Warning', info: 'Information',
                success: 'Resolved', danger: 'Danger',
              };
              const alertIcon = alert.type === 'error' || alert.type === 'danger' ? 'error' : alert.type === 'success' ? 'check_circle' : alert.type === 'warning' ? 'warning' : 'info';
              const displayDate = alert.updatedAt
                ? new Date(alert.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                : alert.date;
              return (
                <Link to="/alerts" key={alert.id} className="news-item">
                  <div className={`news-icon-wrapper ${alert.type}`}>
                    <span className="material-symbols-outlined">{alertIcon}</span>
                  </div>
                  <div className="news-content">
                    <span className="text-caption news-category">
                      {(alertTypeLabels[alert.type] || alert.type).toUpperCase()}
                    </span>
                    <h4 className="news-title">{alert.title}</h4>
                    <span className="text-caption news-date">{displayDate}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePortal;
