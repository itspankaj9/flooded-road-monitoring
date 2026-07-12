import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import './CitizenAlerts.css';

const typeLabel = {
  error: 'Critical',
  warning: 'Warning',
  info: 'Information',
  success: 'Resolved',
  danger: 'Danger',
};

const typeIcon = {
  error: 'error',
  warning: 'warning',
  info: 'info',
  success: 'check_circle',
  danger: 'error',
};

const CitizenAlerts = () => {
  const { t, alerts } = useAppContext();
  const [filter, setFilter] = useState('all');

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.type === filter);

  return (
    <div className="citizen-alerts container">
      <div className="page-header">
        <div className="title-row">
          <span className="material-symbols-outlined filled page-icon">notifications_active</span>
          <h1 className="page-title">{t('alert_hero_title')}</h1>
        </div>
        <p className="page-description">
          {t('alert_hero_desc')}
        </p>
      </div>

      <div className="ca-grid">
        {/* Main Alerts Feed */}
        <div className="alerts-feed card">
          <div className="card-header">
            <h2 className="card-title">{t('active_emergency_alerts')}</h2>
            <div className="card-header-actions">
              <select
                className="select-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="error">Critical</option>
                <option value="danger">Danger</option>
                <option value="warning">Warnings</option>
                <option value="info">Information</option>
                <option value="success">Resolved</option>
              </select>
            </div>
          </div>

          <div className="alerts-list">
            {filteredAlerts.length === 0 ? (
              <div className="no-alerts">
                <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>notifications_off</span>
                <p style={{ opacity: 0.5, marginTop: '8px' }}>
                  {filter === 'all' ? 'No active alerts at this time.' : `No ${typeLabel[filter] ?? filter} alerts.`}
                </p>
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const displayDate = alert.updatedAt
                  ? new Date(alert.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                  : alert.date;
                return (
                <div key={alert.id} className={`alert-item type-${alert.type}`}>
                  <div className="alert-icon-col">
                    <span className="material-symbols-outlined filled">
                      {typeIcon[alert.type] ?? 'info'}
                    </span>
                  </div>
                  <div className="alert-content-col">
                    <div className="alert-meta">
                      <span className="alert-category">{(typeLabel[alert.type] ?? alert.type).toUpperCase()}</span>
                      <span className="alert-date">{displayDate}</span>
                    </div>
                    <h3 className="alert-title">{alert.title}</h3>
                    {alert.description && (
                      <p className="alert-body">{alert.description}</p>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* Preferences Sidebar */}
        <div className="preferences-sidebar">
          {/* Alert Summary */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="material-symbols-outlined">analytics</span>
                Alert Summary
              </h2>
            </div>
            <div className="card-body">
              {[
                { type: 'error', label: 'Critical', color: 'var(--color-error)' },
                { type: 'danger', label: 'Danger', color: 'var(--color-error)' },
                { type: 'warning', label: 'Warning', color: 'var(--color-warning)' },
                { type: 'info', label: 'Info', color: 'var(--color-primary)' },
                { type: 'success', label: 'Resolved', color: 'var(--color-success)' },
              ].map(({ type, label, color }) => (
                <div key={type} className="alert-summary-row">
                  <span className="alert-summary-label">{label}</span>
                  <span className="alert-summary-count" style={{ color }}>
                    {alerts.filter(a => a.type === type).length}
                  </span>
                </div>
              ))}
              <div className="alert-summary-row" style={{ borderTop: '1px solid var(--color-outline-variant)', marginTop: '8px', paddingTop: '8px' }}>
                <strong>Total</strong>
                <strong>{alerts.length}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenAlerts;
