import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import MapView from '../components/MapView';
import SensorAddress from '../components/SensorAddress';
import CircularGauge from '../components/CircularGauge';
import { assessFloodRisk, windDirection } from '../lib/weatherService';
import './FloodMonitoring.css';

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#22c55e', '#ef4444', '#ec4899'];

/**
 * Calculate flood metrics from a device's config and latest reading.
 * 
 * Sensor is mounted at `sensorHeightCm` above the road/riverbed.
 * It measures `distanceCm` (distance from sensor down to the water surface).
 * 
 * floodDepth = sensorHeightCm - distanceCm
 *   - If positive: water is ABOVE the road surface (flooding)
 *   - If zero or negative: water is AT or BELOW the surface (safe)
 * 
 * Thresholds (thresholdWarning, thresholdDanger) are in cm of flood depth.
 *   - Warning: floodDepth >= thresholdWarning
 *   - Danger:  floodDepth >= thresholdDanger
 */
function computeFloodMetrics(device) {
  const sensorHeight = device.sensorHeightCm || 200;
  const rawDistance = device.latestDistanceCm || 0;
  const floodDepth = sensorHeight - rawDistance;
  const displayDepth = Math.max(0, floodDepth);
  
  const warnThreshold = device.thresholdWarning ?? 10;
  const dangerThreshold = device.thresholdDanger ?? 30;

  let status = 'normal';
  if (displayDepth >= dangerThreshold) {
    status = 'danger';
  } else if (displayDepth >= warnThreshold) {
    status = 'warning';
  }

  // Visual fill: percentage of the card background to fill
  const maxForBar = Math.max(dangerThreshold * 2, sensorHeight * 0.5);
  const fillPct = Math.min(100, Math.max(0, (displayDepth / maxForBar) * 100));

  return { sensorHeight, rawDistance, floodDepth, displayDepth, status, fillPct, warnThreshold, dangerThreshold };
}

