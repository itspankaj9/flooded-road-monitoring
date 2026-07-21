import React, { createContext, useState, useEffect, useContext } from 'react';
import { getPushToken } from '../lib/apiConfig';
import { calculateStatus } from '../data/MockIoTService';
import {
  fetchSensors,
  updateSensor,
  insertSensorReading,
  upsertSensor,
  fetchRoadworks,
  insertRoadwork,
  deleteRoadwork as deleteRoadworkFromDB,
  updateRoadwork as updateRoadworkInDB,
  deleteSensor as deleteSensorFromDB,
  fetchAlerts,
  insertAlert,
  deleteAlert as deleteAlertFromDB,
  upsertAlertBySource,
  fetchRoadMarkers,
  insertRoadMarker,
  deleteRoadMarker as deleteRoadMarkerFromDB,
  fetchWifiSensorHistory,
  fetchLatestWifiReading,
  fetchWifiIotDevices,
  upsertWifiIotDevice,
  deleteWifiIotDevice as deleteWifiIotDeviceFromDB,
  updateWifiIotDeviceStatus,
} from '../lib/supabaseService';
import { fetchCurrentWeather, fetchForecast, fetchCurrentWeatherByCity, fetchForecastByCity } from '../lib/weatherService';
import { translations } from '../lib/translations';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [sensors, setSensors] = useState([]);
  const [roadworks, setRoadworks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sensorHistory, setSensorHistory] = useState([]);
  const [roadMarkers, setRoadMarkers] = useState([]);
  const [wifiSensorData, setWifiSensorData] = useState(null);
  const [wifiSensorHistory, setWifiSensorHistory] = useState([]);
  const [wifiIotDevices, setWifiIotDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Weather state
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [customCity, setCustomCity] = useState(null);

  // Localization state
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Auth state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('adminAuth') === 'true';
  });

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('appTheme') || 'dark'; // default to dark
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // App mode state (WebView hiding)
  const [isAppMode] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'app') {
      sessionStorage.setItem('isAppMode', 'true');
      return true;
    }
    return sessionStorage.getItem('isAppMode') === 'true';
  });

  const loginAdminContext = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('adminAuth', 'true');
  };

  const logoutAdminContext = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
  };

  const changeLanguage = (lang) => {
    setCurrentLanguage(lang);
  };

  const t = (key) => {
    return translations[currentLanguage]?.[key] || translations['en'][key] || key;
  };

  // ----- Load all data from Supabase on mount -----
  useEffect(() => {
    async function loadData() {
      try {
        const [sensorsData, roadworksData, alertsData, roadMarkersData, wifiHistory, wifiLatest, wifiDevices] = await Promise.all([
          fetchSensors(),
          fetchRoadworks(),
          fetchAlerts(),
          fetchRoadMarkers(),
          fetchWifiSensorHistory(60),
          fetchLatestWifiReading(),
          fetchWifiIotDevices(),
        ]);

        setSensors(sensorsData);
        setRoadworks(roadworksData);
        setRoadMarkers(roadMarkersData);
        // Deduplicate alerts by sourceId on initial load
        const deduped = new Map();
        for (const a of alertsData) {
          const key = a.sourceId || a.id;
          const existing = deduped.get(key);
          if (!existing || (a.updatedAt && existing.updatedAt && new Date(a.updatedAt) > new Date(existing.updatedAt))) {
            deduped.set(key, a);
          }
        }
        setAlerts(Array.from(deduped.values()));
        setWifiSensorHistory(wifiHistory);
        setWifiSensorData(wifiLatest);
        setWifiIotDevices(wifiDevices);
      } catch (err) {
        console.error('Failed to load data from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ----- Load weather on mount or when customCity changes -----
  useEffect(() => {
    async function loadWeather(lat, lon) {
      try {
        const [w, f] = await Promise.all([
          fetchCurrentWeather(lat, lon),
          fetchForecast(lat, lon),
        ]);
        setWeather(w);
        setForecast(f);
      } catch (err) {
        console.error('Failed to fetch weather:', err);
      } finally {
        setWeatherLoading(false);
      }
    }

    async function loadWeatherByCity(city) {
      setWeatherLoading(true);
      try {
        const [w, f] = await Promise.all([
          fetchCurrentWeatherByCity(city),
          fetchForecastByCity(city),
        ]);
        setWeather(w);
        setForecast(f);
      } catch (err) {
        console.error('Failed to fetch weather by city:', err);
      } finally {
        setWeatherLoading(false);
      }
    }

    const fetchLocationByIP = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          loadWeather(data.latitude, data.longitude);
        } else {
          loadWeather(); // Ultimate fallback to default (Mumbai)
        }
      } catch (err) {
        console.warn("IP Geolocation failed, using default location.", err);
        loadWeather();
      }
    };

    const fetchWeather = () => {
      if (customCity) {
        loadWeatherByCity(customCity);
      } else {
        requestLiveLocation();
      }
    };

    fetchWeather();

    // Refresh weather every 10 minutes
    const weatherInterval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, [customCity]);

  // Expose manual location request
  const requestLiveLocation = () => {
    setCustomCity(null); // Clear custom city
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setWeatherLoading(true);
          try {
            const [w, f] = await Promise.all([
              fetchCurrentWeather(position.coords.latitude, position.coords.longitude),
              fetchForecast(position.coords.latitude, position.coords.longitude),
            ]);
            setWeather(w);
            setForecast(f);
          } catch (err) {
            console.error('Failed to fetch weather:', err);
          } finally {
            setWeatherLoading(false);
          }
        },
        async (error) => {
          console.warn("Browser GPS denied/failed, falling back to IP Location.", error);
          await fetchFallbackIPLocation();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      console.warn("Geolocation API entirely missing (likely due to HTTP on mobile). Falling back to IP Location.");
      fetchFallbackIPLocation();
    }
  };

  const fetchFallbackIPLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        setWeatherLoading(true);
        const [w, f] = await Promise.all([
          fetchCurrentWeather(data.latitude, data.longitude),
          fetchForecast(data.latitude, data.longitude),
        ]);
        setWeather(w);
        setForecast(f);
        setWeatherLoading(false);
      } else {
        setWeatherLoading(true);
        const [w, f] = await Promise.all([fetchCurrentWeather(), fetchForecast()]);
        setWeather(w); setForecast(f);
        setWeatherLoading(false);
      }
    } catch (err) {
      console.warn("IP Geolocation failed.", err);
      setWeatherLoading(true);
      const [w, f] = await Promise.all([fetchCurrentWeather(), fetchForecast()]);
      setWeather(w); setForecast(f);
      setWeatherLoading(false);
    }
  };

  // ----- Live Polling of Data from Supabase -----
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [sensorsData, roadworksData, alertsData, roadMarkersData] = await Promise.all([
          fetchSensors(),
          fetchRoadworks(),
          fetchAlerts(),
          fetchRoadMarkers(),
        ]);

        setSensors(sensorsData);
        setRoadworks(roadworksData);
        setRoadMarkers(roadMarkersData);

        // Merge alerts from DB with local state, deduplicating by sourceId.
        // For source-tracked alerts, keep the most recently updated version.
        setAlerts(prev => {
          const merged = new Map();
          // Add DB alerts first
          for (const a of alertsData) {
            const key = a.sourceId || a.id;
            merged.set(key, a);
          }
          // Overlay local state — keep local version if it's newer
          for (const a of prev) {
            const key = a.sourceId || a.id;
            const existing = merged.get(key);
            if (!existing || (a.updatedAt && existing.updatedAt && new Date(a.updatedAt) > new Date(existing.updatedAt))) {
              merged.set(key, a);
            }
          }
          // Sort by updatedAt descending (most recent first)
          return Array.from(merged.values()).sort((a, b) => {
            const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return tb - ta;
          });
        });

        // Update sensor history for chart
        if (sensorsData.length > 0) {
          setSensorHistory((prev) => {
            const entry = {
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            };
            sensorsData.forEach((s) => {
              entry[s.id] = s.value;
            });
            const newHistory = [...prev, entry];
            return newHistory.length > 30 ? newHistory.slice(-30) : newHistory;
          });
        }
      } catch (err) {
        console.error('Failed to poll data from Supabase:', err);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

   // ----- Live Polling of WiFi IoT Sensor (every 5s) -----
  useEffect(() => {
    // Track the last known status per device to detect real transitions
    const lastKnownStatus = {};

    const wifiInterval = setInterval(async () => {
      try {
        const [wifiHistory, wifiLatest, wifiDevices] = await Promise.all([
          fetchWifiSensorHistory(60),
          fetchLatestWifiReading(),
          fetchWifiIotDevices(),
        ]);
        setWifiSensorHistory(wifiHistory);
        setWifiSensorData(wifiLatest);
        setWifiIotDevices(wifiDevices);

        // Auto-compute device status based on latest reading
        if (wifiLatest && wifiDevices.length > 0) {
          const device = wifiDevices[0];
          const dist = wifiLatest.distanceCm;
          const sensorHeight = device.sensorHeightCm || 200; // Fallback to 200cm if not set
          const floodDepth = sensorHeight - dist;
          
          let newStatus = 'normal';
          if (floodDepth >= device.thresholdDanger) {
            newStatus = 'danger';
          } else if (floodDepth >= device.thresholdWarning) {
            newStatus = 'warning';
          }

          // Initialize last known status from DB on first poll
          if (lastKnownStatus[device.id] === undefined) {
            lastKnownStatus[device.id] = device.status;
          }

          const previousStatus = lastKnownStatus[device.id];

          // Update device status in DB if changed or distance shifted
          if (device.status !== newStatus || Math.abs(device.latestDistanceCm - dist) > 0.5) {
            updateWifiIotDeviceStatus(device.id, newStatus, dist);
          }

          // --- Alert logic: only on actual STATUS TRANSITIONS ---
          if (previousStatus !== newStatus) {
            const stableAlertId = `ALT-IOT-${device.id}`;
            const sourceId = device.id;

            if (newStatus === 'danger') {
              // Transition INTO danger → upsert a danger alert
              const deviceLoc = device.location && device.location !== device.name ? `${device.name}: ${device.location}` : device.name;
              const alertData = {
                id: stableAlertId,
                title: `CRITICAL: Flood Danger at ${deviceLoc}`,
                location: device.location || device.name,
                type: 'danger',
                date: new Date().toISOString().split('T')[0],
                sourceId,
                updatedAt: new Date().toISOString(),
              };

              setAlerts(prev => {
                const withoutOld = prev.filter(a => a.sourceId !== sourceId);
                return [alertData, ...withoutOld];
              });
              upsertAlertBySource(alertData);

              // Send push notification
              const pushToken = getPushToken();
              if (pushToken) {
                fetch('https://exp.host/--/api/v2/push/send', {
                  method: 'POST',
                  headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    to: pushToken,
                    sound: 'default',
                    title: alertData.title,
                    body: `Water level critical (${Math.max(0, floodDepth).toFixed(1)}cm on road). Immediate action required.`,
                    data: { alertId: stableAlertId },
                  }),
                }).catch(err => console.error('Failed to send push notification', err));
              }
            } else if (previousStatus === 'danger' && newStatus !== 'danger') {
              // Transition OUT of danger → resolve the same alert
              const alertData = {
                id: stableAlertId,
                title: `RESOLVED: ${device.name} \u2014 Water level safe`,
                type: 'success',
                date: new Date().toISOString().split('T')[0],
                sourceId,
                updatedAt: new Date().toISOString(),
              };

              setAlerts(prev => {
                const withoutOld = prev.filter(a => a.sourceId !== sourceId);
                return [alertData, ...withoutOld];
              });
              upsertAlertBySource(alertData);
            }

            // Update our local tracker
            lastKnownStatus[device.id] = newStatus;
          }
        }
      } catch (err) {
        console.error('Failed to poll WiFi sensor data:', err);
      }
    }, 5000);

    return () => clearInterval(wifiInterval);
  }, []);

  // ----- Sensor Methods -----
  const updateSensorManual = (id, newValue) => {
    setSensors((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const status = calculateStatus(newValue, s.thresholdWarning, s.thresholdDanger);
          const updatedSensor = { ...s, value: newValue, status };
          updateSensor(id, { value: newValue, status });
          insertSensorReading(updatedSensor);
          return updatedSensor;
        }
        return s;
      })
    );
  };

  const addSensor = (sensorData) => {
    setSensors(prev => [...prev, sensorData]);
    upsertSensor(sensorData);
    insertSensorReading(sensorData);
  };

  const removeSensor = (id) => {
    setSensors(prev => prev.filter(s => s.id !== id));
    deleteSensorFromDB(id);
  };

  // ----- Roadwork Methods -----
  const addRoadwork = (roadwork) => {
    setRoadworks((prev) => [roadwork, ...prev]);
    insertRoadwork(roadwork);
  };

  const removeRoadwork = (id) => {
    setRoadworks(prev => prev.filter(r => r.id !== id));
    deleteRoadworkFromDB(id);
  };

  const editRoadwork = (id, updates) => {
    setRoadworks(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    updateRoadworkInDB(id, updates);
  };

  // ----- Alert Methods -----
  const addAlert = (alert) => {
    setAlerts((prev) => [alert, ...prev]);
    insertAlert(alert);
  };

  /**
   * Upsert alert for a specific source (device/marker).
   * If an alert with the same sourceId exists, update it in-place and move to top.
   * If not, create a new alert.
   */
  const upsertAlertForSource = (sourceId, alertData) => {
    const alertWithSource = { ...alertData, sourceId, updatedAt: new Date().toISOString() };
    setAlerts(prev => {
      const withoutOld = prev.filter(a => a.sourceId !== sourceId);
      return [alertWithSource, ...withoutOld];
    });
    upsertAlertBySource(alertWithSource);
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    deleteAlertFromDB(id);
  };

  // ----- Road Marker Methods -----
  const addRoadMarker = (marker) => {
    setRoadMarkers(prev => [marker, ...prev]);
    insertRoadMarker(marker);

    addRoadwork({
      id: marker.roadworkId || `RW-MAP-${Date.now()}`,
      location: marker.name,
      status: marker.status,
      reason: marker.reason,
      altRoute: marker.altRoute || '',
      updated: 'Just now',
      progress: 0,
    });

    // Upsert alert per road marker (one alert per marker, not duplicates)
    upsertAlertForSource(marker.id, {
      id: `AL-ROAD-${marker.id}`,
      title: `Road marked as ${marker.status}: ${marker.name}`,
      type: marker.status === 'Full Closure' ? 'error' : 'warning',
      date: new Date().toLocaleDateString(),
    });
  };

  const removeRoadMarker = (markerId) => {
    setRoadMarkers(prev => prev.filter(m => m.id !== markerId));
    deleteRoadMarkerFromDB(markerId);
  };

  // Show loading state while fetching from Supabase
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
        color: 'var(--color-on-surface, #e0e0e0)',
        backgroundColor: 'var(--color-surface, #121212)',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--color-outline-variant, #444)',
          borderTopColor: 'var(--color-primary, #90caf9)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: '14px', opacity: 0.7 }}>Loading infrastructure data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ----- WiFi IoT Device Methods -----
  const addWifiIotDevice = (device) => {
    setWifiIotDevices(prev => [...prev, device]);
    upsertWifiIotDevice(device);
  };

  const removeWifiIotDevice = (id) => {
    setWifiIotDevices(prev => prev.filter(d => d.id !== id));
    deleteWifiIotDeviceFromDB(id);
  };

  const editWifiIotDevice = (device) => {
    setWifiIotDevices(prev => prev.map(d => d.id === device.id ? { ...d, ...device } : d));
    upsertWifiIotDevice(device);
  };

  return (
    <AppContext.Provider
      value={{
        // Data
        sensors,
        roadworks,
        alerts,
        sensorHistory,
        roadMarkers,
        // WiFi IoT Sensor
        wifiSensorData,
        wifiSensorHistory,
        wifiIotDevices,
        // Weather
        weather,
        forecast,
        weatherLoading,
        customCity,
        setCustomCity,
        requestLiveLocation,
        // Localization
        currentLanguage,
        changeLanguage,
        t,
        // Sensor methods
        updateSensorManual,
        addSensor,
        removeSensor,
        // Roadwork methods
        addRoadwork,
        removeRoadwork,
        editRoadwork,
        // Alert methods
        addAlert,
        upsertAlertForSource,
        removeAlert,
        // Road marker methods
        addRoadMarker,
        removeRoadMarker,
        // WiFi IoT device methods
        addWifiIotDevice,
        removeWifiIotDevice,
        editWifiIotDevice,
        // Auth methods
        isAdminAuthenticated,
        loginAdminContext,
        logoutAdminContext,
        isAppMode,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
