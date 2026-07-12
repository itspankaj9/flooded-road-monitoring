import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import MapView from '../components/MapView';
import SensorAddress from '../components/SensorAddress';
import { assessFloodRisk, windDirection } from '../lib/weatherService';
import './FloodMonitoring.css';

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#22c55e', '#ef4444', '#ec4899'];

const FloodMonitoring = () => {
  const [searchInput, setSearchInput] = useState('');
  const { t, weather, forecast, weatherLoading, customCity, setCustomCity, requestLiveLocation, wifiSensorData, wifiSensorHistory, wifiIotDevices } = useAppContext();

  // Use the active IoT device for flood risk assessment instead of mock sensors
  const activeIotDevice = wifiIotDevices && wifiIotDevices.length > 0 ? wifiIotDevices[0] : null;
  const floodRisk = assessFloodRisk(weather, []); // Passing empty array for now since mock sensors are gone

  const formatTemp = (t) => t !== undefined ? `${t}°C` : '—';

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setCustomCity(searchInput.trim());
      setSearchInput('');
    }
  };

  const handleLiveLocation = () => {
    requestLiveLocation();
  };

  return (
    <div className="flood-monitoring">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background flood-hero-bg"></div>
        <div className="container hero-content">
          <span className="hero-subtitle">{t('flood_hero_subtitle')}</span>
          <h1 className="hero-title">{t('flood_hero_title')}</h1>
          <p className="hero-description">{t('flood_hero_desc')}</p>
        </div>
      </section>

      <div className="container">
        {/* Location Chooser */}
      <div className="location-chooser card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px' }}>
            <input 
              type="text" 
              placeholder={t('search_placeholder')} 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline-variant)', fontSize: '15px' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }}>
              <span className="material-symbols-outlined">search</span>
              {t('search')}
            </button>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
              {t('currently_viewing')} <strong style={{ color: 'var(--color-on-surface)' }}>{customCity ? weather?.cityName : t('live_gps')}</strong>
            </span>
            <button onClick={handleLiveLocation} className={`btn ${customCity ? 'btn-outline' : 'btn-primary'}`} style={{ padding: '6px 12px', fontSize: '13px', minHeight: '32px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>my_location</span>
              {t('fetch_live_gps')}
            </button>
          </div>
        </div>
      </div>

      {/* Flood Risk Banner */}
      <div className="flood-risk-banner" style={{ borderLeftColor: floodRisk.color, backgroundColor: `${floodRisk.color}15` }}>
        <div className="risk-icon" style={{ color: floodRisk.color }}>
          <span className="material-symbols-outlined filled" style={{ fontSize: '32px' }}>
            {floodRisk.level === 'critical' ? 'crisis_alert' : floodRisk.level === 'elevated' ? 'warning' : floodRisk.level === 'watch' ? 'water_drop' : 'check_circle'}
          </span>
        </div>
        <div>
          <strong style={{ color: floodRisk.color, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.06em' }}>
            {t('flood_risk_level')} {floodRisk.level.toUpperCase()}
          </strong>
          <p style={{ margin: '2px 0 0', fontSize: '14px', opacity: 0.85 }}>{floodRisk.reason}</p>
        </div>
      </div>

      {/* Live Weather Panel */}
      {!weatherLoading && weather && (
        <div className="weather-panel">
          <div className="weather-main">
            <img src={weather.iconUrl} alt={weather.description} className="weather-icon-large" />
            <div>
              <h2 className="weather-temp">{formatTemp(weather.temp)}</h2>
              <p className="weather-desc">{weather.cityName} — {weather.description}</p>
              <p className="weather-feels">Feels like {formatTemp(weather.feelsLike)}</p>
            </div>
          </div>
          <div className="weather-stats">
            <div className="weather-stat">
              <span className="material-symbols-outlined">water_drop</span>
              <span><strong>{weather.humidity}%</strong><br /><small>Humidity</small></span>
            </div>
            <div className="weather-stat">
              <span className="material-symbols-outlined">rainy</span>
              <span><strong>{weather.rain1h > 0 ? `${weather.rain1h.toFixed(1)} mm/h` : 'None'}</strong><br /><small>Rainfall</small></span>
            </div>
            <div className="weather-stat">
              <span className="material-symbols-outlined">air</span>
              <span><strong>{weather.windSpeed} m/s</strong><br /><small>Wind {windDirection(weather.windDeg)}</small></span>
            </div>
            <div className="weather-stat">
              <span className="material-symbols-outlined">compress</span>
              <span><strong>{weather.pressure} hPa</strong><br /><small>Pressure</small></span>
            </div>
            <div className="weather-stat">
              <span className="material-symbols-outlined">visibility</span>
              <span><strong>{(weather.visibility / 1000).toFixed(1)} km</strong><br /><small>Visibility</small></span>
            </div>
            <div className="weather-stat">
              <span className="material-symbols-outlined">wb_cloudy</span>
              <span><strong>{weather.clouds}%</strong><br /><small>Cloud Cover</small></span>
            </div>
          </div>
        </div>
      )}

      {/* 48-hour Forecast Strip */}
      {forecast.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div className="card-header">
            <h2 className="card-title">
              <span className="material-symbols-outlined">schedule</span>
              48-Hour Forecast
            </h2>
          </div>
          <div className="card-body">
            <div className="forecast-strip">
              {forecast.slice(0, 8).map((item, i) => (
                <div key={i} className="forecast-item">
                  <span className="forecast-time">{item.time}</span>
                  <img src={item.iconUrl} alt={item.description} className="forecast-icon" />
                  <span className="forecast-temp">{item.temp}°</span>
                  {item.rain3h > 0 && (
                    <span className="forecast-rain" title={`${item.rain3h.toFixed(1)} mm rain`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>water_drop</span>
                      {item.rain3h.toFixed(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Map */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="section-header">
          <h2 className="section-title">Sensor Locations</h2>
        </div>
        <MapView height="350px" />
      </div>
      <div className="fm-grid">
        {/* Sensor Cards */}
        <div className="sensor-list">
          <h2 className="section-title">Active Live Sensors</h2>
          {(!wifiIotDevices || wifiIotDevices.length === 0) ? (
            <div className="empty-state">
              <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>sensors_off</span>
              <p style={{ opacity: 0.5, marginTop: '8px' }}>No IoT sensors registered. Register one in the Admin panel.</p>
            </div>
          ) : (
            <div className="sensor-cards-container">
              {wifiIotDevices.map(device => {
                const isDanger = device.latestDistanceCm <= device.thresholdDanger;
                const isWarning = device.latestDistanceCm <= device.thresholdWarning && !isDanger;
                const status = isDanger ? 'danger' : isWarning ? 'warning' : 'success';
                
                return (
                  <div key={device.id} className={`card sensor-card status-${status}`}>
                    <div className="card-body">
                      <div className="sensor-header">
                        <div>
                          <h3 className="sensor-name">{device.name}</h3>
                          <span className="text-caption">
                            ID: {device.id} · Ultrasonic
                          </span>
                          <SensorAddress lat={device.lat} lng={device.lng} />
                        </div>
                        <span className={`badge badge-${status === 'danger' ? 'error' : status}`}>
                          {status.toUpperCase()}
                        </span>
                      </div>
                      <div className="sensor-data">
                        <div className="sensor-value">
                          <span className="value">{device.latestDistanceCm ? device.latestDistanceCm.toFixed(1) : '--'}</span>
                          <span className="unit">cm</span>
                        </div>
                        <div className="sensor-thresholds">
                          <span className="text-caption">
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', verticalAlign: 'middle', color: 'var(--color-warning)' }}>warning</span>
                            Warn: {device.thresholdWarning}cm
                          </span>
                          <span className="text-caption">
                            <span className="material-symbols-outlined filled" style={{ fontSize: '13px', verticalAlign: 'middle', color: 'var(--color-error)' }}>error</span>
                            Danger: {device.thresholdDanger}cm
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Analytics Chart */}
        <div className="analytics-section">
          <div className="card chart-card">
            <div className="card-header">
              <h2 className="card-title">Live Sensor Trend</h2>
            </div>
            <div className="card-body" style={{ height: '400px' }}>
              {!wifiSensorHistory || wifiSensorHistory.length < 2 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>ssid_chart</span>
                  <p style={{ marginTop: '8px' }}>Collecting data points... ({wifiSensorHistory ? wifiSensorHistory.length : 0}/2 minimum)</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wifiSensorHistory.map((r) => ({
                    time: new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    [activeIotDevice ? activeIotDevice.id : 'distance']: r.distanceCm
                  }))} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" />
                    <XAxis dataKey="time" stroke="var(--color-on-surface-variant)" fontSize={10} minTickGap={20} tickMargin={8} />
                    <YAxis stroke="var(--color-on-surface-variant)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-surface-container-lowest)', borderColor: 'var(--color-outline-variant)', borderRadius: '4px' }}
                      itemStyle={{ color: 'var(--color-on-surface)' }}
                    />
                    <Legend />
                    {wifiIotDevices.map((d, i) => (
                      <Line
                        key={d.id}
                        type="monotone"
                        dataKey={d.id}
                        name={d.name}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                    <ReferenceLine y={activeIotDevice ? activeIotDevice.thresholdWarning : 80} stroke="var(--color-warning)" strokeDasharray="3 3" />
                    <ReferenceLine y={activeIotDevice ? activeIotDevice.thresholdDanger : 30} stroke="var(--color-error)" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default FloodMonitoring;
