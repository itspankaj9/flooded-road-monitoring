import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { roadStatusColors } from '../data/MockIoTService';
import MapView from '../components/MapView';
import SensorAddress from '../components/SensorAddress';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const {
    sensors,
    roadworks,
    alerts,
    updateSensorManual,
    addSensor,
    removeSensor,
    addRoadwork,
    removeRoadwork,
    editRoadwork,
    addAlert,
    upsertAlertForSource,
    removeAlert,
    addRoadMarker,
    roadMarkers,
    removeRoadMarker,
    wifiIotDevices,
    wifiSensorData,
    wifiSensorHistory,
    addWifiIotDevice,
    removeWifiIotDevice,
    editWifiIotDevice,
    logoutAdminContext,
    t,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState('iot');
  const [markingMode, setMarkingMode] = useState('coords'); // 'coords' or 'draw'

  // Roadwork form
  const [newRoadwork, setNewRoadwork] = useState({ location: '', status: 'Full Closure', reason: '', altRoute: '', progress: 0 });
  // Edit roadwork
  const [editingRW, setEditingRW] = useState(null);
  const [editRWData, setEditRWData] = useState({});

  // New sensor form
  const [newSensor, setNewSensor] = useState({ name: '', type: 'water_level', value: '', unit: 'm', thresholdWarning: '', thresholdDanger: '', lat: '19.0760', lng: '72.8777' });

  // Alert form
  const [newAlertData, setNewAlertData] = useState({ title: '', type: 'info', description: '' });

  // Map marking
  const [markingPoints, setMarkingPoints] = useState([]);
  const [altMarkingPoints, setAltMarkingPoints] = useState([]);
  const [markingTarget, setMarkingTarget] = useState('main'); // 'main' or 'alt'
  const [roadMarkForm, setRoadMarkForm] = useState({ name: '', status: 'Full Closure', reason: '', altRoute: '' });
  const [isMarking, setIsMarking] = useState(false);

  // Sensor override values
  const [overrideValues, setOverrideValues] = useState({});

  // Coordinate-based marking
  const [coordPointA, setCoordPointA] = useState(null);
  const [coordPointB, setCoordPointB] = useState(null);
  const [coordCapturing, setCoordCapturing] = useState(null); // 'A', 'B', or null
  const [coordCategory, setCoordCategory] = useState('Full Closure');
  const [coordReason, setCoordReason] = useState('');
  const [coordError, setCoordError] = useState('');
  const [coordAddressA, setCoordAddressA] = useState('');
  const [coordAddressB, setCoordAddressB] = useState('');
  const [coordAccuracyA, setCoordAccuracyA] = useState(null);
  const [coordAccuracyB, setCoordAccuracyB] = useState(null);
  const [coordEditingA, setCoordEditingA] = useState(false);
  const [coordEditingB, setCoordEditingB] = useState(false);
  const [coordEditLatA, setCoordEditLatA] = useState('');
  const [coordEditLngA, setCoordEditLngA] = useState('');
  const [coordEditLatB, setCoordEditLatB] = useState('');
  const [coordEditLngB, setCoordEditLngB] = useState('');
  const [coordRoadName, setCoordRoadName] = useState('');
  const [coordAltRoute, setCoordAltRoute] = useState('');
  const [coordFetchingAddr, setCoordFetchingAddr] = useState(null); // 'A' or 'B'

  // IoT Device form & state
  const [newIotDevice, setNewIotDevice] = useState({ name: '', location: '', lat: '19.0760', lng: '72.8777', sensorHeightCm: '200', thresholdWarning: '10', thresholdDanger: '30' });
  const [editingIotDevice, setEditingIotDevice] = useState(null);
  const [editIotData, setEditIotData] = useState({});
  const [expandedDeviceId, setExpandedDeviceId] = useState(null);

  const detectAddressFromCoords = async (lat, lng, isEdit = false) => {
    if (!lat || !lng) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        if (isEdit) {
          setEditIotData(prev => ({ ...prev, location: data.display_name }));
        } else {
          setNewIotDevice(prev => ({ ...prev, location: data.display_name }));
        }
      }
    } catch (err) {
      console.error('Failed to detect address:', err);
    }
  };

  // ----- Coordinate Marking Helpers -----
  const calculateDistance = (pA, pB) => {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(pB.lat - pA.lat);
    const dLng = toRad(pB.lng - pA.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(pA.lat)) * Math.cos(toRad(pB.lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (meters) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${Math.round(meters)} m`;
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data?.display_name) {
        const addr = data.address || {};
        const shortName = addr.road || addr.pedestrian || addr.neighbourhood || addr.suburb || '';
        const area = addr.suburb || addr.city_district || addr.city || '';
        return {
          full: data.display_name,
          short: shortName ? `${shortName}${area ? `, ${area}` : ''}` : data.display_name.split(',').slice(0, 2).join(','),
        };
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
    return { full: '', short: '' };
  };

  const captureGPSPoint = (target) => {
    setCoordCapturing(target);
    setCoordError('');
    if (!navigator.geolocation) {
      setCoordError('Geolocation is not supported by your browser.');
      setCoordCapturing(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        const accuracy = position.coords.accuracy; // meters

        if (target === 'A') {
          setCoordPointA(point);
          setCoordAccuracyA(accuracy);
          setCoordEditLatA(point.lat.toFixed(6));
          setCoordEditLngA(point.lng.toFixed(6));
          // Fetch address
          setCoordFetchingAddr('A');
          const addr = await reverseGeocode(point.lat, point.lng);
          setCoordAddressA(addr.short || addr.full);
          if (!coordRoadName) setCoordRoadName(addr.short || addr.full);
          setCoordFetchingAddr(null);
        } else {
          setCoordPointB(point);
          setCoordAccuracyB(accuracy);
          setCoordEditLatB(point.lat.toFixed(6));
          setCoordEditLngB(point.lng.toFixed(6));
          setCoordFetchingAddr('B');
          const addr = await reverseGeocode(point.lat, point.lng);
          setCoordAddressB(addr.short || addr.full);
          setCoordFetchingAddr(null);
        }
        setCoordCapturing(null);
      },
      (error) => {
        const msgs = {
          1: 'Location permission denied. Please allow access in your browser settings.',
          2: 'Position unavailable. Ensure GPS is enabled.',
          3: 'Location request timed out. Please try again.',
        };
        setCoordError(msgs[error.code] || 'Failed to get location.');
        setCoordCapturing(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const saveCoordEdit = (target) => {
    if (target === 'A') {
      const lat = parseFloat(coordEditLatA);
      const lng = parseFloat(coordEditLngA);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setCoordPointA({ lat, lng });
        setCoordAccuracyA(null);
        setCoordEditingA(false);
        // Re-fetch address for edited coords
        reverseGeocode(lat, lng).then(addr => setCoordAddressA(addr.short || addr.full));
      } else {
        setCoordError('Invalid coordinates for Point A. Lat: -90 to 90, Lng: -180 to 180.');
      }
    } else {
      const lat = parseFloat(coordEditLatB);
      const lng = parseFloat(coordEditLngB);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setCoordPointB({ lat, lng });
        setCoordAccuracyB(null);
        setCoordEditingB(false);
        reverseGeocode(lat, lng).then(addr => setCoordAddressB(addr.short || addr.full));
      } else {
        setCoordError('Invalid coordinates for Point B. Lat: -90 to 90, Lng: -180 to 180.');
      }
    }
  };

  const handleSubmitCoordMark = async (e) => {
    e.preventDefault();
    if (!coordPointA || !coordPointB) return;

    const roadName = coordRoadName || coordAddressA || `Road at ${coordPointA.lat.toFixed(4)}, ${coordPointA.lng.toFixed(4)}`;

    addRoadMarker({
      id: `RM-COORD-${Date.now()}`,
      roadworkId: `RW-COORD-${Date.now()}`,
      name: roadName,
      status: coordCategory,
      reason: coordReason || coordCategory,
      altRoute: coordAltRoute,
      color: roadStatusColors[coordCategory] || '#ef4444',
      coordinates: [
        [coordPointA.lng, coordPointA.lat],
        [coordPointB.lng, coordPointB.lat],
      ],
      altCoordinates: [],
    });

    // Reset everything
    setCoordPointA(null);
    setCoordPointB(null);
    setCoordCategory('Full Closure');
    setCoordReason('');
    setCoordError('');
    setCoordAddressA('');
    setCoordAddressB('');
    setCoordAccuracyA(null);
    setCoordAccuracyB(null);
    setCoordRoadName('');
    setCoordAltRoute('');
    setCoordEditingA(false);
    setCoordEditingB(false);
  };

  const handleSensorOverride = (e, id) => {
    e.preventDefault();
    const val = parseFloat(overrideValues[id]);
    if (!isNaN(val)) {
      updateSensorManual(id, val);
      setOverrideValues(prev => ({ ...prev, [id]: '' }));
    }
  };

  const handleAddSensor = (e) => {
    e.preventDefault();
    const s = {
      id: `SENSOR-${Date.now()}`,
      name: newSensor.name,
      type: newSensor.type,
      value: parseFloat(newSensor.value) || 0,
      unit: newSensor.unit,
      status: 'normal',
      thresholdWarning: parseFloat(newSensor.thresholdWarning) || 0,
      thresholdDanger: parseFloat(newSensor.thresholdDanger) || 0,
      lat: parseFloat(newSensor.lat) || 19.076,
      lng: parseFloat(newSensor.lng) || 72.8777,
    };
    addSensor(s);
    setNewSensor({ name: '', type: 'water_level', value: '', unit: 'm', thresholdWarning: '', thresholdDanger: '', lat: '19.0760', lng: '72.8777' });
  };

  const handleAddRoadwork = (e) => {
    e.preventDefault();
    if (!newRoadwork.location || !newRoadwork.reason) return;
    addRoadwork({
      id: `RW-MANUAL-${Date.now()}`,
      ...newRoadwork,
      updated: 'Just now',
    });
    upsertAlertForSource(`RW-MANUAL-${newRoadwork.location}`, {
      id: `AL-RW-${newRoadwork.location}`,
      title: `New road disruption: ${newRoadwork.location} — ${newRoadwork.status}`,
      type: newRoadwork.status === 'Full Closure' ? 'error' : 'warning',
      date: new Date().toLocaleDateString(),
    });
    setNewRoadwork({ location: '', status: 'Full Closure', reason: '', altRoute: '', progress: 0 });
  };

  const handleSaveEditRW = (e) => {
    e.preventDefault();
    editRoadwork(editingRW, editRWData);
    setEditingRW(null);
  };

  const handleAddAlert = (e) => {
    e.preventDefault();
    if (!newAlertData.title.trim()) return;
    addAlert({
      id: `AL-ADMIN-${Date.now()}`,
      title: newAlertData.title.trim(),
      type: newAlertData.type,
      description: newAlertData.description.trim(),
      date: new Date().toLocaleDateString(),
    });
    setNewAlertData({ title: '', type: 'info', description: '' });
  };

  const handleMapClick = async (coords) => {
    if (!isMarking) return;
    
    if (markingTarget === 'main') {
      setMarkingPoints(prev => [...prev, [coords.lng, coords.lat]]);
      
      if (markingPoints.length === 0 && !roadMarkForm.name) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`);
          const data = await res.json();
          if (data && data.display_name) {
            setRoadMarkForm(prev => ({ ...prev, name: data.display_name }));
          }
        } catch (err) {
          console.error("Geocoding error:", err);
        }
      }
    } else if (markingTarget === 'alt') {
      setAltMarkingPoints(prev => [...prev, [coords.lng, coords.lat]]);
      
      if (altMarkingPoints.length === 0 && !roadMarkForm.altRoute) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`);
          const data = await res.json();
          if (data && data.display_name) {
            setRoadMarkForm(prev => ({ ...prev, altRoute: data.display_name }));
          }
        } catch (err) {
          console.error("Geocoding error:", err);
        }
      }
    }
  };

  const handleSubmitRoadMark = (e) => {
    e.preventDefault();
    if (markingPoints.length < 2 || !roadMarkForm.name) return;
    addRoadMarker({
      id: `RM-ADMIN-${Date.now()}`,
      roadworkId: `RW-MAP-${Date.now()}`,
      name: roadMarkForm.name,
      status: roadMarkForm.status,
      reason: roadMarkForm.reason,
      altRoute: roadMarkForm.altRoute,
      color: roadStatusColors[roadMarkForm.status] || '#ef4444',
      coordinates: markingPoints,
      altCoordinates: altMarkingPoints.length >= 2 ? altMarkingPoints : [],
    });
    setMarkingPoints([]);
    setAltMarkingPoints([]);
    setRoadMarkForm({ name: '', status: 'Full Closure', reason: '', altRoute: '' });
    setIsMarking(false);
    setMarkingTarget('main');
  };

  const tabs = [
    { id: 'iot', label: 'IoT Devices', icon: 'wifi' },
    { id: 'roadworks', label: 'Roadworks', icon: 'edit_road' },
    { id: 'alerts', label: 'Alerts', icon: 'notifications' },
    { id: 'map', label: 'Map Marking', icon: 'map' },
  ];

  return (
    <div className="admin-dashboard container">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="section-title">
            <span className="material-symbols-outlined filled admin-portal-icon">admin_panel_settings</span>
            {t('admin_portal')}
          </h1>
          <p className="text-caption">{t('manage_infrastructure')}</p>
        </div>
        <button className="btn-secondary" onClick={logoutAdminContext} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined">logout</span>
          {t('logout')}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      {/* ===== IoT DEVICES TAB ===== */}
      {activeTab === 'iot' && (
        <div className="admin-tab-content">
          {/* IoT Map */}
          <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div className="card-header">
              <h2 className="card-title">
                <span className="material-symbols-outlined">map</span>
                IoT Sensors Map
              </h2>
            </div>
            <div className="card-body" style={{ padding: 0, borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', overflow: 'hidden' }}>
              <MapView height="400px" showRoadMarkers={false} showSensors={true} />
            </div>
          </div>

          {/* Registered Devices List */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="material-symbols-outlined">router</span>
                Registered IoT Devices ({wifiIotDevices.length})
              </h2>
            </div>
            <div className="card-body">
              {wifiIotDevices.length === 0 ? (
                <p className="text-caption" style={{ textAlign: 'center', padding: '24px', opacity: 0.5 }}>
                  No IoT devices registered. Add one below.
                </p>
              ) : (
                <div className="iot-devices-list">
                  {wifiIotDevices.map(device => (
                    <div key={device.id} className={`iot-device-admin-item status-border-${device.status}`}>
                      {editingIotDevice === device.id ? (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          editWifiIotDevice({ ...device, ...editIotData });
                          setEditingIotDevice(null);
                        }} className="edit-iot-form">
                          <div className="form-grid-2">
                            <div className="form-group">
                              <label>Device Name</label>
                              <input className="input-field" value={editIotData.name ?? device.name} onChange={e => setEditIotData(v => ({ ...v, name: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                              <label>Location / Address</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input className="input-field" placeholder="e.g. Bandra Kurla Complex, Mumbai" value={editIotData.location ?? device.location ?? ''} onChange={e => setEditIotData(v => ({ ...v, location: e.target.value }))} style={{ flex: 1 }} />
                                <button type="button" className="btn btn-sm btn-outline" onClick={() => detectAddressFromCoords(editIotData.lat ?? device.lat, editIotData.lng ?? device.lng, true)} title="Auto-detect address from Lat/Lng">
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>my_location</span>
                                </button>
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Latitude</label>
                              <input type="number" step="0.0001" className="input-field" value={editIotData.lat ?? device.lat} onChange={e => setEditIotData(v => ({ ...v, lat: parseFloat(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label>Longitude</label>
                              <input type="number" step="0.0001" className="input-field" value={editIotData.lng ?? device.lng} onChange={e => setEditIotData(v => ({ ...v, lng: parseFloat(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label>Sensor Height (cm)</label>
                              <input type="number" step="1" className="input-field" value={editIotData.sensorHeightCm ?? device.sensorHeightCm ?? 200} onChange={e => setEditIotData(v => ({ ...v, sensorHeightCm: parseFloat(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label>Water Depth Warning (≥ cm)</label>
                              <input type="number" step="1" className="input-field" value={editIotData.thresholdWarning ?? device.thresholdWarning} onChange={e => setEditIotData(v => ({ ...v, thresholdWarning: parseFloat(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label>Water Depth Danger (≥ cm)</label>
                              <input type="number" step="1" className="input-field" value={editIotData.thresholdDanger ?? device.thresholdDanger} onChange={e => setEditIotData(v => ({ ...v, thresholdDanger: parseFloat(e.target.value) }))} />
                            </div>
                          </div>
                          <div className="edit-rw-actions" style={{ marginTop: '8px' }}>
                            <button type="submit" className="btn btn-primary btn-sm">Save</button>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingIotDevice(null)}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          {(() => {
                            const floodDepth = (device.sensorHeightCm || 200) - (device.latestDistanceCm || 0);
                            const localStatus = floodDepth >= (device.thresholdDanger ?? 30) ? 'danger' : floodDepth >= (device.thresholdWarning ?? 10) ? 'warning' : 'normal';
                            return (
                              <div className="iot-device-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: localStatus === 'danger' ? '#ef4444' : localStatus === 'warning' ? '#f59e0b' : '#22c55e' }}>sensors</span>
                                  <strong>{device.name}</strong>
                                  <span className={`badge badge-${localStatus === 'danger' ? 'error' : localStatus === 'warning' ? 'warning' : 'success'}`}>
                                    {localStatus.toUpperCase()}
                                  </span>
                                </div>
                                <div className="iot-data-pills" style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <span className="data-pill"><strong>ID:</strong> {device.id}</span>
                                  <span className="data-pill"><span className="material-symbols-outlined filled" style={{ fontSize: '14px', color: 'var(--color-primary)' }}>location_on</span> {device.lat.toFixed(4)}, {device.lng.toFixed(4)}</span>
                                  <span className="data-pill"><span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>straighten</span> Height: {device.sensorHeightCm || 200} cm</span>
                                  <span className="data-pill pill-success">
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>water</span> Depth: {Math.max(0, floodDepth).toFixed(1)} cm
                                  </span>
                                  <span className="data-pill pill-warning">
                                    ⚠️ Warn ≥{device.thresholdWarning}cm
                                  </span>
                                  <span className="data-pill pill-danger">
                                    🔴 Danger ≥{device.thresholdDanger}cm
                                  </span>
                                </div>
                                <SensorAddress lat={device.lat} lng={device.lng} />
                              </div>
                            );
                          })()}
                          <div className="rw-admin-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button className="btn btn-sm btn-primary" onClick={() => setExpandedDeviceId(expandedDeviceId === device.id ? null : device.id)}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{expandedDeviceId === device.id ? 'expand_less' : 'expand_more'}</span>
                              {expandedDeviceId === device.id ? 'Hide Details' : 'Show Details'}
                            </button>
                            <button className="btn btn-sm btn-outline" onClick={() => { setEditingIotDevice(device.id); setEditIotData({ ...device }); }} title="Edit device">
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => removeWifiIotDevice(device.id)} title="Delete device">
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                            </button>
                          </div>
                        </>
                      )}
                      
                      {/* EXPANDED LIVE VIEW */}
                      {expandedDeviceId === device.id && (
                        <div style={{ width: '100%', marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-outline-variant)' }}>
                          <h3 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '16px' }}>Live Readings</h3>
                          <div className="live-readings-grid">
                            {/* Live Reading Card */}
                            <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--color-surface)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--spacing-sm)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>water</span>
                                <span>Computed Flood Depth</span>
                              </div>
                              {wifiSensorData ? (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '36px', fontWeight: '800', color: 'var(--color-primary)' }}>
                                      {Math.max(0, (device.sensorHeightCm || 200) - wifiSensorData.distanceCm).toFixed(1)}
                                    </span>
                                    <span style={{ fontWeight: '600', color: 'var(--color-on-surface-variant)' }}>cm</span>
                                  </div>
                                  <div style={{ marginBottom: '16px' }}>
                                    {(() => {
                                      const floodDepth = (device.sensorHeightCm || 200) - wifiSensorData.distanceCm;
                                      const level = floodDepth >= (device.thresholdDanger ?? 30) ? 'danger' : floodDepth >= (device.thresholdWarning ?? 10) ? 'warning' : 'normal';
                                      const bg = level === 'danger' ? '#fef2f2' : level === 'warning' ? '#fffbeb' : '#f0fdf4';
                                      const fg = level === 'danger' ? '#ef4444' : level === 'warning' ? '#f59e0b' : '#22c55e';
                                      const icon = level === 'danger' ? 'crisis_alert' : level === 'warning' ? 'warning' : 'check_circle';
                                      const text = level === 'danger' ? 'CRITICAL' : level === 'warning' ? 'ELEVATED' : 'NORMAL';
                                      return (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '4px', backgroundColor: bg, color: fg, fontSize: '13px', fontWeight: '600' }}>
                                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{icon}</span>
                                          {text}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>
                                    {new Date(wifiSensorData.createdAt).toLocaleTimeString()} · Raw Dist: {wifiSensorData.distanceCm.toFixed(1)}cm
                                  </div>
                                </>
                              ) : (
                                <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Waiting for data...</p>
                              )}
                            </div>
                            
                            {/* Live Chart */}
                            <div className="card live-chart-card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--color-surface)' }}>
                              {wifiSensorHistory && wifiSensorHistory.length >= 2 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={wifiSensorHistory.map((r, i) => ({
                                    time: new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                                    distance: r.distanceCm,
                                    index: i,
                                  }))} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id="iotAdminGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" />
                                    <XAxis dataKey="time" stroke="var(--color-on-surface-variant)" fontSize={10} interval="preserveStartEnd" />
                                    <YAxis stroke="var(--color-on-surface-variant)" fontSize={11} unit=" cm" />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-container-lowest)', borderColor: 'var(--color-outline-variant)', borderRadius: '8px' }} itemStyle={{ color: 'var(--color-on-surface)' }} formatter={(val) => [`${val.toFixed(2)} cm`, 'Distance']} />
                                    <ReferenceLine y={device.thresholdDanger} label={{ value: 'Danger', position: 'right', fill: '#ef4444', fontSize: 11 }} stroke="#ef4444" strokeDasharray="4 4" />
                                    <ReferenceLine y={device.thresholdWarning} label={{ value: 'Warning', position: 'right', fill: '#f59e0b', fontSize: 11 }} stroke="#f59e0b" strokeDasharray="4 4" />
                                    <Area type="monotone" dataKey="distance" stroke="#22d3ee" strokeWidth={2} fill="url(#iotAdminGrad)" dot={false} activeDot={{ r: 4, stroke: '#22d3ee', strokeWidth: 2 }} />
                                  </AreaChart>
                                </ResponsiveContainer>
                              ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface-variant)' }}>
                                  Collecting data...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Register New IoT Device */}
          <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
            <div className="card-header">
              <h2 className="card-title">
                <span className="material-symbols-outlined">add_circle</span>
                Register New IoT Device
              </h2>
            </div>
            <div className="card-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const device = {
                  id: `IOT-${Date.now()}`,
                  name: newIotDevice.name,
                  location: newIotDevice.location || '',
                  lat: parseFloat(newIotDevice.lat) || 19.076,
                  lng: parseFloat(newIotDevice.lng) || 72.8777,
                  sensorHeightCm: parseFloat(newIotDevice.sensorHeightCm) || 200,
                  thresholdWarning: parseFloat(newIotDevice.thresholdWarning) || 10,
                  thresholdDanger: parseFloat(newIotDevice.thresholdDanger) || 30,
                  status: 'normal',
                  latestDistanceCm: 0,
                };
                addWifiIotDevice(device);
                setNewIotDevice({ name: '', location: '', lat: '19.0760', lng: '72.8777', sensorHeightCm: '200', thresholdWarning: '10', thresholdDanger: '30' });
              }} className="sensor-add-form">
                <div className="form-grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Device Name</label>
                    <input type="text" className="input-field" placeholder="e.g. Mithi River Bridge Ultrasonic Sensor" value={newIotDevice.name} onChange={e => setNewIotDevice(v => ({ ...v, name: e.target.value }))} required />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <div className="form-label-header">
                      <label style={{ margin: 0 }}>Location / Street Address</label>
                      <button 
                        type="button" 
                        onClick={() => detectAddressFromCoords(newIotDevice.lat, newIotDevice.lng, false)}
                        className="btn-auto-detect"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>my_location</span>
                        Auto-detect from Coords
                      </button>
                    </div>
                    <input type="text" className="input-field" placeholder="e.g. Bandra Kurla Complex, Mumbai" value={newIotDevice.location} onChange={e => setNewIotDevice(v => ({ ...v, location: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Latitude</label>
                    <input type="number" step="0.0001" className="input-field" value={newIotDevice.lat} onChange={e => setNewIotDevice(v => ({ ...v, lat: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Longitude</label>
                    <input type="number" step="0.0001" className="input-field" value={newIotDevice.lng} onChange={e => setNewIotDevice(v => ({ ...v, lng: e.target.value }))} required />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Sensor Height from Surface (cm)</label>
                    <input type="number" step="1" className="input-field" placeholder="200" value={newIotDevice.sensorHeightCm} onChange={e => setNewIotDevice(v => ({ ...v, sensorHeightCm: e.target.value }))} required />
                    <p className="text-caption" style={{ marginTop: '4px' }}>Height of the sensor above the road/riverbed surface. Used to calculate actual flood depth.</p>
                  </div>
                  <div className="form-group">
                    <label>Water Depth Warning (≥ cm)</label>
                    <input type="number" step="1" className="input-field" placeholder="10" value={newIotDevice.thresholdWarning} onChange={e => setNewIotDevice(v => ({ ...v, thresholdWarning: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Water Depth Danger (≥ cm)</label>
                    <input type="number" step="1" className="input-field" placeholder="30" value={newIotDevice.thresholdDanger} onChange={e => setNewIotDevice(v => ({ ...v, thresholdDanger: e.target.value }))} required />
                  </div>
                </div>
                <p className="text-caption" style={{ margin: '8px 0', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>info</span>
                  Flood Depth = (Sensor Height - Measured Distance). When depth ≥ Warning → Yellow. When depth ≥ Danger → Red.
                </p>
                <button type="submit" className="btn btn-primary w-full">
                  <span className="material-symbols-outlined">add</span>
                  Register Device
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== ROADWORKS TAB ===== */}
      {activeTab === 'roadworks' && (
        <div className="admin-tab-content">
          {/* Existing Roadworks */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="material-symbols-outlined">list</span>
                Active Roadworks ({roadworks.length})
              </h2>
            </div>
            <div className="card-body">
              {roadworks.length === 0 ? (
                <p className="text-caption" style={{ textAlign: 'center', padding: '24px', opacity: 0.5 }}>No roadworks. Add one below.</p>
              ) : (
                <div className="roadwork-admin-list">
                  {roadworks.map(rw => (
                    <div key={rw.id} className="roadwork-admin-item">
                      {editingRW === rw.id ? (
                        <form onSubmit={handleSaveEditRW} className="edit-rw-form">
                          <input className="input-field" value={editRWData.location ?? rw.location} onChange={e => setEditRWData(v => ({ ...v, location: e.target.value }))} placeholder="Location" />
                          <select className="input-field" value={editRWData.status ?? rw.status} onChange={e => setEditRWData(v => ({ ...v, status: e.target.value }))}>
                            <option>Full Closure</option>
                            <option>Partial Lane</option>
                            <option>Maintenance</option>
                            <option>Flooding</option>
                            <option>Pipeline Repair</option>
                          </select>
                          <input className="input-field" value={editRWData.reason ?? rw.reason} onChange={e => setEditRWData(v => ({ ...v, reason: e.target.value }))} placeholder="Reason" />
                          <input className="input-field" value={editRWData.altRoute ?? rw.altRoute} onChange={e => setEditRWData(v => ({ ...v, altRoute: e.target.value }))} placeholder="Alt Route" />
                          <div className="form-group">
                            <label>Progress %</label>
                            <input type="number" min="0" max="100" className="input-field" value={editRWData.progress ?? rw.progress} onChange={e => setEditRWData(v => ({ ...v, progress: parseInt(e.target.value) || 0 }))} />
                          </div>
                          <div className="edit-rw-actions">
                            <button type="submit" className="btn btn-primary btn-sm">Save</button>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingRW(null)}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="rw-admin-info">
                            <span className="rw-admin-title">{rw.location}</span>
                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className={`badge ${rw.status.includes('Full') ? 'badge-error' : 'badge-warning'}`}>{rw.status}</span>
                              {rw.reason && <span className="text-caption" style={{ opacity: 0.85 }}>{rw.reason}</span>}
                            </div>
                            {rw.altRoute && <p className="text-caption" style={{ margin: '4px 0 0 0' }}>↪ {rw.altRoute}</p>}
                            <p className="text-caption" style={{ margin: '4px 0 0 0', opacity: 0.75 }}>Progress: {rw.progress}% · {rw.updated}</p>
                          </div>
                          <div className="rw-admin-actions">
                            <button className="btn btn-sm btn-outline" onClick={() => { setEditingRW(rw.id); setEditRWData({ ...rw }); }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => removeRoadwork(rw.id)}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add Roadwork */}
          <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
            <div className="card-header">
              <h2 className="card-title">
                <span className="material-symbols-outlined">edit_road</span>
                Publish New Road Disruption
              </h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddRoadwork} className="roadwork-form">
                <div className="form-group">
                  <label>Location / Road Name</label>
                  <input type="text" className="input-field" required value={newRoadwork.location} onChange={e => setNewRoadwork(v => ({ ...v, location: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="input-field" value={newRoadwork.status} onChange={e => setNewRoadwork(v => ({ ...v, status: e.target.value }))}>
                    <option value="Full Closure">Full Closure</option>
                    <option value="Partial Lane">Partial Lane</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Flooding">Flooding</option>
                    <option value="Pipeline Repair">Pipeline Repair</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Reason</label>
                  <input type="text" className="input-field" required value={newRoadwork.reason} onChange={e => setNewRoadwork(v => ({ ...v, reason: e.target.value }))} placeholder="e.g. Waterlogging, Bridge inspection" />
                </div>
                <div className="form-group">
                  <label>Alternative Route (optional)</label>
                  <input type="text" className="input-field" value={newRoadwork.altRoute} onChange={e => setNewRoadwork(v => ({ ...v, altRoute: e.target.value }))} placeholder="e.g. Take Eastern Express Highway" />
                </div>
                <div className="form-group">
                  <label>Progress: {newRoadwork.progress}%</label>
                  <input type="range" min="0" max="100" value={newRoadwork.progress} onChange={e => setNewRoadwork(v => ({ ...v, progress: parseInt(e.target.value) }))} className="range-input" />
                </div>
                <button type="submit" className="btn btn-primary w-full">
                  <span className="material-symbols-outlined">publish</span>
                  Publish Update
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== ALERTS TAB ===== */}
      {activeTab === 'alerts' && (
        <div className="admin-tab-content">
          {/* Existing Alerts */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="material-symbols-outlined">notifications</span>
                All Alerts ({alerts.length})
              </h2>
            </div>
            <div className="card-body">
              {alerts.length === 0 ? (
                <p className="text-caption" style={{ textAlign: 'center', padding: '24px', opacity: 0.5 }}>No alerts. Create one below.</p>
              ) : (
                <div className="alerts-admin-list">
                  {alerts.map(alert => {
                    const alertTypeLabels = {
                      error: 'Critical',
                      warning: 'Warning',
                      info: 'Information',
                      success: 'Resolved',
                    };
                    return (
                      <div key={alert.id} className={`alert-admin-item type-${alert.type}`}>
                        <div className="alert-admin-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`badge badge-${alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : alert.type === 'success' ? 'success' : 'info'}`}>
                              {(alertTypeLabels[alert.type] || alert.type).toUpperCase()}
                            </span>
                            <span className="alert-admin-title">{alert.title}</span>
                          </div>
                          <span className="text-caption" style={{ display: 'block', marginTop: '4px', opacity: 0.75 }}>{alert.date}</span>
                        </div>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => removeAlert(alert.id)}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Post Alert */}
          <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
            <div className="card-header">
              <h2 className="card-title">
                <span className="material-symbols-outlined">add_alert</span>
                Post New Alert
              </h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddAlert} className="roadwork-form">
                <div className="form-group">
                  <label>Alert Title</label>
                  <input type="text" className="input-field" placeholder="e.g. Heavy rainfall warning for Zone 3" value={newAlertData.title} onChange={e => setNewAlertData(v => ({ ...v, title: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select className="input-field" value={newAlertData.type} onChange={e => setNewAlertData(v => ({ ...v, type: e.target.value }))}>
                    <option value="error">Critical / Danger</option>
                    <option value="warning">Warning</option>
                    <option value="info">Information</option>
                    <option value="success">Resolved</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Description (optional)</label>
                  <textarea className="input-field" rows={3} placeholder="Additional details..." value={newAlertData.description} onChange={e => setNewAlertData(v => ({ ...v, description: e.target.value }))} />
                </div>
                <button type="submit" className="btn btn-primary w-full">
                  <span className="material-symbols-outlined">send</span>
                  Post Alert
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAP MARKING TAB ===== */}
      {activeTab === 'map' && (
        <div className="road-marking-section">
          <div className="marking-grid">
            {/* Map */}
            <div className="marking-map-area">
              <MapView
                height="100%"
                enableAdmin={isMarking}
                onMapClick={handleMapClick}
                markingPoints={markingPoints}
                altMarkingPoints={altMarkingPoints}
                selectedColor={roadStatusColors[roadMarkForm.status] || '#ef4444'}
                showSensors={false}
                coordPoints={[
                  ...(coordPointA ? [{ ...coordPointA, label: 'A' }] : []),
                  ...(coordPointB ? [{ ...coordPointB, label: 'B' }] : []),
                ]}
              />
              {(markingPoints.length > 0 || altMarkingPoints.length > 0) && (
                <div className="placed-points-bar" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined" style={{ fontSize: '18px', color: roadStatusColors[roadMarkForm.status] || '#ef4444' }}>place</span> {markingPoints.length} Main</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#22c55e' }}>place</span> {altMarkingPoints.length} Alt</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => markingTarget === 'main' ? setMarkingPoints(prev => prev.slice(0, -1)) : setAltMarkingPoints(prev => prev.slice(0, -1))}>Undo Last</button>
                    <button className="btn btn-sm btn-outline" onClick={() => { setMarkingPoints([]); setAltMarkingPoints([]); }}>Clear All</button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="marking-controls">
              {/* Sub-tab toggle for marking mode */}
              <div className="marking-mode-toggle">
                <button
                  className={`marking-mode-btn ${markingMode === 'coords' ? 'active' : ''}`}
                  onClick={() => setMarkingMode('coords')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>my_location</span>
                  GPS Coordinates
                </button>
                <button
                  className={`marking-mode-btn ${markingMode === 'draw' ? 'active' : ''}`}
                  onClick={() => setMarkingMode('draw')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>draw</span>
                  Draw on Map
                </button>
              </div>

              {/* ===== COORDINATE-BASED MARKING CARD ===== */}
              {markingMode === 'coords' && (
              <div className="card coord-marking-card">
                <div className="card-header">
                  <h3 className="card-title" style={{ fontSize: 'var(--font-size-body-lg)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#22d3ee' }}>my_location</span>
                    Coordinates-Based Marking
                  </h3>
                </div>
                <div className="card-body">
                  {/* Step 1: Capture Points */}
                  <div className="marking-step">
                    <div className="step-number coord-step-num">1</div>
                    <div className="step-content">
                      <strong>Capture GPS Coordinates</strong>
                      <p className="text-caption">Stand at each location and capture your coordinates.</p>
                      <div className="coord-points-grid">
                        {/* Point A */}
                        <div className={`coord-point-card ${coordPointA ? 'captured' : ''}`}>
                          <div className="coord-point-label">
                            <span className="coord-letter coord-letter-a">A</span>
                            <span>Start Point</span>
                          </div>
                          {coordPointA ? (
                            <div className="coord-point-display">
                              {/* Address */}
                              {coordFetchingAddr === 'A' ? (
                                <div className="coord-address-loading">
                                  <span className="coord-spinner" style={{ width: '12px', height: '12px' }}></span>
                                  <span>Fetching address...</span>
                                </div>
                              ) : coordAddressA && (
                                <div className="coord-address">
                                  <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>location_on</span>
                                  <span>{coordAddressA}</span>
                                </div>
                              )}

                              {/* Edit mode */}
                              {coordEditingA ? (
                                <div className="coord-edit-fields">
                                  <div className="coord-edit-row">
                                    <label>Lat</label>
                                    <input type="number" step="0.000001" className="input-field" value={coordEditLatA} onChange={e => setCoordEditLatA(e.target.value)} />
                                  </div>
                                  <div className="coord-edit-row">
                                    <label>Lng</label>
                                    <input type="number" step="0.000001" className="input-field" value={coordEditLngA} onChange={e => setCoordEditLngA(e.target.value)} />
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                    <button className="btn btn-sm btn-primary" style={{ flex: 1, padding: '4px 8px' }} onClick={() => saveCoordEdit('A')}>Save</button>
                                    <button className="btn btn-sm btn-outline" style={{ flex: 1, padding: '4px 8px' }} onClick={() => setCoordEditingA(false)}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="coord-value">
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#22c55e' }}>check_circle</span>
                                    <span>Lat: {coordPointA.lat.toFixed(6)}</span>
                                  </div>
                                  <div className="coord-value">
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#22c55e' }}>check_circle</span>
                                    <span>Lng: {coordPointA.lng.toFixed(6)}</span>
                                  </div>
                                  {/* Accuracy badge */}
                                  {coordAccuracyA !== null && (
                                    <div className={`coord-accuracy ${coordAccuracyA <= 10 ? 'good' : coordAccuracyA <= 30 ? 'fair' : 'poor'}`}>
                                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>gps_fixed</span>
                                      ±{coordAccuracyA.toFixed(0)}m accuracy
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Action buttons */}
                              {!coordEditingA && (
                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                  <button className="btn btn-sm btn-outline coord-recapture" onClick={() => captureGPSPoint('A')} disabled={coordCapturing === 'A'} style={{ flex: 1 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
                                    Recapture
                                  </button>
                                  <button className="btn btn-sm btn-outline coord-recapture" onClick={() => { setCoordEditingA(true); setCoordEditLatA(coordPointA.lat.toFixed(6)); setCoordEditLngA(coordPointA.lng.toFixed(6)); }} style={{ flex: 1 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              className={`coord-capture-btn ${coordCapturing === 'A' ? 'capturing' : ''}`}
                              onClick={() => captureGPSPoint('A')}
                              disabled={coordCapturing === 'A'}
                            >
                              {coordCapturing === 'A' ? (
                                <>
                                  <span className="coord-spinner"></span>
                                  Fetching GPS...
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined coord-gps-icon">my_location</span>
                                  Capture Point A
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Point B */}
                        <div className={`coord-point-card ${coordPointB ? 'captured' : ''}`}>
                          <div className="coord-point-label">
                            <span className="coord-letter coord-letter-b">B</span>
                            <span>End Point</span>
                          </div>
                          {coordPointB ? (
                            <div className="coord-point-display">
                              {/* Address */}
                              {coordFetchingAddr === 'B' ? (
                                <div className="coord-address-loading">
                                  <span className="coord-spinner" style={{ width: '12px', height: '12px' }}></span>
                                  <span>Fetching address...</span>
                                </div>
                              ) : coordAddressB && (
                                <div className="coord-address">
                                  <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>location_on</span>
                                  <span>{coordAddressB}</span>
                                </div>
                              )}

                              {/* Edit mode */}
                              {coordEditingB ? (
                                <div className="coord-edit-fields">
                                  <div className="coord-edit-row">
                                    <label>Lat</label>
                                    <input type="number" step="0.000001" className="input-field" value={coordEditLatB} onChange={e => setCoordEditLatB(e.target.value)} />
                                  </div>
                                  <div className="coord-edit-row">
                                    <label>Lng</label>
                                    <input type="number" step="0.000001" className="input-field" value={coordEditLngB} onChange={e => setCoordEditLngB(e.target.value)} />
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                    <button className="btn btn-sm btn-primary" style={{ flex: 1, padding: '4px 8px' }} onClick={() => saveCoordEdit('B')}>Save</button>
                                    <button className="btn btn-sm btn-outline" style={{ flex: 1, padding: '4px 8px' }} onClick={() => setCoordEditingB(false)}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="coord-value">
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#22c55e' }}>check_circle</span>
                                    <span>Lat: {coordPointB.lat.toFixed(6)}</span>
                                  </div>
                                  <div className="coord-value">
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#22c55e' }}>check_circle</span>
                                    <span>Lng: {coordPointB.lng.toFixed(6)}</span>
                                  </div>
                                  {coordAccuracyB !== null && (
                                    <div className={`coord-accuracy ${coordAccuracyB <= 10 ? 'good' : coordAccuracyB <= 30 ? 'fair' : 'poor'}`}>
                                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>gps_fixed</span>
                                      ±{coordAccuracyB.toFixed(0)}m accuracy
                                    </div>
                                  )}
                                </>
                              )}

                              {!coordEditingB && (
                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                  <button className="btn btn-sm btn-outline coord-recapture" onClick={() => captureGPSPoint('B')} disabled={coordCapturing === 'B'} style={{ flex: 1 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
                                    Recapture
                                  </button>
                                  <button className="btn btn-sm btn-outline coord-recapture" onClick={() => { setCoordEditingB(true); setCoordEditLatB(coordPointB.lat.toFixed(6)); setCoordEditLngB(coordPointB.lng.toFixed(6)); }} style={{ flex: 1 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              className={`coord-capture-btn ${coordCapturing === 'B' ? 'capturing' : ''}`}
                              onClick={() => captureGPSPoint('B')}
                              disabled={coordCapturing === 'B'}
                            >
                              {coordCapturing === 'B' ? (
                                <>
                                  <span className="coord-spinner"></span>
                                  Fetching GPS...
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined coord-gps-icon">my_location</span>
                                  Capture Point B
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Error message */}
                      {coordError && (
                        <div className="coord-error">
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                          {coordError}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Distance */}
                  {coordPointA && coordPointB && (
                    <div className="marking-step">
                      <div className="step-number coord-step-num">2</div>
                      <div className="step-content">
                        <strong>Distance</strong>
                        <div className="coord-distance-badge">
                          <span className="material-symbols-outlined">straighten</span>
                          <span className="coord-distance-value">{formatDistance(calculateDistance(coordPointA, coordPointB))}</span>
                          <span className="coord-distance-label">between A → B</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Road Details, Category & Reason */}
                  <div className="marking-step">
                    <div className="step-number coord-step-num">{coordPointA && coordPointB ? '3' : '2'}</div>
                    <div className="step-content">
                      <strong>Road & Disruption Details</strong>
                      <p className="text-caption">Edit road name, select category, and add details.</p>

                      {/* Road Name (auto-fetched, editable) */}
                      <div className="form-group" style={{ marginTop: '8px' }}>
                        <label>
                          Road / Location Name
                          {coordAddressA && !coordRoadName && (
                            <span className="text-caption" style={{ fontWeight: 'normal', marginLeft: '6px', color: '#22c55e' }}>(auto-detected)</span>
                          )}
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder={coordAddressA || 'e.g. SV Road, Bandra West'}
                          value={coordRoadName}
                          onChange={e => setCoordRoadName(e.target.value)}
                        />
                        {!coordRoadName && coordAddressA && (
                          <p className="text-caption" style={{ margin: '2px 0 0', color: 'var(--color-on-surface-variant)', fontSize: '11px' }}>
                            Will use: {coordAddressA}
                          </p>
                        )}
                      </div>

                      {/* Category */}
                      <div className="disruption-chips" style={{ marginTop: '8px', marginBottom: '8px' }}>
                        {[
                          { label: 'Full Closure', color: '#ef4444', icon: 'block' },
                          { label: 'Partial Lane', color: '#f59e0b', icon: 'warning' },
                          { label: 'Maintenance', color: '#3b82f6', icon: 'engineering' },
                          { label: 'Flooding', color: '#8b5cf6', icon: 'flood' },
                        ].map(item => (
                          <button
                            key={item.label}
                            type="button"
                            className={`disruption-chip ${coordCategory === item.label ? 'active' : ''}`}
                            style={{ '--chip-color': item.color, '--chip-bg': `${item.color}15`, '--chip-border': `${item.color}35` }}
                            onClick={() => setCoordCategory(item.label)}
                          >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Reason */}
                      <div className="form-group">
                        <label>Reason (optional)</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. Construction, Road repair"
                          value={coordReason}
                          onChange={e => setCoordReason(e.target.value)}
                        />
                      </div>

                      {/* Alternate Route */}
                      <div className="form-group" style={{ marginTop: '8px' }}>
                        <label>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#22c55e' }}>alt_route</span>
                            Alternate Route (optional)
                          </span>
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. Use Western Express Highway via Goregaon"
                          value={coordAltRoute}
                          onChange={e => setCoordAltRoute(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Publish */}
                  <div className="marking-step" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                    <div className="step-number coord-step-num">{coordPointA && coordPointB ? '4' : '3'}</div>
                    <div className="step-content">
                      <button
                        className="btn btn-primary w-full coord-publish-btn"
                        onClick={handleSubmitCoordMark}
                        disabled={!coordPointA || !coordPointB}
                      >
                        <span className="material-symbols-outlined">publish</span>
                        Publish Road Closure
                        {coordPointA && coordPointB && (
                          <span className="coord-publish-distance">
                            ({formatDistance(calculateDistance(coordPointA, coordPointB))})
                          </span>
                        )}
                      </button>
                      {(!coordPointA || !coordPointB) && (
                        <p className="text-caption" style={{ textAlign: 'center', marginTop: '6px', color: 'var(--color-on-surface-variant)' }}>
                          Capture both GPS points to publish
                        </p>
                      )}
                      {coordPointA && coordPointB && (
                        <button
                          className="btn btn-sm btn-outline w-full"
                          style={{ marginTop: '8px' }}
                          onClick={() => { setCoordPointA(null); setCoordPointB(null); setCoordError(''); setCoordAddressA(''); setCoordAddressB(''); setCoordAccuracyA(null); setCoordAccuracyB(null); setCoordRoadName(''); setCoordAltRoute(''); setCoordEditingA(false); setCoordEditingB(false); }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restart_alt</span>
                          Reset All
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )}

              {markingMode === 'draw' && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title" style={{ fontSize: 'var(--font-size-body-lg)' }}>
                    <span className="material-symbols-outlined">draw</span>
                    Road Marking Tool
                  </h3>
                </div>
                <div className="card-body">
                  <div className="marking-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <strong>Select Disruption & Draw</strong>
                      <p className="text-caption">Click a category to start placing points on the map.</p>
                      <div className="disruption-chips">
                        {[
                          { label: 'Full Closure', color: '#ef4444', icon: 'block' },
                          { label: 'Partial Lane', color: '#f59e0b', icon: 'warning' },
                          { label: 'Maintenance', color: '#3b82f6', icon: 'engineering' },
                          { label: 'Flooding', color: '#8b5cf6', icon: 'flood' },
                          { label: 'Pipeline Repair', color: '#ec4899', icon: 'plumbing' },
                        ].map(item => {
                          const isActive = isMarking && roadMarkForm.status === item.label;
                          return (
                            <button
                              key={item.label}
                              type="button"
                              className={`disruption-chip ${isActive ? 'active' : ''}`}
                              style={{ '--chip-color': item.color, '--chip-bg': `${item.color}15`, '--chip-border': `${item.color}35` }}
                              onClick={() => { setRoadMarkForm(prev => ({ ...prev, status: item.label })); setIsMarking(true); setMarkingTarget('main'); }}
                            >
                              <span className="material-symbols-outlined">{item.icon}</span>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      {isMarking && (
                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className={`btn btn-sm ${markingTarget === 'main' ? 'btn-primary' : 'btn-outline'} w-full`} onClick={() => setMarkingTarget('main')} style={{ flex: 1, padding: '8px' }}>
                              Draw Main Route
                            </button>
                            <button className={`btn btn-sm ${markingTarget === 'alt' ? 'btn-primary' : 'btn-outline'} w-full`} onClick={() => setMarkingTarget('alt')} style={{ flex: 1, padding: '8px', borderColor: markingTarget === 'alt' ? '#22c55e' : '', backgroundColor: markingTarget === 'alt' ? '#22c55e' : 'transparent', color: markingTarget === 'alt' ? 'white' : '' }}>
                              Draw Alt Route
                            </button>
                          </div>
                          <button className="btn btn-marking-active w-full" onClick={() => { setIsMarking(false); setMarkingPoints([]); setAltMarkingPoints([]); setMarkingTarget('main'); }}>
                            <span className="material-symbols-outlined">close</span>
                            Stop Marking
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="marking-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <strong>Road Details</strong>
                      <form onSubmit={handleSubmitRoadMark} className="mark-form">
                        <div className="form-group">
                          <label>Road Name</label>
                          <input type="text" className="input-field" placeholder="e.g. SV Road, Bandra" value={roadMarkForm.name} onChange={e => setRoadMarkForm(prev => ({ ...prev, name: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                          <label>Reason</label>
                          <input type="text" className="input-field" placeholder="e.g. Waterlogging, Construction" value={roadMarkForm.reason} onChange={e => setRoadMarkForm(prev => ({ ...prev, reason: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label>Alternate Route</label>
                          <input type="text" className="input-field" placeholder="e.g. Take Western Express Highway" value={roadMarkForm.altRoute} onChange={e => setRoadMarkForm(prev => ({ ...prev, altRoute: e.target.value }))} />
                        </div>
                        <button type="submit" className="btn btn-primary w-full" disabled={markingPoints.length < 2}>
                          <span className="material-symbols-outlined">publish</span>
                          Publish Road Block ({markingPoints.length} pts)
                        </button>
                        {markingPoints.length < 2 && (
                          <p className="text-caption" style={{ textAlign: 'center', marginTop: '4px', color: 'var(--color-on-surface-variant)' }}>
                            Place at least 2 points on the map
                          </p>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>

          {/* ===== ACTIVE ROAD MARKERS — Full Width Below Map+Controls ===== */}
          <div className="active-markers-full-row" style={{ marginTop: 'var(--spacing-lg)' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: 'var(--font-size-body-lg)' }}>
                  <span className="material-symbols-outlined">route</span>
                  Active Road Markers ({roadMarkers.length})
                </h3>
              </div>
              <div className="card-body">
                {roadMarkers.length === 0 ? (
                  <p className="text-caption" style={{ textAlign: 'center', padding: '16px' }}>No road markers active.</p>
                ) : (
                  <div className="active-markers-grid">
                    {roadMarkers.map(marker => (
                      <div key={marker.id} className="active-marker-item">
                        <div className="marker-color-bar" style={{ backgroundColor: marker.color }}></div>
                        <div className="marker-info">
                          <strong>{marker.name}</strong>
                          <span className="text-caption">{marker.status} · {marker.coordinates.length} pts</span>
                        </div>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => removeRoadMarker(marker.id)} title="Remove marker">
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
