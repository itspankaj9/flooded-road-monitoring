import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppContext } from '../context/AppContext';
import { roadStatusColors } from '../data/MockIoTService';
import './RouteNavigator.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const DANGER_RADIUS_KM = 0.3; // 300m exclusion radius
const SESSION_KEY = 'smart_infra_route_state';

const sensorColors = { normal: '#22c55e', warning: '#f59e0b', danger: '#ef4444' };

// ─── Utility ─────────────────────────────────────────────────────
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fmtDist = (m) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

const fmtTime = (s) => {
  if (s < 60) return `${Math.round(s)} sec`;
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
};

// Draw a route polyline on a mapbox instance
const addRouteLayer = (map, geometry) => {
  ['safe-route-line', 'safe-route-glow'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource('safe-route-src')) map.removeSource('safe-route-src');

  map.addSource('safe-route-src', {
    type: 'geojson',
    data: { type: 'Feature', geometry },
  });
  map.addLayer({
    id: 'safe-route-glow', type: 'line', source: 'safe-route-src',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#22c55e', 'line-width': 14, 'line-opacity': 0.18 },
  });
  map.addLayer({
    id: 'safe-route-line', type: 'line', source: 'safe-route-src',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#22c55e', 'line-width': 5, 'line-opacity': 0.9 },
  });
};

const removeRouteLayer = (map) => {
  ['safe-route-line', 'safe-route-glow'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource('safe-route-src')) map.removeSource('safe-route-src');
};

