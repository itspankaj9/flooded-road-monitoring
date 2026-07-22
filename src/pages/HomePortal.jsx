import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';
import RouteNavigator from '../components/RouteNavigator';
import AlertDetailsModal from '../components/AlertDetailsModal';
import { windDirection } from '../lib/weatherService';
import './HomePortal.css';

const HomePortal = () => {
  const { sensors, roadworks, alerts, weather, weatherLoading, t, wifiIotDevices = [] } = useAppContext();
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Derived stats from real data
  const allSensors = [...(sensors || []), ...(wifiIotDevices || [])];
  const dangerSensors = allSensors.filter(s => s.status === 'danger').length;
  const warningSensors = allSensors.filter(s => s.status === 'warning').length;
  const activeRoadworks = roadworks.length;
  const latestAlerts = alerts.slice(0, 6);

  const systemStatus = dangerSensors > 0
    ? t('critical_alert')
    : warningSensors > 0
    ? t('elevated_risk')
    : t('all_systems_normal');

  const isRaining = weather?.isRaining || false;
  const weatherCondition = weather?.description?.toLowerCase() || '';
  const weatherType = weatherCondition.includes('rain') || weatherCondition.includes('drizzle') 
    ? 'rain'
    : weatherCondition.includes('cloud') || weatherCondition.includes('overcast')
    ? 'clouds'
    : weatherCondition.includes('thunder') || weatherCondition.includes('storm')
    ? 'thunderstorm'
    : weatherCondition.includes('snow')
    ? 'snow'
    : 'clear';

  return (
    <div className="home-portal">
      {/* Modern Bento Grid Layout */}
      <section className="container bento-section">
        <div className="bento-grid">
          
          {/* Bento Item 1: Hero / Welcome (Spans 2 columns) */}
          <div className="bento-card bento-hero">
            <div className="bento-hero-bg"></div>
            <div className="bento-content">
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
                </Link>
              </div>
            </div>
          </div>

          {/* Bento Item 2: Live Weather with Dynamic Multi-Image Background */}
          <div className={`bento-card bento-weather weather-bg-${weatherType}`}>
            <div className="bento-card-bg-overlay"></div>
            <div className="bento-content">
              <div className="stat-header">
                <span className="text-caption" style={{ fontWeight: '700' }}>{weather?.cityName ?? 'Weather'}</span>
                {weatherLoading ? (
                  <span className="material-symbols-outlined">cloud</span>
                ) : (
                  <img src={weather?.iconUrl} alt="weather" style={{ width: '36px', height: '36px' }} />
                )}
              </div>
              <div className="bento-weather-main">
                <h3 className="bento-value large">
                  {weatherLoading ? '—' : `${weather?.temp ?? '—'}°`}
                </h3>
                <p className="bento-weather-desc">
                  {weatherLoading ? 'Loading...' : weather?.description ?? 'N/A'}
                </p>
              </div>
              {weather && (
                <div className="bento-weather-footer text-caption">
                  <span>💧 {weather.humidity}%</span>
                  <span>💨 {weather.windSpeed} m/s</span>
                </div>
              )}
            </div>
          </div>

          {/* Bento Item 2.5: Active Sensors Count */}
          <div className="bento-card bento-stat bento-sensors-count-card">
            <div className="bento-card-bg-overlay"></div>
            <div className="bento-content">
              <div className="stat-header">
                <div className="stat-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#0891b2', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                  <span className="material-symbols-outlined">sensors</span>
                </div>
                <span className="badge badge-success">ONLINE</span>
              </div>
              <div className="stat-body" style={{ marginTop: 'auto' }}>
                <p className="text-caption">Active Sensors</p>
                <h3 className="bento-value">{allSensors.length}</h3>
              </div>
            </div>
          </div>

          {/* Bento Item 4: Water Levels */}
          <div className="bento-card bento-stat bento-water-card">
            <div className="bento-card-bg-overlay"></div>
            <div className="bento-content bento-alerts-content">
              <div className="bento-alerts-left">
                <div className="stat-header">
                  <div className="stat-icon-wrapper primary"><span className="material-symbols-outlined">water</span></div>
                  <span className="badge badge-success">Live</span>
                </div>
                <div className="stat-body">
                  <p className="text-caption">{t('stat_water_levels')}</p>
                  <h3 className="bento-value">
                    {dangerSensors > 0 ? t('stat_critical') : warningSensors > 0 ? t('stat_elevated') : allSensors.length === 0 ? t('stat_no_sensors') : t('stat_normal')}
                  </h3>
                </div>
              </div>

              <div className="bento-alerts-details">
                <h4 className="details-title">Flood Status</h4>
                {allSensors.length === 0 ? (
                  <p className="details-empty">No sensors online.</p>
                ) : dangerSensors === 0 && warningSensors === 0 ? (
                  <p className="details-empty">All water levels normal.</p>
                ) : (
                  <ul className="details-list">
                    {allSensors.filter(s => s.status === 'danger' || s.status === 'warning').slice(0, 2).map((s) => (
                      <li key={s.id} className="details-item">
                        <span className={`details-dot ${s.status === 'danger' ? 'dot-danger' : 'dot-warning'}`}></span>
                        <span className="details-text">{s.location || s.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Bento Item 5: Active Work Zones */}
          <div className="bento-card bento-stat bento-work-card">
            <div className="bento-card-bg-overlay"></div>
            <div className="bento-content bento-alerts-content">
              <div className="bento-alerts-left">
                <div className="stat-header">
                  <div className="stat-icon-wrapper primary"><span className="material-symbols-outlined">construction</span></div>
                  <span className="text-caption" style={{ fontWeight: '700' }}>{t('statewide')}</span>
                </div>
                <div className="stat-body">
                  <p className="text-caption">{t('stat_work_zones')}</p>
                  <h3 className="bento-value">{activeRoadworks}</h3>
                </div>
              </div>

              <div className="bento-alerts-details">
                <h4 className="details-title">Recent Roadworks</h4>
                {roadworks.length === 0 ? (
                  <p className="details-empty">No active work zones reported.</p>
                ) : (
                  <ul className="details-list">
                    {roadworks.slice(0, 2).map((rw) => (
                      <li key={rw.id} className="details-item">
                        <span className="details-dot dot-warning"></span>
                        <span className="details-text">{rw.title || rw.location || 'Roadwork'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Bento Item 6: Active Advisories */}
          <div className="bento-card bento-stat bento-alerts-card">
            <div className="bento-card-bg-overlay"></div>
            <div className="bento-content bento-alerts-content">
              <div className="bento-alerts-left">
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
                  <h3 className="bento-value">{alerts.length}</h3>
                </div>
              </div>
              
              {/* Desktop-only details: List of active alerts */}
              <div className="bento-alerts-details">
                <h4 className="details-title">Active Alert Advisories</h4>
                {alerts.length === 0 ? (
                  <p className="details-empty">All systems normal. No active warnings.</p>
                ) : (
                  <ul className="details-list">
                    {alerts.slice(0, 2).map((alert) => {
                      const isRoadUpdate = alert.title.includes('Road marked as') || alert.title.includes('Closure') || alert.title.includes('Roadwork');
                      let displayTitle = alert.title;
                      if (!isRoadUpdate && (displayTitle.includes('Monitoring 1') || displayTitle.includes('Monitoring Station'))) {
                        const sourceDev = (wifiIotDevices || []).find(d => d.id === alert.sourceId) || (sensors || []).find(s => s.id === alert.sourceId);
                        const realLoc = sourceDev?.location || 'Mithi River Bridge, BKC, Mumbai';
                        displayTitle = displayTitle.replace('Monitoring 1', realLoc).replace('Monitoring Station #1', realLoc);
                      }
                      return (
                        <li key={alert.id} className="details-item">
                          <span className={`details-dot ${alert.type === 'error' || alert.type === 'danger' ? 'dot-danger' : 'dot-warning'}`}></span>
                          <span className="details-text">{displayTitle}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Bento Item 7: Interactive Map (Moved to end for mobile column consistency) */}
          <div className="bento-card bento-map-card">
            <div className="bento-map-overlay">
              <h2 className="bento-map-title">Live Infrastructure Map</h2>
              <span className="badge badge-success">REAL-TIME</span>
            </div>
            <div className="bento-map-wrapper">
              <RouteNavigator />
            </div>
          </div>

        </div>
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
              const isRoadUpdate = alert.title.includes('Road marked as') || alert.title.includes('Closure') || alert.title.includes('Roadwork') || alert.title.includes('Maintenance') || alert.title.includes('Lane');

              const alertTypeLabels = {
                error: 'Critical', warning: 'Warning', info: 'Information',
                success: 'Resolved', danger: 'Danger',
              };

              const category = isRoadUpdate ? 'ROAD UPDATE' : (alertTypeLabels[alert.type] || alert.type).toUpperCase();
              const alertIcon = isRoadUpdate ? 'construction' : (alert.type === 'error' || alert.type === 'danger' ? 'error' : alert.type === 'success' ? 'check_circle' : alert.type === 'warning' ? 'warning' : 'info');
              const wrapperClass = isRoadUpdate ? 'warning' : alert.type;

              // Format title for Flood alerts to replace generic "Monitoring 1" with real address
              let displayTitle = alert.title;
              if (!isRoadUpdate && (displayTitle.includes('Monitoring 1') || displayTitle.includes('Monitoring Station'))) {
                const sourceDev = (wifiIotDevices || []).find(d => d.id === alert.sourceId) || (sensors || []).find(s => s.id === alert.sourceId);
                const realLoc = sourceDev?.location || 'Mithi River Bridge, BKC, Mumbai';
                displayTitle = displayTitle.replace('Monitoring 1', realLoc).replace('Monitoring Station #1', realLoc);
              }

              const displayDate = alert.updatedAt
                ? new Date(alert.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                : alert.date;

              return (
                <div key={alert.id} className="news-item" onClick={() => setSelectedAlert(alert)} style={{ cursor: 'pointer' }}>
                  <div className={`news-icon-wrapper ${wrapperClass}`}>
                    <span className="material-symbols-outlined">{alertIcon}</span>
                  </div>
                  <div className="news-content">
                    <span className="text-caption news-category">
                      {category}
                    </span>
                    <h4 className="news-title">{displayTitle}</h4>
                    <span className="text-caption news-date">{displayDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedAlert && (
        <AlertDetailsModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
    </div>
  );
};

export default HomePortal;
