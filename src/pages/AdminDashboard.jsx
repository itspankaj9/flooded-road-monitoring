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

  // IoT Device form & state
  const [newIotDevice, setNewIotDevice] = useState({ name: '', lat: '19.0760', lng: '72.8777', thresholdWarning: '80', thresholdDanger: '30' });
  const [editingIotDevice, setEditingIotDevice] = useState(null);
  const [editIotData, setEditIotData] = useState({});
  const [expandedDeviceId, setExpandedDeviceId] = useState(null);

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
            <span className="material-symbols-outlined filled" style={{ color: 'var(--color-secondary-container)' }}>admin_panel_settings</span>
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
                            <div className="form-group">
                              <label>Latitude</label>
                              <input type="number" step="0.0001" className="input-field" value={editIotData.lat ?? device.lat} onChange={e => setEditIotData(v => ({ ...v, lat: parseFloat(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label>Longitude</label>
                              <input type="number" step="0.0001" className="input-field" value={editIotData.lng ?? device.lng} onChange={e => setEditIotData(v => ({ ...v, lng: parseFloat(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label>Warning ≤ (cm)</label>
                              <input type="number" step="1" className="input-field" value={editIotData.thresholdWarning ?? device.thresholdWarning} onChange={e => setEditIotData(v => ({ ...v, thresholdWarning: parseFloat(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label>Danger ≤ (cm)</label>
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
                          <div className="iot-device-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: device.status === 'danger' ? '#ef4444' : device.status === 'warning' ? '#f59e0b' : '#22c55e' }}>sensors</span>
                              <strong>{device.name}</strong>
                              <span className={`badge badge-${device.status === 'danger' ? 'error' : device.status === 'warning' ? 'warning' : 'success'}`}>
                                {device.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-caption" style={{ marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                              <span>ID: {device.id}</span>
                              <span>📍 {device.lat.toFixed(4)}, {device.lng.toFixed(4)}</span>
                              <span>📏 Latest: {device.latestDistanceCm.toFixed(1)} cm</span>
                              <span>⚠️ Warn ≤{device.thresholdWarning}cm · 🔴 Danger ≤{device.thresholdDanger}cm</span>
                            </div>
                            <SensorAddress lat={device.lat} lng={device.lng} />
                          </div>
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
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: 'var(--spacing-md)' }}>
                            {/* Live Reading Card */}
                            <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--color-surface)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--spacing-sm)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>straighten</span>
                                <span>Ultrasonic Distance</span>
                              </div>
                              {wifiSensorData ? (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '36px', fontWeight: '800', color: 'var(--color-primary)' }}>{wifiSensorData.distanceCm.toFixed(1)}</span>
                                    <span style={{ fontWeight: '600', color: 'var(--color-on-surface-variant)' }}>cm</span>
                                  </div>
                                  <div style={{ marginBottom: '16px' }}>
                                    {(() => {
                                      const dist = wifiSensorData.distanceCm;
                                      const level = dist <= device.thresholdDanger ? 'danger' : dist <= device.thresholdWarning ? 'warning' : 'normal';
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
                                    {new Date(wifiSensorData.createdAt).toLocaleTimeString()} · Reading #{wifiSensorData.id}
                                  </div>
                                </>
                              ) : (
                                <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Waiting for data...</p>
                              )}
                            </div>
                            
                            {/* Live Chart */}
                            <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--color-surface)', height: '250px' }}>
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
                  lat: parseFloat(newIotDevice.lat) || 19.076,
                  lng: parseFloat(newIotDevice.lng) || 72.8777,
                  thresholdWarning: parseFloat(newIotDevice.thresholdWarning) || 80,
                  thresholdDanger: parseFloat(newIotDevice.thresholdDanger) || 30,
                  status: 'normal',
                  latestDistanceCm: 0,
                };
                addWifiIotDevice(device);
                setNewIotDevice({ name: '', lat: '19.0760', lng: '72.8777', thresholdWarning: '80', thresholdDanger: '30' });
              }} className="sensor-add-form">
                <div className="form-grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Device Name</label>
                    <input type="text" className="input-field" placeholder="e.g. Mithi River Bridge Ultrasonic Sensor" value={newIotDevice.name} onChange={e => setNewIotDevice(v => ({ ...v, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Latitude</label>
                    <input type="number" step="0.0001" className="input-field" value={newIotDevice.lat} onChange={e => setNewIotDevice(v => ({ ...v, lat: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Longitude</label>
                    <input type="number" step="0.0001" className="input-field" value={newIotDevice.lng} onChange={e => setNewIotDevice(v => ({ ...v, lng: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Warning Threshold (≤ cm)</label>
                    <input type="number" step="1" className="input-field" placeholder="80" value={newIotDevice.thresholdWarning} onChange={e => setNewIotDevice(v => ({ ...v, thresholdWarning: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Danger Threshold (≤ cm)</label>
                    <input type="number" step="1" className="input-field" placeholder="30" value={newIotDevice.thresholdDanger} onChange={e => setNewIotDevice(v => ({ ...v, thresholdDanger: e.target.value }))} required />
                  </div>
                </div>
                <p className="text-caption" style={{ margin: '8px 0', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>info</span>
                  Distance below Warning threshold → Yellow on map. Below Danger → Red pulsing marker.
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
                            <strong>{rw.location}</strong>
                            <span className={`badge ${rw.status.includes('Full') ? 'badge-error' : 'badge-warning'}`} style={{ marginLeft: '8px' }}>{rw.status}</span>
                            <p className="text-caption" style={{ margin: '2px 0' }}>{rw.reason}</p>
                            {rw.altRoute && <p className="text-caption">↪ {rw.altRoute}</p>}
                            <p className="text-caption">Progress: {rw.progress}% · {rw.updated}</p>
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
                          <span className={`badge badge-${alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : alert.type === 'success' ? 'success' : 'info'}`}>
                            {(alertTypeLabels[alert.type] || alert.type).toUpperCase()}
                          </span>
                          <strong style={{ marginLeft: '8px' }}>{alert.title}</strong>
                          <span className="text-caption" style={{ display: 'block', marginTop: '2px' }}>{alert.date}</span>
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
                height="450px"
                enableAdmin={isMarking}
                onMapClick={handleMapClick}
                markingPoints={markingPoints}
                altMarkingPoints={altMarkingPoints}
                selectedColor={roadStatusColors[roadMarkForm.status] || '#ef4444'}
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

              {/* Active Road Markers */}
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
                    <div className="active-markers-list">
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
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
