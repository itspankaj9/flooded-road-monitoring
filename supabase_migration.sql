-- =============================================================
-- Supabase Migration Script
-- Smart Infrastructure Alert System
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. SENSORS TABLE
-- Stores sensor definitions (water level, rainfall, rain sensors)
CREATE TABLE IF NOT EXISTS sensors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '',
  status TEXT DEFAULT 'normal',
  threshold_warning NUMERIC DEFAULT 0,
  threshold_danger NUMERIC DEFAULT 0,
  lat NUMERIC DEFAULT 0,
  lng NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SENSOR_READINGS TABLE
-- Time-series data for sensor history charts
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  sensor_id TEXT NOT NULL,
  sensor_name TEXT,
  type TEXT,
  value NUMERIC,
  unit TEXT,
  status TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by sensor and time
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings(recorded_at DESC);

-- 3. ROADWORKS TABLE
-- Active road disruptions and maintenance projects
CREATE TABLE IF NOT EXISTS roadworks (
  id TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  alt_route TEXT,
  updated TEXT,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ALERTS TABLE
-- Citizen notifications and system alerts
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  date TEXT,
  source_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for ordering alerts by creation time
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- 5. ROAD_MARKERS TABLE
-- GeoJSON road segment data for map visualization
CREATE TABLE IF NOT EXISTS road_markers (
  id TEXT PRIMARY KEY,
  roadwork_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  alt_route TEXT,
  color TEXT DEFAULT '#ef4444',
  coordinates JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SENSOR_READINGS_WIFI TABLE
-- Live readings from ESP WiFi ultrasonic sensors
CREATE TABLE IF NOT EXISTS sensor_readings_wifi (
  id BIGSERIAL PRIMARY KEY,
  distance_cm NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_wifi_created_at ON sensor_readings_wifi(created_at DESC);

-- 7. WIFI_IOT_DEVICES TABLE
-- Registered WiFi IoT devices with GPS location and thresholds
CREATE TABLE IF NOT EXISTS wifi_iot_devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat NUMERIC DEFAULT 0,
  lng NUMERIC DEFAULT 0,
  threshold_warning NUMERIC DEFAULT 80,
  threshold_danger NUMERIC DEFAULT 30,
  status TEXT DEFAULT 'normal',
  latest_distance_cm NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- DISABLE ROW LEVEL SECURITY (for anon key access)
-- Enable and add policies if you need production security
-- =============================================================
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings_wifi ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_iot_devices ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon role (development mode)
CREATE POLICY "Allow all access to sensors" ON sensors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sensor_readings" ON sensor_readings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to roadworks" ON roadworks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to alerts" ON alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to road_markers" ON road_markers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sensor_readings_wifi" ON sensor_readings_wifi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to wifi_iot_devices" ON wifi_iot_devices FOR ALL USING (true) WITH CHECK (true);

-- =============================================================
-- SEED DATA — Same data that was hardcoded in MockIoTService.js
-- =============================================================

-- Seed Sensors
INSERT INTO sensors (id, name, type, value, unit, status, threshold_warning, threshold_danger, lat, lng) VALUES
  ('WL-01', 'River Front Segment A', 'water_level', 4.2, 'm', 'normal', 6.0, 8.0, 19.0760, 72.8777),
  ('WL-02', 'Downtown Underpass', 'water_level', 0.5, 'm', 'normal', 1.5, 2.5, 19.0330, 72.8353),
  ('RS-01', 'North Sector Rainfall', 'rainfall', 12, 'mm/hr', 'normal', 30, 50, 19.1176, 72.9060)
ON CONFLICT (id) DO NOTHING;

-- Seed Roadworks
INSERT INTO roadworks (id, location, status, reason, alt_route, updated, progress) VALUES
  ('RW-01', 'Western Express Highway - Andheri', 'Full Closure', 'Emergency Pipeline Repair', 'Take SV Road via Goregaon', '2 hrs ago', 0),
  ('RW-02', 'LBS Marg (Kurla to Ghatkopar)', 'Partial Lane', 'Drainage Maintenance', 'Use Eastern Express Highway', 'Yesterday', 40),
  ('RW-03', 'Sion-Panvel Expressway', 'Full Closure', 'Bridge Deck Replacement', 'Detour via Thane-Belapur Road', 'Jun 20', 75)
ON CONFLICT (id) DO NOTHING;

-- Seed Alerts
INSERT INTO alerts (id, title, type, date) VALUES
  ('AL-01', 'Heavy rainfall expected in Mumbai region - IMD Advisory', 'warning', 'Jun 23, 2026'),
  ('AL-02', 'Mithi River water level rising - Monitoring active', 'info', 'Jun 23, 2026'),
  ('AL-03', 'Western Express Highway drainage upgrade completed', 'success', 'Jun 22, 2026')
ON CONFLICT (id) DO NOTHING;

-- Seed Road Markers
INSERT INTO road_markers (id, roadwork_id, name, status, reason, alt_route, color, coordinates) VALUES
  ('RM-01', 'RW-01', 'Western Express Highway - Andheri', 'Full Closure', 'Emergency Pipeline Repair', 'Take SV Road via Goregaon', '#ef4444',
   '[[72.8565, 19.1197], [72.8548, 19.1250], [72.8530, 19.1310], [72.8515, 19.1370], [72.8500, 19.1430]]'::jsonb),
  ('RM-02', 'RW-02', 'LBS Marg (Kurla to Ghatkopar)', 'Partial Lane', 'Drainage Maintenance', 'Use Eastern Express Highway', '#f59e0b',
   '[[72.8796, 19.0726], [72.8850, 19.0760], [72.8920, 19.0790], [72.8980, 19.0810], [72.9080, 19.0860]]'::jsonb),
  ('RM-03', 'RW-03', 'Sion-Panvel Expressway', 'Full Closure', 'Bridge Deck Replacement', 'Detour via Thane-Belapur Road', '#ef4444',
   '[[72.8620, 19.0400], [72.8700, 19.0350], [72.8800, 19.0300], [72.8900, 19.0250], [72.9050, 19.0180]]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 8. ADMIN_USERS TABLE
-- Simple authentication for the admin panel
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);

INSERT INTO admin_users (username, password) VALUES ('pankaj', 'pankaj07') ON CONFLICT (username) DO NOTHING;

-- =============================================================
-- Done! Your tables are ready. The app will now read/write here.
-- =============================================================