// ─── Component ───────────────────────────────────────────────────
const RouteNavigator = () => {
  const { sensors, roadMarkers, wifiIotDevices, weather } = useAppContext();

  // Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const sensorMarkersRef = useRef([]);
  const iotMarkersRef = useRef([]);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const savedGeoRef = useRef(null);

  // ─── Load saved state ─────────────────────────────────────────
  const loadSaved = () => {
    try { const s = sessionStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; }
    catch { return null; }
  };
  const [saved] = useState(loadSaved);

  // ─── State ────────────────────────────────────────────────────
  const [origin, setOrigin] = useState(saved?.origin || null);
  const [destination, setDestination] = useState(saved?.destination || null);
  const [originText, setOriginText] = useState(saved?.originText || '');
  const [destText, setDestText] = useState(saved?.destText || '');
  const [originSugs, setOriginSugs] = useState([]);
  const [destSugs, setDestSugs] = useState([]);
  const [mapClickMode, setMapClickMode] = useState(null);
  const [routeInfo, setRouteInfo] = useState(saved?.routeInfo || null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);

  // Store saved geometry ref for map restore
  if (saved?.routeGeo) savedGeoRef.current = saved.routeGeo;

  // ─── Persist to sessionStorage ────────────────────────────────
  const routeGeoRef = useRef(savedGeoRef.current);
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        origin, destination, originText, destText,
        routeInfo, routeGeo: routeGeoRef.current,
      }));
    } catch { /* quota exceeded, ignore */ }
  }, [origin, destination, originText, destText, routeInfo]);

  // ─── Compute danger zones from admin/sensor data ──────────────
  const getDangerZones = useCallback(() => {
    const zones = [];
    sensors.forEach(s => {
      if (s.status === 'danger' && s.lat && s.lng)
        zones.push({ id: `s-${s.id}`, name: s.name || `Sensor ${s.id}`, lat: s.lat, lng: s.lng, type: 'Flood Danger', icon: 'water' });
    });
    roadMarkers.forEach(rm => {
      if (['Full Closure', 'Flooding'].includes(rm.status) && rm.coordinates?.length > 0) {
        const mid = rm.coordinates[Math.floor(rm.coordinates.length / 2)];
        zones.push({ id: `r-${rm.id}`, name: rm.name || rm.status, lat: mid[1], lng: mid[0], type: rm.status, icon: rm.status === 'Flooding' ? 'flood' : 'block' });
      }
    });
    (wifiIotDevices || []).forEach(d => {
      if (d.status === 'danger' && d.lat && d.lng)
        zones.push({ id: `i-${d.id}`, name: d.name || `IoT ${d.id}`, lat: d.lat, lng: d.lng, type: 'IoT Danger', icon: 'sensors' });
    });
    return zones;
  }, [sensors, roadMarkers, wifiIotDevices]);

  // ─── Initialize Map ───────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    const m = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [weather?.lng || 72.8777, weather?.lat || 19.0760],
      zoom: 12,
      accessToken: MAPBOX_TOKEN,
    });
    m.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = m;

    m.on('load', () => {
      // Restore saved route after map style loads
      if (savedGeoRef.current) {
        try { addRouteLayer(m, savedGeoRef.current); } catch { /* ignore */ }
      }
    });

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Recenter when weather location changes (only if no route is set)
  useEffect(() => {
    if (mapRef.current && weather?.lng && weather?.lat && !origin && !destination) {
      mapRef.current.flyTo({ center: [weather.lng, weather.lat], duration: 1500 });
    }
  }, [weather?.lng, weather?.lat]);

  // ─── Sensor Markers (ported from MapView) ─────────────────────
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    sensorMarkersRef.current.forEach(mk => mk.remove());
    sensorMarkersRef.current = [];

    sensors.forEach(sensor => {
      const color = sensorColors[sensor.status] || '#22c55e';
      const size = sensor.status === 'danger' ? 20 : 14;
      const el = document.createElement('div');
      el.className = 'map-marker';
      Object.assign(el.style, {
        width: `${size}px`, height: `${size}px`, borderRadius: '50%',
        background: color, border: '3px solid white',
        boxShadow: `0 0 8px ${color}`,
        ...(sensor.status === 'danger' ? { animation: 'markerPulse 1.5s infinite' } : {}),
      });

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="font-family:Inter,sans-serif;padding:4px">
          <strong style="font-size:14px">${sensor.name}</strong>
          <div style="font-size:12px;color:#666;margin-top:4px">ID: ${sensor.id}</div>
          <div style="font-size:20px;font-weight:800;color:${color};margin-top:8px">${sensor.value} ${sensor.unit}</div>
          <div style="font-size:11px;text-transform:uppercase;font-weight:700;color:${color};margin-top:4px">${sensor.status}</div>
        </div>`);

      const mk = new mapboxgl.Marker(el).setLngLat([sensor.lng, sensor.lat]).setPopup(popup).addTo(m);
      sensorMarkersRef.current.push(mk);
    });
  }, [sensors]);

  // ─── IoT Device Markers (ported from MapView) ─────────────────
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !wifiIotDevices) return;
    iotMarkersRef.current.forEach(mk => mk.remove());
    iotMarkersRef.current = [];

    wifiIotDevices.forEach(device => {
      if (!device.lat || !device.lng) return;
      const color = sensorColors[device.status] || '#22c55e';
      const size = device.status === 'danger' ? 24 : 18;

      const el = document.createElement('div');
      el.className = 'map-marker iot-map-marker';
      Object.assign(el.style, {
        width: `${size}px`, height: `${size}px`, borderRadius: '50%',
        border: `3px solid ${color}`, background: color,
        boxShadow: `0 0 12px ${color}, 0 0 4px ${color}`, position: 'relative',
        ...(device.status === 'danger' ? { animation: 'markerPulse 1s infinite' } : {}),
      });
      const icon = document.createElement('div');
      Object.assign(icon.style, {
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)', fontSize: '10px', color: 'white', fontWeight: 'bold',
      });
      icon.textContent = '◉';
      el.appendChild(icon);

      const statusLabel = device.status === 'danger' ? '🔴 DANGER' : device.status === 'warning' ? '🟡 WARNING' : '🟢 NORMAL';
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="font-family:Inter,sans-serif;padding:6px;min-width:180px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="font-size:16px">📡</span><strong style="font-size:14px">${device.name}</strong>
          </div>
          <div style="font-size:11px;color:#888;margin-bottom:6px">ID: ${device.id}</div>
          <div style="font-size:22px;font-weight:800;color:${color};margin-bottom:4px">${device.latestDistanceCm.toFixed(1)} cm</div>
          <div style="font-size:11px;font-weight:700">${statusLabel}</div>
        </div>`);

      const mk = new mapboxgl.Marker(el).setLngLat([device.lng, device.lat]).setPopup(popup).addTo(m);
      iotMarkersRef.current.push(mk);
    });
  }, [wifiIotDevices]);

  // ─── Road Segment Polylines (ported from MapView) ─────────────
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    const addRoadLayers = () => {
      // Clean up old layers
      for (let i = 0; i < 50; i++) {
        [`road-layer-${i}`, `road-layer-${i}-outline`, `road-layer-alt-${i}`].forEach(id => {
          if (m.getLayer(id)) m.removeLayer(id);
        });
        [`road-source-${i}`, `road-source-alt-${i}`].forEach(id => {
          if (m.getSource(id)) m.removeSource(id);
        });
      }

      roadMarkers.forEach((marker, i) => {
        if (!marker.coordinates || marker.coordinates.length < 2) return;
        const color = marker.color || roadStatusColors[marker.status] || '#ef4444';
        const srcId = `road-source-${i}`;
        const layId = `road-layer-${i}`;

        m.addSource(srcId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: marker.coordinates },
            properties: { name: marker.name, status: marker.status, reason: marker.reason, altRoute: marker.altRoute },
          },
        });

        // Glow
        m.addLayer({
          id: `${layId}-outline`, type: 'line', source: srcId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': color, 'line-width': 10, 'line-opacity': 0.3 },
        });
        // Line
        m.addLayer({
          id: layId, type: 'line', source: srcId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': color, 'line-width': 4, 'line-opacity': 0.9 },
        });

        // Alt route
        if (marker.altCoordinates?.length >= 2) {
          const altSrc = `road-source-alt-${i}`;
          const altLay = `road-layer-alt-${i}`;
          m.addSource(altSrc, {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: marker.altCoordinates } },
          });
          m.addLayer({
            id: altLay, type: 'line', source: altSrc,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#22c55e', 'line-width': 3, 'line-dasharray': [2, 2], 'line-opacity': 0.8 },
          });
        }

        // Click popup
        m.on('click', layId, (e) => {
          const p = e.features[0].properties;
          new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family:Inter,sans-serif;padding:6px;max-width:260px">
                <div style="font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:.05em;color:${color};margin-bottom:4px">${p.status}</div>
                <strong style="font-size:14px;display:block;margin-bottom:6px">${p.name}</strong>
                <div style="font-size:12px;color:#888;margin-bottom:6px"><strong>Reason:</strong> ${p.reason}</div>
                ${p.altRoute ? `<div style="font-size:12px;background:rgba(34,197,94,0.1);padding:6px 8px;border-radius:4px;border-left:3px solid #22c55e"><strong style="color:#166534">↪ Alt:</strong> ${p.altRoute}</div>` : ''}
              </div>`)
            .addTo(m);
        });
        m.on('mouseenter', layId, () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', layId, () => { m.getCanvas().style.cursor = ''; });
      });
    };

    if (m.isStyleLoaded()) addRoadLayers();
    else m.on('load', addRoadLayers);
  }, [roadMarkers]);

  // ─── Origin / Destination Markers ─────────────────────────────
  useEffect(() => {
    originMarkerRef.current?.remove();
    originMarkerRef.current = null;
    if (origin && mapRef.current) {
      const el = document.createElement('div');
      el.innerHTML = `<svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0Z" fill="#000000" stroke="#ffffff" stroke-width="2"/>
        <circle cx="15" cy="15" r="5" fill="#3b82f6"/>
      </svg>`;
      el.style.cursor = 'pointer';
      originMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([origin.lng, origin.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setText(`Origin: ${origin.name}`))
        .addTo(mapRef.current);
    }
  }, [origin]);

  useEffect(() => {
    destMarkerRef.current?.remove();
    destMarkerRef.current = null;
    if (destination && mapRef.current) {
      const el = document.createElement('div');
      el.innerHTML = `<svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0Z" fill="#000000" stroke="#ffffff" stroke-width="2"/>
        <circle cx="15" cy="15" r="5" fill="#ef4444"/>
      </svg>`;
      el.style.cursor = 'pointer';
      destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setText(`Destination: ${destination.name}`))
        .addTo(mapRef.current);
    }
  }, [destination]);

  // ─── Map Click Handler ────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    const onClick = async (e) => {
      if (!mapClickMode) return;
      const { lng, lat } = e.lngLat;
      let name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      try {
        const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`);
        const d = await r.json();
        if (d.features?.length) name = d.features[0].place_name;
      } catch { /* use coords */ }

      if (mapClickMode === 'origin') { setOrigin({ lng, lat, name }); setOriginText(name); }
      else { setDestination({ lng, lat, name }); setDestText(name); }
      setMapClickMode(null);
    };

    m.on('click', onClick);
    m.getCanvas().style.cursor = mapClickMode ? 'crosshair' : '';

    return () => { m?.off('click', onClick); };
  }, [mapClickMode]);

  // ─── Geocoding Search ─────────────────────────────────────────
  const searchPlaces = useCallback(async (query, setter) => {
    if (!query || query.length < 3) { setter([]); return; }
    try {
      const prox = weather ? `${weather.lng},${weather.lat}` : '72.8777,19.0760';
      const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&proximity=${prox}`);
      const d = await r.json();
      setter(d.features || []);
    } catch { setter([]); }
  }, [weather]);

  const originTimer = useRef(null);
  const destTimer = useRef(null);

  const handleOriginInput = (e) => {
    const v = e.target.value;
    setOriginText(v); setOrigin(null);
    clearTimeout(originTimer.current);
    originTimer.current = setTimeout(() => searchPlaces(v, setOriginSugs), 300);
  };
  const handleDestInput = (e) => {
    const v = e.target.value;
    setDestText(v); setDestination(null);
    clearTimeout(destTimer.current);
    destTimer.current = setTimeout(() => searchPlaces(v, setDestSugs), 300);
  };

  const pickOrigin = (f) => {
    const [lng, lat] = f.center;
    setOrigin({ lng, lat, name: f.place_name }); setOriginText(f.place_name); setOriginSugs([]);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 1000 });
  };
  const pickDest = (f) => {
    const [lng, lat] = f.center;
    setDestination({ lng, lat, name: f.place_name }); setDestText(f.place_name); setDestSugs([]);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 1000 });
  };

  // ─── GPS Location ─────────────────────────────────────────────
  const useGPS = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setLocating(true); setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`);
          const d = await r.json();
          if (d.features?.length) name = d.features[0].place_name;
        } catch { /* coords name */ }
        setOrigin({ lng, lat, name }); setOriginText(name); setLocating(false);
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 1000 });
      },
      () => { setError('Location access denied. Set origin manually.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // ─── Swap ─────────────────────────────────────────────────────
  const swap = () => {
    setOrigin(destination); setOriginText(destText);
    setDestination(origin); setDestText(originText);
  };

  // ─── Find Safe Route (alternatives-based avoidance) ───────────
  const findRoute = async () => {
    if (!origin || !destination) return;
    setLoading(true); setError(null); setRouteInfo(null);
    const m = mapRef.current;
    if (m) removeRouteLayer(m);

    try {
      const zones = getDangerZones();

      // Request route WITH alternatives so we can pick the safest one
      const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?alternatives=true&geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes?.length) {
        setError('No route found between these locations.');
        setLoading(false);
        return;
      }

      // Score each route by how many danger zones it passes through
      const scored = data.routes.map(route => {
        const nearZones = [];
        const coords = route.geometry.coordinates;
        // Sample every 5th coordinate for performance on long routes
        const step = Math.max(1, Math.floor(coords.length / 200));

        zones.forEach(zone => {
          for (let i = 0; i < coords.length; i += step) {
            if (haversine(coords[i][1], coords[i][0], zone.lat, zone.lng) < DANGER_RADIUS_KM) {
              nearZones.push(zone);
              break;
            }
          }
        });

        return { route, dangerCount: nearZones.length, nearZones };
      });

      // Sort: least danger first, then shortest distance
      scored.sort((a, b) => {
        if (a.dangerCount !== b.dangerCount) return a.dangerCount - b.dangerCount;
        return a.route.distance - b.route.distance;
      });

      const best = scored[0];
      const route = best.route;

      // Determine which zones the ORIGINAL shortest route would've hit
      // (so we know what we avoided by picking a safer alternative)
      const directRoute = data.routes[0];
      const originalNearZones = [];
      if (directRoute !== route) {
        const directCoords = directRoute.geometry.coordinates;
        const dStep = Math.max(1, Math.floor(directCoords.length / 200));
        zones.forEach(zone => {
          for (let i = 0; i < directCoords.length; i += dStep) {
            if (haversine(directCoords[i][1], directCoords[i][0], zone.lat, zone.lng) < DANGER_RADIUS_KM) {
              originalNearZones.push(zone);
              break;
            }
          }
        });
      }

      // Avoided = zones the direct route hits but the safe route avoids
      const safeRouteZoneIds = new Set(best.nearZones.map(z => z.id));
      const avoided = originalNearZones.filter(z => !safeRouteZoneIds.has(z.id));

      // Draw route
      if (m) {
        addRouteLayer(m, route.geometry);
        routeGeoRef.current = route.geometry;

        // Fit bounds
        const bounds = new mapboxgl.LngLatBounds();
        route.geometry.coordinates.forEach(c => bounds.extend(c));
        bounds.extend([origin.lng, origin.lat]);
        bounds.extend([destination.lng, destination.lat]);
        m.fitBounds(bounds, { padding: 60, duration: 1200 });
      }

      // Extract steps
      const steps = [];
      route.legs.forEach(leg => {
        leg.steps.forEach(s => {
          if (s.maneuver?.instruction) steps.push({ instruction: s.maneuver.instruction, distance: s.distance });
        });
      });

      const info = {
        distance: route.distance,
        duration: route.duration,
        steps,
        avoidedZones: avoided,
        nearbyZones: best.nearZones,
        alternativesCount: data.routes.length,
        isSafest: best.dangerCount === 0 || best.dangerCount < scored[scored.length - 1].dangerCount,
      };
      setRouteInfo(info);

    } catch (err) {
      console.error('Routing failed:', err);
      setError('Failed to calculate route. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Clear All ────────────────────────────────────────────────
  const clearAll = () => {
    setOrigin(null); setDestination(null);
    setOriginText(''); setDestText('');
    setRouteInfo(null); setError(null); setMapClickMode(null);
    routeGeoRef.current = null;
    if (mapRef.current) removeRouteLayer(mapRef.current);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* */ }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="route-navigator" id="route-navigator">
      {/* ─── Control Panel ─── */}
      <div className="rn-panel">
        {/* Header */}
        <div className="rn-panel-header">
          <div className="rn-panel-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="19" r="3" />
              <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
              <circle cx="18" cy="5" r="3" />
            </svg>
          </div>
          <div>
            <h3>Route Planner</h3>
            <p>Avoid admin-marked danger zones</p>
          </div>
        </div>

        <div className="rn-divider" />

        {/* Origin */}
        <div className="rn-field">
          <label className="rn-label">
            <span className="rn-dot rn-dot-blue" />
            Starting Point
          </label>
          <div className="rn-input-row">
            <div className="rn-input-wrap">
              <input
                id="rn-origin-input"
                className={`rn-input ${origin ? 'filled' : ''}`}
                placeholder="Search location..."
                value={originText}
                onChange={handleOriginInput}
                onFocus={() => originText.length >= 3 && searchPlaces(originText, setOriginSugs)}
                onBlur={() => setTimeout(() => setOriginSugs([]), 200)}
              />
              {originSugs.length > 0 && (
                <div className="rn-dropdown">
                  {originSugs.map(f => (
                    <div key={f.id} className="rn-dropdown-item" onMouseDown={() => pickOrigin(f)}>
                      <span className="material-symbols-outlined">location_on</span>
                      <div>
                        <div className="rn-place-name">{f.text}</div>
                        <div className="rn-place-addr">{f.place_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className={`rn-btn-icon rn-gps ${locating ? 'locating' : ''}`} onClick={useGPS} title="Use GPS">
              <span className="material-symbols-outlined">my_location</span>
            </button>
            <button className={`rn-btn-icon ${mapClickMode === 'origin' ? 'active' : ''}`} onClick={() => setMapClickMode(mapClickMode === 'origin' ? null : 'origin')} title="Pick on map">
              <span className="material-symbols-outlined">ads_click</span>
            </button>
          </div>
        </div>

        {/* Swap */}
        <div className="rn-swap-row">
          <button className="rn-swap" onClick={swap} title="Swap">
            <span className="material-symbols-outlined">swap_vert</span>
          </button>
        </div>

        {/* Destination */}
        <div className="rn-field">
          <label className="rn-label">
            <span className="rn-dot rn-dot-red" />
            Destination
          </label>
          <div className="rn-input-row">
            <div className="rn-input-wrap">
              <input
                id="rn-dest-input"
                className={`rn-input ${destination ? 'filled' : ''}`}
                placeholder="Where to?"
                value={destText}
                onChange={handleDestInput}
                onFocus={() => destText.length >= 3 && searchPlaces(destText, setDestSugs)}
                onBlur={() => setTimeout(() => setDestSugs([]), 200)}
              />
              {destSugs.length > 0 && (
                <div className="rn-dropdown">
                  {destSugs.map(f => (
                    <div key={f.id} className="rn-dropdown-item" onMouseDown={() => pickDest(f)}>
                      <span className="material-symbols-outlined">location_on</span>
                      <div>
                        <div className="rn-place-name">{f.text}</div>
                        <div className="rn-place-addr">{f.place_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className={`rn-btn-icon ${mapClickMode === 'destination' ? 'active' : ''}`} onClick={() => setMapClickMode(mapClickMode === 'destination' ? null : 'destination')} title="Pick on map">
              <span className="material-symbols-outlined">ads_click</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rn-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Find Route */}
        <button className={`rn-primary ${loading ? 'loading' : ''}`} onClick={findRoute} disabled={!origin || !destination || loading}>
          {loading ? (
            <><div className="rn-spinner" />Calculating...</>
          ) : (
            <><span className="material-symbols-outlined">directions</span>Find Safe Route</>
          )}
        </button>

        {/* Route Info */}
        {routeInfo && (
          <div className="rn-result">
            <div className="rn-result-glow" />
            <div className="rn-result-inner">
              <div className="rn-result-header">
                <span className="material-symbols-outlined" style={{ color: '#22c55e' }}>check_circle</span>
                <span>{routeInfo.isSafest ? 'Safest Route Found' : 'Route Found'}</span>
                {routeInfo.alternativesCount > 1 && (
                  <span className="rn-alt-badge">Best of {routeInfo.alternativesCount}</span>
                )}
              </div>

              <div className="rn-stats">
                <div className="rn-stat">
                  <span className="rn-stat-label">Distance</span>
                  <span className="rn-stat-val green">{fmtDist(routeInfo.distance)}</span>
                </div>
                <div className="rn-stat">
                  <span className="rn-stat-label">Est. Time</span>
                  <span className="rn-stat-val">{fmtTime(routeInfo.duration)}</span>
                </div>
              </div>

              {/* Avoided Zones */}
              {routeInfo.avoidedZones.length > 0 && (
                <div className="rn-avoided">
                  <div className="rn-avoided-head">
                    <span className="material-symbols-outlined">shield</span>
                    {routeInfo.avoidedZones.length} Danger Zone{routeInfo.avoidedZones.length > 1 ? 's' : ''} Avoided
                  </div>
                  {routeInfo.avoidedZones.map(z => (
                    <div key={z.id} className="rn-avoided-item">
                      <span className="material-symbols-outlined">{z.icon}</span>
                      <span>{z.name} — <em>{z.type}</em></span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warning if route still near danger */}
              {routeInfo.nearbyZones.length > 0 && (
                <div className="rn-warning-zones">
                  <div className="rn-warning-head">
                    <span className="material-symbols-outlined">warning</span>
                    Caution: {routeInfo.nearbyZones.length} zone{routeInfo.nearbyZones.length > 1 ? 's' : ''} near route
                  </div>
                  {routeInfo.nearbyZones.map(z => (
                    <div key={z.id} className="rn-warning-item">
                      <span className="material-symbols-outlined">{z.icon}</span>
                      <span>{z.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Turn-by-turn */}
              {routeInfo.steps.length > 0 && (
                <div className="rn-steps">
                  <div className="rn-steps-head">Directions</div>
                  {routeInfo.steps.slice(0, 6).map((s, i) => (
                    <div key={i} className="rn-step">
                      <span className="material-symbols-outlined rn-step-icon">
                        {i === 0 ? 'trip_origin' : i === routeInfo.steps.length - 1 ? 'flag' : 'turn_right'}
                      </span>
                      <span className="rn-step-text">
                        {s.instruction}
                        {s.distance > 0 && <span className="rn-step-dist">({fmtDist(s.distance)})</span>}
                      </span>
                    </div>
                  ))}
                  {routeInfo.steps.length > 6 && (
                    <div className="rn-step muted">
                      <span className="material-symbols-outlined rn-step-icon">more_horiz</span>
                      <span className="rn-step-text">+{routeInfo.steps.length - 6} more steps</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clear */}
        {(origin || destination || routeInfo) && (
          <button className="rn-clear" onClick={clearAll}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            Clear All
          </button>
        )}
      </div>

      {/* ─── Map ─── */}
      <div className="rn-map">
        <div ref={mapContainerRef} className="rn-map-gl" />

        {mapClickMode && (
          <div className="rn-click-banner">
            <span className="material-symbols-outlined">ads_click</span>
            Click map to set {mapClickMode === 'origin' ? 'starting point' : 'destination'}
          </div>
        )}

        {/* Combined Legend */}
        <div className="rn-legend">
          <div className="rn-legend-group">
            <span className="rn-legend-title">Sensors</span>
            <div className="rn-legend-row"><span className="rn-leg-dot" style={{ background: '#22c55e' }} /><span>Normal</span></div>
            <div className="rn-legend-row"><span className="rn-leg-dot" style={{ background: '#f59e0b' }} /><span>Warning</span></div>
            <div className="rn-legend-row"><span className="rn-leg-dot" style={{ background: '#ef4444' }} /><span>Danger</span></div>
          </div>
          <div className="rn-legend-group">
            <span className="rn-legend-title">Roads</span>
            <div className="rn-legend-row"><span className="rn-leg-line" style={{ background: '#ef4444' }} /><span>Closed</span></div>
            <div className="rn-legend-row"><span className="rn-leg-line" style={{ background: '#f59e0b' }} /><span>Partial</span></div>
            <div className="rn-legend-row"><span className="rn-leg-line" style={{ background: '#3b82f6' }} /><span>Maint.</span></div>
          </div>
          <div className="rn-legend-group">
            <span className="rn-legend-title">Route</span>
            <div className="rn-legend-row"><svg width="16" height="10"><path d="M2 5 Q8 2 14 5" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round"/></svg><span>Origin</span></div>
            <div className="rn-legend-row"><svg width="16" height="10"><path d="M2 5 Q8 2 14 5" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round"/></svg><span>Dest.</span></div>
            <div className="rn-legend-row"><span className="rn-leg-line" style={{ background: '#22c55e' }} /><span>Safe Path</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteNavigator;
