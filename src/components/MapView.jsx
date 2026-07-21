import React, { useRef, useEffect, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppContext } from '../context/AppContext';
import { roadStatusColors } from '../data/MockIoTService';
import './MapView.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const statusColors = {
  normal: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const getCustomCursor = (color) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="6" fill="none" stroke="${color}" stroke-width="2"/>
    <circle cx="16" cy="16" r="2" fill="${color}"/>
    <line x1="16" y1="4" x2="16" y2="10" stroke="${color}" stroke-width="2"/>
    <line x1="16" y1="22" x2="16" y2="28" stroke="${color}" stroke-width="2"/>
    <line x1="4" y1="16" x2="10" y2="16" stroke="${color}" stroke-width="2"/>
    <line x1="22" y1="16" x2="28" y2="16" stroke="${color}" stroke-width="2"/>
  </svg>`;
  // Encode SVG correctly for CSS URL
  const svgEncoded = encodeURIComponent(svg.trim());
  return `url("data:image/svg+xml;utf8,${svgEncoded}") 16 16, crosshair`;
};

const MapView = ({ 
  height = '400px', 
  enableAdmin = false, 
  onMapClick, 
  showSensors = true,
  showRoadMarkers = true,
  showAltRoutes = true,
  markingPoints = [],
  altMarkingPoints = [],
  selectedColor = '#ef4444',
  coordPoints = [],
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const wrapperRef = useRef(null);
  const markersRef = useRef([]);
  const iotMarkersRef = useRef([]);
  const coordMarkersRef = useRef([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { sensors, roadMarkers, weather, wifiIotDevices, theme } = useAppContext();

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    // Resize map after transition
    setTimeout(() => {
      if (map.current) map.current.resize();
    }, 350);
  }, []);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [weather?.lng || 72.8777, weather?.lat || 19.0760], // Dynamic center
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map style when theme changes
  useEffect(() => {
    if (map.current) {
      map.current.setStyle('mapbox://styles/mapbox/dark-v11');
    }
  }, [theme]);

  // Recenter map if weather location changes
  useEffect(() => {
    if (map.current && weather?.lng && weather?.lat) {
      map.current.flyTo({
        center: [weather.lng, weather.lat],
        essential: true,
        duration: 2000 // Smooth transition
      });
    }
  }, [weather?.lng, weather?.lat]);

  // Update sensor markers when sensors change
  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!map.current || !showSensors) return;

    sensors.forEach((sensor) => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'map-marker';
      el.style.backgroundColor = statusColors[sensor.status] || '#22c55e';
      el.style.width = sensor.status === 'danger' ? '20px' : '14px';
      el.style.height = sensor.status === 'danger' ? '20px' : '14px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = `0 0 8px ${statusColors[sensor.status] || '#22c55e'}`;

      if (sensor.status === 'danger') {
        el.style.animation = 'markerPulse 1.5s infinite';
      }

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="font-family: Inter, sans-serif; padding: 4px;">
          <strong style="font-size: 14px;">${sensor.name}</strong>
          <div style="margin-top: 4px; font-size: 12px; color: #666;">ID: ${sensor.id}</div>
          <div style="margin-top: 8px; font-size: 20px; font-weight: 800; color: ${statusColors[sensor.status]};">
            ${sensor.value} ${sensor.unit}
          </div>
          <div style="margin-top: 4px; font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${statusColors[sensor.status]};">
            ${sensor.status}
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([sensor.lng, sensor.lat])
        .setPopup(popup)
        .addTo(map.current);

      markersRef.current.push(marker);
    });
  }, [sensors]);

  // Update IoT device markers
  useEffect(() => {
    // Clear existing IoT markers
    iotMarkersRef.current.forEach((m) => m.remove());
    iotMarkersRef.current = [];

    if (!map.current || !wifiIotDevices || !showSensors) return;

    wifiIotDevices.forEach((device) => {
      if (!device.lat || !device.lng) return;

      const sensorHeight = device.sensorHeightCm || 200;
      const floodDepth = sensorHeight - (device.latestDistanceCm || 0);
      const displayDepth = Math.max(0, floodDepth);

      let localStatus = 'normal';
      if (floodDepth >= (device.thresholdDanger ?? 30)) {
        localStatus = 'danger';
      } else if (floodDepth >= (device.thresholdWarning ?? 10)) {
        localStatus = 'warning';
      }

      const color = statusColors[localStatus] || '#22c55e';

      // Create custom IoT marker element
      const el = document.createElement('div');
      el.className = 'map-marker iot-map-marker';
      el.style.width = localStatus === 'danger' ? '24px' : '18px';
      el.style.height = localStatus === 'danger' ? '24px' : '18px';
      el.style.borderRadius = '50%';
      el.style.border = `3px solid ${color}`;
      el.style.backgroundColor = color;
      el.style.boxShadow = `0 0 12px ${color}, 0 0 4px ${color}`;
      el.style.position = 'relative';

      if (localStatus === 'danger') {
        el.style.animation = 'markerPulse 1s infinite';
      }

      // Add WiFi icon overlay
      const icon = document.createElement('div');
      icon.style.position = 'absolute';
      icon.style.top = '50%';
      icon.style.left = '50%';
      icon.style.transform = 'translate(-50%, -50%)';
      icon.style.fontSize = localStatus === 'danger' ? '14px' : '10px';
      icon.style.color = 'white';
      icon.style.fontWeight = 'bold';
      icon.textContent = '◉';
      el.appendChild(icon);

      const statusLabel = localStatus === 'danger' ? '🔴 DANGER' : localStatus === 'warning' ? '🟡 WARNING' : '🟢 NORMAL';

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="font-family: Inter, sans-serif; padding: 6px; min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 16px;">🌊</span>
            <strong style="font-size: 14px;">${device.name}</strong>
          </div>
          <div style="font-size: 11px; color: #888; margin-bottom: 6px;">ID: ${device.id}</div>
          <div style="font-size: 22px; font-weight: 800; color: ${color}; margin-bottom: 4px;">
            ${displayDepth.toFixed(1)} cm <span style="font-size: 12px; font-weight: 500; color: #888;">(Flood Depth)</span>
          </div>
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.04em;">
            ${statusLabel}
          </div>
          <div style="font-size: 10px; color: #888; margin-top: 4px;">
            ⚠️ Warn ≥${device.thresholdWarning}cm · 🔴 Danger ≥${device.thresholdDanger}cm
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([device.lng, device.lat])
        .setPopup(popup)
        .addTo(map.current);

      iotMarkersRef.current.push(marker);
    });
  }, [wifiIotDevices]);

  // Draw road segments as GeoJSON lines
  useEffect(() => {
    if (!map.current || !showRoadMarkers) return;

    const addRoadLayers = () => {
      // Remove existing road layers first
      roadMarkers.forEach((_, i) => {
        const layerId = `road-layer-${i}`;
        const sourceId = `road-source-${i}`;
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        if (map.current.getLayer(`${layerId}-outline`)) {
          map.current.removeLayer(`${layerId}-outline`);
        }
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      });

      // Also clean up old layers that may exceed current count
      for (let i = 0; i < 50; i++) {
        const layerId = `road-layer-${i}`;
        const altLayerId = `road-layer-alt-${i}`;
        const sourceId = `road-source-${i}`;
        const altSourceId = `road-source-alt-${i}`;
        if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
        if (map.current.getLayer(`${layerId}-outline`)) map.current.removeLayer(`${layerId}-outline`);
        if (map.current.getLayer(altLayerId)) map.current.removeLayer(altLayerId);
        if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
        if (map.current.getSource(altSourceId)) map.current.removeSource(altSourceId);
      }

      // Add road segment layers
      roadMarkers.forEach((marker, i) => {
        const sourceId = `road-source-${i}`;
        const layerId = `road-layer-${i}`;

        const geojson = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: marker.coordinates,
          },
          properties: {
            name: marker.name,
            status: marker.status,
            reason: marker.reason,
            altRoute: marker.altRoute,
          },
        };

        map.current.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        // Outline (glow effect)
        map.current.addLayer({
          id: `${layerId}-outline`,
          type: 'line',
          source: sourceId,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': marker.color || roadStatusColors[marker.status] || '#ef4444',
            'line-width': 10,
            'line-opacity': 0.3,
          },
        });

        // Main line
        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': marker.color || roadStatusColors[marker.status] || '#ef4444',
            'line-width': 4,
            'line-opacity': 0.9,
          },
        });

        // Alternate Route Layer
        if (showAltRoutes && marker.altCoordinates && marker.altCoordinates.length >= 2) {
          const altSourceId = `road-source-alt-${i}`;
          const altLayerId = `road-layer-alt-${i}`;
          
          map.current.addSource(altSourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: marker.altCoordinates,
              },
            }
          });
          
          map.current.addLayer({
            id: altLayerId,
            type: 'line',
            source: altSourceId,
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#22c55e', // Green for alternate route
              'line-width': 3,
              'line-dasharray': [2, 2], // Dashed line
              'line-opacity': 0.8,
            },
          });
        }

        // Click popup for road segments
        map.current.on('click', layerId, (e) => {
          const props = e.features[0].properties;
          new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: Inter, sans-serif; padding: 6px; max-width: 260px;">
                <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; color: ${marker.color || '#ef4444'}; margin-bottom: 4px;">
                  ${props.status}
                </div>
                <strong style="font-size: 14px; display: block; margin-bottom: 6px;">${props.name}</strong>
                <div style="font-size: 12px; color: #888; margin-bottom: 6px;">
                  <strong>Reason:</strong> ${props.reason}
                </div>
                ${props.altRoute ? `
                  <div style="font-size: 12px; background: rgba(34,197,94,0.1); padding: 6px 8px; border-radius: 4px; border-left: 3px solid #22c55e;">
                    <strong style="color: #166534;">↪ Alt Route:</strong> ${props.altRoute}
                  </div>
                ` : ''}
              </div>
            `)
            .addTo(map.current);
        });

        // Cursor change on hover
        map.current.on('mouseenter', layerId, () => {
          if (!enableAdmin) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', layerId, () => {
          if (!enableAdmin) map.current.getCanvas().style.cursor = '';
          else map.current.getCanvas().style.cursor = getCustomCursor(selectedColor);
        });
      });
    };

    // If map is already loaded, add layers immediately
    if (map.current.isStyleLoaded()) {
      addRoadLayers();
    } else {
      map.current.on('load', addRoadLayers);
    }
  }, [roadMarkers, showRoadMarkers, showAltRoutes]);

  // Admin click handler and cursor effect
  useEffect(() => {
    if (!map.current || !onMapClick) return;

    const handleMapClickInternal = (e) => {
      if (enableAdmin) {
        onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    };

    if (enableAdmin) {
      map.current.on('click', handleMapClickInternal);
      map.current.getCanvas().style.cursor = getCustomCursor(selectedColor);
    } else {
      map.current.getCanvas().style.cursor = '';
    }

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClickInternal);
      }
    };
  }, [enableAdmin, onMapClick, selectedColor]);

  // Live preview line & points drawing effect
  useEffect(() => {
    if (!map.current) return;

    const updatePreview = () => {
      const sourceId = 'marking-preview-source';
      const lineLayerId = 'marking-preview-line';
      const pointsLayerId = 'marking-preview-points';
      const altSourceId = 'marking-preview-alt-source';
      const altLineLayerId = 'marking-preview-alt-line';
      const altPointsLayerId = 'marking-preview-alt-points';

      if (!enableAdmin) {
        // Clean up everything if not admin
        if (map.current.getLayer(lineLayerId)) map.current.removeLayer(lineLayerId);
        if (map.current.getLayer(pointsLayerId)) map.current.removeLayer(pointsLayerId);
        if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
        if (map.current.getLayer(altLineLayerId)) map.current.removeLayer(altLineLayerId);
        if (map.current.getLayer(altPointsLayerId)) map.current.removeLayer(altPointsLayerId);
        if (map.current.getSource(altSourceId)) map.current.removeSource(altSourceId);
        return;
      }

      // Main Marking Preview
      if (markingPoints && markingPoints.length > 0) {
        const features = [];
        if (markingPoints.length >= 2) {
          features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: markingPoints },
            properties: {}
          });
        }
        markingPoints.forEach((coords, index) => {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coords },
            properties: { index: index + 1, isLast: index === markingPoints.length - 1 }
          });
        });

        const geojson = { type: 'FeatureCollection', features };
        if (map.current.getSource(sourceId)) {
          map.current.getSource(sourceId).setData(geojson);
        } else {
          map.current.addSource(sourceId, { type: 'geojson', data: geojson });
          map.current.addLayer({
            id: lineLayerId, type: 'line', source: sourceId, filter: ['==', '$type', 'LineString'],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': selectedColor, 'line-width': 4, 'line-dasharray': [2, 2], 'line-opacity': 0.85 },
          });
          map.current.addLayer({
            id: pointsLayerId, type: 'circle', source: sourceId, filter: ['==', '$type', 'Point'],
            paint: { 'circle-radius': 7, 'circle-color': '#ffffff', 'circle-stroke-width': 3, 'circle-stroke-color': selectedColor },
          });
        }
      } else {
        if (map.current.getLayer(lineLayerId)) map.current.removeLayer(lineLayerId);
        if (map.current.getLayer(pointsLayerId)) map.current.removeLayer(pointsLayerId);
        if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
      }

      // Alt Marking Preview
      if (altMarkingPoints && altMarkingPoints.length > 0) {
        const altFeatures = [];
        if (altMarkingPoints.length >= 2) {
          altFeatures.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: altMarkingPoints },
            properties: {}
          });
        }
        altMarkingPoints.forEach((coords, index) => {
          altFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coords },
            properties: { index: index + 1, isLast: index === altMarkingPoints.length - 1 }
          });
        });

        const altGeojson = { type: 'FeatureCollection', features: altFeatures };
        if (map.current.getSource(altSourceId)) {
          map.current.getSource(altSourceId).setData(altGeojson);
        } else {
          map.current.addSource(altSourceId, { type: 'geojson', data: altGeojson });
          map.current.addLayer({
            id: altLineLayerId, type: 'line', source: altSourceId, filter: ['==', '$type', 'LineString'],
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#22c55e', 'line-width': 4, 'line-dasharray': [2, 2], 'line-opacity': 0.85 },
          });
          map.current.addLayer({
            id: altPointsLayerId, type: 'circle', source: altSourceId, filter: ['==', '$type', 'Point'],
            paint: { 'circle-radius': 7, 'circle-color': '#ffffff', 'circle-stroke-width': 3, 'circle-stroke-color': '#22c55e' },
          });
        }
      } else {
        if (map.current.getLayer(altLineLayerId)) map.current.removeLayer(altLineLayerId);
        if (map.current.getLayer(altPointsLayerId)) map.current.removeLayer(altPointsLayerId);
        if (map.current.getSource(altSourceId)) map.current.removeSource(altSourceId);
      }
    };

    if (map.current.isStyleLoaded()) {
      updatePreview();
    } else {
      map.current.once('style.load', updatePreview);
    }
  }, [markingPoints, altMarkingPoints, enableAdmin, selectedColor]);

  // Coordinate-based A/B markers and preview line
  useEffect(() => {
    if (!map.current) return;

    const coordSourceId = 'coord-preview-source';
    const coordLineLayerId = 'coord-preview-line';

    // Clear old coordinate markers
    coordMarkersRef.current.forEach(m => m.remove());
    coordMarkersRef.current = [];

    const doUpdate = () => {
      // Remove old line layer/source
      if (map.current.getLayer(coordLineLayerId)) map.current.removeLayer(coordLineLayerId);
      if (map.current.getSource(coordSourceId)) map.current.removeSource(coordSourceId);

      if (!coordPoints || coordPoints.length === 0) return;

      // Add markers for each coord point
      coordPoints.forEach((pt) => {
        const el = document.createElement('div');
        el.className = 'coord-map-marker';
        const isA = pt.label === 'A';
        el.style.cssText = `
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800; color: white;
          border: 3px solid white;
          box-shadow: 0 0 12px ${isA ? 'rgba(34,197,94,0.5)' : 'rgba(245,158,11,0.5)'}, 0 2px 8px rgba(0,0,0,0.3);
          background: ${isA ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #f59e0b, #d97706)'};
          cursor: default;
          animation: coordMarkerDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        `;
        el.textContent = pt.label;

        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
          <div style="font-family: Inter, sans-serif; padding: 4px;">
            <strong style="font-size: 13px;">Point ${pt.label}</strong>
            <div style="font-size: 11px; color: #888; margin-top: 4px; font-family: 'Roboto Mono', monospace;">
              Lat: ${pt.lat.toFixed(6)}<br/>Lng: ${pt.lng.toFixed(6)}
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([pt.lng, pt.lat])
          .setPopup(popup)
          .addTo(map.current);

        coordMarkersRef.current.push(marker);
      });

      // Draw dashed line between A and B
      if (coordPoints.length === 2) {
        const lineCoords = coordPoints.map(p => [p.lng, p.lat]);

        map.current.addSource(coordSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: lineCoords },
          },
        });

        map.current.addLayer({
          id: coordLineLayerId,
          type: 'line',
          source: coordSourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#22d3ee',
            'line-width': 3,
            'line-dasharray': [3, 2],
            'line-opacity': 0.85,
          },
        });

        // Fit bounds to show both points
        const lngs = coordPoints.map(p => p.lng);
        const lats = coordPoints.map(p => p.lat);
        const bounds = [
          [Math.min(...lngs) - 0.005, Math.min(...lats) - 0.005],
          [Math.max(...lngs) + 0.005, Math.max(...lats) + 0.005],
        ];
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 1000 });
      }
    };

    if (map.current.isStyleLoaded()) {
      doUpdate();
    } else {
      map.current.once('style.load', doUpdate);
    }
  }, [coordPoints]);

  return (
    <div ref={wrapperRef} className={`mapview-wrapper ${isFullscreen ? 'mapview-fullscreen' : ''}`} style={{ height: isFullscreen ? '100%' : height }}>
      <div ref={mapContainer} className="mapview-container" />
      {/* Fullscreen toggle */}
      <button
        className="map-fullscreen-btn"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      >
        <span className="material-symbols-outlined">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
      </button>
      {enableAdmin && (
        <div className="map-admin-hint">
          <span className="material-symbols-outlined">ads_click</span>
          Click on the map to place road markers
        </div>
      )}
      <div className="map-legend">
        <div className="legend-section">
          <span className="legend-label">Sensors</span>
          <div className="legend-entry">
            <span className="legend-dot" style={{ background: '#22c55e' }}></span>
            <span>Normal</span>
          </div>
          <div className="legend-entry">
            <span className="legend-dot" style={{ background: '#f59e0b' }}></span>
            <span>Warning</span>
          </div>
          <div className="legend-entry">
            <span className="legend-dot" style={{ background: '#ef4444' }}></span>
            <span>Danger</span>
          </div>
        </div>
        {showRoadMarkers && (
          <div className="legend-section">
            <span className="legend-label">Roads</span>
            <div className="legend-entry">
              <span className="legend-line" style={{ background: '#ef4444' }}></span>
              <span>Closed</span>
            </div>
            <div className="legend-entry">
              <span className="legend-line" style={{ background: '#f59e0b' }}></span>
              <span>Partial</span>
            </div>
            <div className="legend-entry">
              <span className="legend-line" style={{ background: '#3b82f6' }}></span>
              <span>Maintenance</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
