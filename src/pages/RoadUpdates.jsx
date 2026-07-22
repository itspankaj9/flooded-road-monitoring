import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import MapView from '../components/MapView';
import './RoadUpdates.css';

const statusBadgeClass = (status) => {
  if (status.includes('Full')) return 'badge-error';
  if (status.includes('Partial')) return 'badge-warning';
  return 'badge-info';
};

const RoadUpdates = () => {
  const { t, roadworks } = useAppContext();
  const [showAltRoutes, setShowAltRoutes] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const fullClosures = roadworks.filter(r => r.status && r.status.toLowerCase().includes('full'));
  const partialLanes = roadworks.filter(r => r.status && (r.status.toLowerCase().includes('partial') || r.status.toLowerCase().includes('lane')));
  const maintenance = roadworks.filter(r => r.status && (r.status.toLowerCase().includes('maint') || r.status.toLowerCase().includes('repair')));

  return (
    <div className="road-updates container">
      <div className="page-header">
        <div className="title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className="material-symbols-outlined filled page-icon"
              style={{ fontSize: '24px', color: 'var(--color-on-surface)' }}
            >
              traffic
            </span>
            <h1
              className="page-title"
              style={{ margin: 0, fontSize: 'clamp(20px, 2vw, 26px)', fontWeight: 700 }}
            >
              <span className="desktop-title">{t('road_hero_title')}</span>
              <span className="mobile-title">{t('road_updates')}</span>
            </h1>
          </div>
          <button 
            onClick={() => setShowInfo(!showInfo)} 
            title="Toggle Description"
            style={{ 
              background: showInfo ? 'var(--color-primary)' : 'var(--color-surface-container-low)', 
              border: '1px solid var(--color-outline-variant)', 
              color: showInfo ? '#ffffff' : 'var(--color-on-surface-variant)', 
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
        {showInfo && (
          <p className="page-description" style={{ marginTop: '12px' }}>
            {t('road_hero_desc')}
          </p>
        )}
      </div>
        {/* Live Road Map */}
      <div className="road-map-section">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ textAlign: 'left' }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              <span className="material-symbols-outlined filled" style={{ color: 'var(--color-on-surface)' }}>map</span>
              {t('live_road_map')}
            </h2>
            <span className="text-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>info</span>
              {t('map_info')}
            </span>
          </div>
          <div>
            <button 
              className={`btn btn-sm ${showAltRoutes ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setShowAltRoutes(!showAltRoutes)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {showAltRoutes ? 'visibility' : 'visibility_off'}
              </span>
              {t('alt_routes')}
            </button>
          </div>
        </div>
        <MapView height="400px" showRoadMarkers={true} showAltRoutes={showAltRoutes} showSensors={false} />
      </div>

      <div className="ru-grid">
        {/* Active Projects List */}
        <div className="active-projects">
          <h2 className="section-title">
            <span className="material-symbols-outlined filled">add_road</span>
            Active Projects & Closures
          </h2>

          {roadworks.length === 0 ? (
            <div className="empty-state card">
              <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>check_road</span>
                <p style={{ opacity: 0.5, marginTop: '12px' }}>No active road disruptions at this time.</p>
                <p className="text-caption" style={{ marginTop: '4px' }}>Road closures and maintenance events published by admins will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="roadworks-list">
              {roadworks.map(rw => (
                <div key={rw.id} className="roadwork-item card">
                  <div className="rw-header">
                    <h3 className="rw-location">{rw.location}</h3>
                    {rw.reason && <p className="rw-reason">{rw.reason}</p>}
                    <div className="rw-badge-container">
                      <span className={`rw-status badge ${statusBadgeClass(rw.status)}`}>
                        {rw.status}
                      </span>
                    </div>
                  </div>

                  {rw.altRoute && (
                    <div className="rw-detour">
                      <strong>Detour:</strong> {rw.altRoute}
                    </div>
                  )}

                  <div className="rw-progress-wrapper">
                    <div className="rw-progress-header">
                      <span>Completion Progress</span>
                      <span className="rw-progress-text">{rw.progress}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar" style={{ width: `${rw.progress}%` }}></div>
                    </div>
                  </div>

                  <div className="rw-footer">
                    <span>Updated: {rw.updated}</span>
                    <span>ID: {rw.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Summary Sidebar */}
        <div className="community-impact">
          <h2 className="section-title">
            <span className="material-symbols-outlined filled">bar_chart</span>
            Road Status Summary
          </h2>
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <div className="card-body">
              <div className="status-summary">
                <div className="summary-item">
                  <div className="summary-count error">{fullClosures.length}</div>
                  <span className="text-caption">Full Closures</span>
                </div>
                <div className="summary-item">
                  <div className="summary-count warning">{partialLanes.length}</div>
                  <span className="text-caption">Partial Lanes</span>
                </div>
                <div className="summary-item">
                  <div className="summary-count info">{maintenance.length}</div>
                  <span className="text-caption">Maintenance</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent updates */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <span className="material-symbols-outlined">schedule</span>
                Recent Updates
              </h3>
            </div>
            <div className="card-body">
              {roadworks.length === 0 ? (
                <p className="text-caption" style={{ textAlign: 'center', padding: '16px 0', opacity: 0.5 }}>No updates yet.</p>
              ) : (
                roadworks.slice(0, 5).map(rw => (
                  <div key={rw.id} className="recent-update-item">
                    <span className={`dot ${statusBadgeClass(rw.status).replace('badge-', '')}`}></span>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{rw.location}</p>
                      <p className="text-caption">{rw.status} · {rw.updated}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadUpdates;
