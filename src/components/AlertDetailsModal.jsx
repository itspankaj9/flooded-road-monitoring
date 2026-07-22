import React from 'react';
import ReactDOM from 'react-dom';
import { useAppContext } from '../context/AppContext';
import SensorAddress from './SensorAddress';

const AlertDetailsModal = ({ alert, onClose }) => {
  const { weather, wifiIotDevices = [], sensors = [], t } = useAppContext();
  
  if (!alert) return null;

  // 1. Check if source device exists to extract address & coordinates (Only for IoT/Flood sensors)
  let sourceDevice = null;
  let deviceId = alert.sourceId;
  if (!deviceId && alert.id && alert.id.startsWith('ALT-IOT-')) {
    deviceId = alert.id.replace('ALT-IOT-', '');
  }

  if (deviceId) {
    sourceDevice = (wifiIotDevices || []).find(d => d.id === deviceId || d.name === deviceId)
      || (sensors || []).find(s => s.id === deviceId || s.name === deviceId);
  }

  // Fallback device lookup by parsing title
  if (!sourceDevice && alert.title) {
    let parsedName = '';
    if (alert.title.includes('at ')) {
      parsedName = alert.title.split('at ')[1]?.trim();
    } else if (alert.title.includes('RESOLVED: ')) {
      parsedName = alert.title.replace('RESOLVED: ', '').split(' \u2014 ')[0]?.trim();
    }
    if (parsedName) {
      sourceDevice = (wifiIotDevices || []).find(d => d.name === parsedName || d.id === parsedName)
        || (sensors || []).find(s => s.name === parsedName || s.id === parsedName);
    }
  }

  // 2. Classify Alert Type: Road Update vs Flood Alert
  const isRoadUpdate = alert.title.includes('Road marked as') || alert.title.includes('Closure') || alert.title.includes('Roadwork') || alert.title.includes('Maintenance') || alert.title.includes('Lane');
  const isFloodAlert = alert.title.includes('Flood') || alert.title.includes('Water level') || alert.type === 'danger' || alert.id?.startsWith('ALT-IOT-');

  // 3. Intelligent Title & Address Parser
  let problem = alert.title;
  let location = alert.location || '';

  if (isRoadUpdate) {
    if (alert.title.includes('Road marked as Full Closure: ')) {
      problem = 'Full Road Closure & Traffic Disruption';
      location = alert.title.replace('Road marked as Full Closure: ', '').trim();
    } else if (alert.title.includes('Road marked as Partial Lane: ')) {
      problem = 'Partial Lane Closure & Traffic Delay';
      location = alert.title.replace('Road marked as Partial Lane: ', '').trim();
    } else if (alert.title.includes(': ')) {
      const parts = alert.title.split(': ');
      problem = parts[0];
      location = parts.slice(1).join(': ').trim();
    }
  } else if (isFloodAlert) {
    if (alert.title.includes('CRITICAL: Flood Danger at ')) {
      problem = 'CRITICAL: High Water Level / Flood Danger';
      const locName = alert.title.replace('CRITICAL: Flood Danger at ', '').trim();
      location = sourceDevice?.location || locName;
    } else if (alert.title.includes('RESOLVED: ')) {
      problem = 'RESOLVED: Water Level Returned to Normal (Safe)';
      const rest = alert.title.replace('RESOLVED: ', '').split(' \u2014 ')[0];
      location = sourceDevice?.location || rest;
    } else if (alert.title.includes(': ')) {
      const parts = alert.title.split(': ');
      problem = parts[0];
      const rest = parts.slice(1).join(': ');
      if (rest) location = rest;
    }
  } else if (alert.title.includes(': ')) {
    const parts = alert.title.split(': ');
    problem = parts[0];
    const rest = parts.slice(1).join(': ');
    if (rest) location = rest;
  }

  if (!location) {
    location = sourceDevice?.location || sourceDevice?.name || 'Specified Infrastructure Zone';
  }

  const hasFullAddress = location && (location.includes(',') || location.length > 25);

  const displayDate = alert.updatedAt
    ? new Date(alert.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : alert.date || new Date().toLocaleString();
    
  const typeIcon = isRoadUpdate 
    ? 'construction' 
    : (alert.type === 'error' || alert.type === 'danger') ? 'error' : alert.type === 'success' ? 'check_circle' : 'warning';

  const typeColor = isRoadUpdate 
    ? 'var(--color-warning, #f59e0b)' 
    : (alert.type === 'error' || alert.type === 'danger') ? 'var(--color-error, #ef4444)' : alert.type === 'success' ? 'var(--color-success, #22c55e)' : 'var(--color-primary, #3b82f6)';

  const categoryLabel = isRoadUpdate ? 'Road Update' : isFloodAlert ? 'Flood Alert' : (alert.type || 'Notice').toUpperCase();
  const color = typeColor;

  const modalContent = (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{
          background: 'var(--color-surface, #1e1e2e)',
          borderRadius: '20px',
          padding: '28px',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--color-outline-variant, rgba(255,255,255,0.1))',
          color: 'var(--color-on-surface, #ffffff)',
          position: 'relative',
          boxSizing: 'border-box',
          margin: 'auto',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-outline-variant, rgba(255,255,255,0.1))', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined filled" style={{ color: color, fontSize: '28px' }}>
              {typeIcon}
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Alert Details</h2>
              <span style={{ fontSize: '12px', color: color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {categoryLabel}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: 'inherit', 
              cursor: 'pointer', 
              borderRadius: '50%', 
              width: '36px', 
              height: '36px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        {/* Table Details */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
          <tbody>
            <tr>
              <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--color-outline-variant, rgba(255,255,255,0.08))', color: 'var(--color-on-surface-variant, #999)', fontWeight: 500, width: '35%' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>info</span>
                Problem Info
              </td>
              <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--color-outline-variant, rgba(255,255,255,0.08))', fontWeight: '400', color: color }}>
                {problem}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--color-outline-variant, rgba(255,255,255,0.08))', color: 'var(--color-on-surface-variant, #999)', fontWeight: 500 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>location_on</span>
                Address / Location
              </td>
              <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--color-outline-variant, rgba(255,255,255,0.08))', lineHeight: '1.4' }}>
                <div style={{ fontWeight: '400' }}>{location}</div>
                {!isRoadUpdate && !hasFullAddress && sourceDevice?.lat && sourceDevice?.lng && (
                  <SensorAddress lat={sourceDevice.lat} lng={sourceDevice.lng} />
                )}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--color-outline-variant, rgba(255,255,255,0.08))', color: 'var(--color-on-surface-variant, #999)', fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>warning</span>
                Category Level
              </td>
              <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--color-outline-variant, rgba(255,255,255,0.08))' }}>
                <span style={{ background: `${color}25`, color: color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                  {categoryLabel}
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--color-outline-variant, rgba(255,255,255,0.08))', color: 'var(--color-on-surface-variant, #999)', fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>schedule</span>
                Timestamp
              </td>
              <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--color-outline-variant, rgba(255,255,255,0.08))' }}>
                {displayDate}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--color-outline-variant, rgba(255,255,255,0.08))', color: 'var(--color-on-surface-variant, #999)', fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>cloud</span>
                Live Weather
              </td>
              <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--color-outline-variant, rgba(255,255,255,0.08))' }}>
                {weather ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={weather.iconUrl} alt="weather" style={{ width: '24px', height: '24px' }} />
                    <span style={{ fontWeight: '500' }}>
                      {weather.temp}°C, {weather.description} {weather.isRaining ? '🌧️ (Raining)' : '☀️ (No Rain)'}
                    </span>
                  </div>
                ) : 'Data unavailable'}
              </td>
            </tr>
          </tbody>
        </table>
        
        {/* Action Button */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            className="btn btn-primary"
            style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: '600' }}
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default AlertDetailsModal;