const FloodMonitoring = () => {
  const [searchInput, setSearchInput] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const { t, weather, forecast, weatherLoading, customCity, setCustomCity, requestLiveLocation, wifiSensorData, wifiSensorHistory, wifiIotDevices } = useAppContext();

  const activeIotDevice = wifiIotDevices && wifiIotDevices.length > 0 ? wifiIotDevices[0] : null;
  const floodRisk = assessFloodRisk(weather, []);

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

  // ─── Build chart data: convert raw distance to flood depth ─────
  const chartData = (wifiSensorHistory || []).map((r) => {
    const entry = {
      time: new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    if (activeIotDevice) {
      const sensorHeight = activeIotDevice.sensorHeightCm || 200;
      const depth = Math.max(0, sensorHeight - r.distanceCm);
      entry[activeIotDevice.id] = parseFloat(depth.toFixed(1));
    }
    return entry;
  });

  return (
    <div className="flood-monitoring">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background flood-hero-bg"></div>
        <div className="container hero-content">
          <span className="hero-subtitle">{t('flood_hero_subtitle')}</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="hero-title" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {t('flood_hero_title')}
            </h1>
            <button 
              onClick={() => setShowInfo(!showInfo)} 
              title="Toggle Description"
              style={{ 
                background: showInfo ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)', 
                border: '1px solid var(--color-outline-variant)', 
                color: showInfo ? '#ffffff' : 'inherit', 
                cursor: 'pointer', 
                display: 'inline-flex', 
                padding: '6px 12px', 
                borderRadius: '20px', 
                alignItems: 'center', 
                gap: '6px',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
              <span>{showInfo ? 'Hide Info' : 'Info'}</span>
            </button>
          </div>
          {showInfo && <p className="hero-description" style={{ marginTop: '12px' }}>{t('flood_hero_desc')}</p>}
        </div>
      </section>

      <div className="container">
        {/* Location Chooser */}
      <div className="location-chooser card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '200px' }}>
            <input 
              type="text" 
              placeholder={t('search_placeholder')} 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline-variant)', fontSize: '15px' }}
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
        <MapView height="350px" showRoadMarkers={false} />
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
                const m = computeFloodMetrics(device);
                const statusClass = m.status === 'danger' ? 'danger' : m.status === 'warning' ? 'warning' : 'success';
                
                return (
                  <div key={device.id} className={`card sensor-card status-${statusClass}`} style={{ position: 'relative', overflow: 'hidden' }}>
                    {/* Visual Water Level Fill */}
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: `${m.fillPct}%`,
                        backgroundColor: statusClass === 'danger' ? 'rgba(239, 68, 68, 0.08)' : statusClass === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(59, 130, 246, 0.04)',
                        borderTop: `2px solid ${statusClass === 'danger' ? 'rgba(239, 68, 68, 0.25)' : statusClass === 'warning' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(59, 130, 246, 0.15)'}`,
                        transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease',
                        zIndex: 0
                      }}
                    />
                    
                    <div className="card-body" style={{ position: 'relative', zIndex: 1 }}>
                      {/* Header */}
                      <div className="sensor-header">
                        <div>
                          <h3 className="sensor-name">{device.name}</h3>
                          <span className="text-caption">
                            ID: {device.id} · Ultrasonic
                          </span>
                          <SensorAddress lat={device.lat} lng={device.lng} />
                        </div>
                        <span className={`badge badge-${statusClass === 'danger' ? 'error' : statusClass}`}>
                          {m.status.toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Metrics Grid */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-md)' }}>
                        {/* Primary: Flood Depth Gauge */}
                        <div style={{ padding: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <CircularGauge 
                            value={m.displayDepth} 
                            max={m.dangerThreshold + 10} 
                            size={140}
                            strokeWidth={12}
                            label={`${m.displayDepth.toFixed(1)} cm`}
                            subLabel="Flood Depth"
                            color={statusClass === 'danger' ? 'var(--color-error)' : statusClass === 'warning' ? 'var(--color-warning)' : 'var(--color-primary)'}
                          />
                        </div>
                        
                        {/* Secondary: Raw readings breakdown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, backgroundColor: 'var(--color-surface-container)', padding: '16px', borderRadius: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '8px' }}>
                            <span className="text-caption">📏 Sensor Height</span>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{m.sensorHeight} cm</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '4px' }}>
                            <span className="text-caption">📡 Dist. to Water</span>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{m.rawDistance.toFixed(1)} cm</span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', fontStyle: 'italic', textAlign: 'right', marginTop: 'auto' }}>
                            {m.floodDepth <= 0 
                              ? `Safe (water ${Math.abs(m.floodDepth).toFixed(1)}cm below surface)` 
                              : `Water is ${m.displayDepth.toFixed(1)}cm above surface`}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-outline-variant)' }}>
                            <span className="text-caption">
                              <span className="material-symbols-outlined" style={{ fontSize: '13px', verticalAlign: 'middle', color: 'var(--color-warning)' }}>warning</span>
                              {' '}Warn ≥ {m.warnThreshold} cm
                            </span>
                            <span className="text-caption">
                              <span className="material-symbols-outlined filled" style={{ fontSize: '13px', verticalAlign: 'middle', color: 'var(--color-error)' }}>error</span>
                              {' '}Danger ≥ {m.dangerThreshold} cm
                            </span>
                          </div>
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
              <h2 className="card-title">Live Flood Depth Trend</h2>
            </div>
            <div className="card-body" style={{ height: '400px' }}>
              {chartData.length < 2 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>ssid_chart</span>
                  <p style={{ marginTop: '8px' }}>Collecting data points... ({chartData.length}/2 minimum)</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" />
                    <XAxis dataKey="time" stroke="var(--color-on-surface-variant)" fontSize={10} minTickGap={20} tickMargin={8} />
                    <YAxis 
                      stroke="var(--color-on-surface-variant)" 
                      label={{ value: 'Flood Depth (cm)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-surface-container-lowest)', borderColor: 'var(--color-outline-variant)', borderRadius: '4px' }}
                      itemStyle={{ color: 'var(--color-on-surface)' }}
                      formatter={(value) => [`${value} cm`, 'Flood Depth']}
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
                    {/* Reference lines showing thresholds as FLOOD DEPTH levels */}
                    {activeIotDevice && (
                      <>
                        <ReferenceLine 
                          y={activeIotDevice.thresholdWarning ?? 10} 
                          stroke="var(--color-warning)" 
                          strokeDasharray="5 5"
                          label={{ value: `Warn (${activeIotDevice.thresholdWarning ?? 10}cm)`, position: 'right', fontSize: 10, fill: 'var(--color-warning)' }}
                        />
                        <ReferenceLine 
                          y={activeIotDevice.thresholdDanger ?? 30} 
                          stroke="var(--color-error)" 
                          strokeDasharray="5 5"
                          label={{ value: `Danger (${activeIotDevice.thresholdDanger ?? 30}cm)`, position: 'right', fontSize: 10, fill: 'var(--color-error)' }}
                        />
                      </>
                    )}
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
