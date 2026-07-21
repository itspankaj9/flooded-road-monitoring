import { supabase } from './supabase';

// ===== SENSORS =====

export async function fetchSensors() {
  const { data, error } = await supabase
    .from('sensors')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch sensors:', error.message);
    return [];
  }

  // Map DB column names to the camelCase format the app expects
  return data.map(row => ({
    id: row.id,
    name: row.name,
    type: row.type,
    value: Number(row.value),
    unit: row.unit,
    status: row.status,
    thresholdWarning: Number(row.threshold_warning),
    thresholdDanger: Number(row.threshold_danger),
    lat: Number(row.lat),
    lng: Number(row.lng),
  }));
}

export async function updateSensor(id, updates) {
  const dbUpdates = {};
  if (updates.value !== undefined) dbUpdates.value = updates.value;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('sensors')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Failed to update sensor:', error.message);
  }
  return !error;
}

export async function upsertSensor(sensor) {
  const { error } = await supabase
    .from('sensors')
    .upsert({
      id: sensor.id,
      name: sensor.name,
      type: sensor.type,
      value: sensor.value,
      unit: sensor.unit,
      status: sensor.status,
      threshold_warning: sensor.thresholdWarning,
      threshold_danger: sensor.thresholdDanger,
      lat: sensor.lat,
      lng: sensor.lng,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error('Failed to upsert sensor:', error.message);
  }
  return !error;
}

// ===== SENSOR READINGS (time-series) =====

export async function insertSensorReading(sensor) {
  const { error } = await supabase
    .from('sensor_readings')
    .insert({
      sensor_id: sensor.id,
      sensor_name: sensor.name,
      type: sensor.type,
      value: sensor.value,
      unit: sensor.unit,
      status: sensor.status,
      recorded_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to insert sensor reading:', error.message);
  }
  return !error;
}

export async function fetchRecentSensorReadings(limit = 30) {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(limit * 10); // Fetch more to group by time

  if (error) {
    console.error('Failed to fetch sensor readings:', error.message);
    return [];
  }

  return data;
}

// ===== ROADWORKS =====

export async function fetchRoadworks() {
  const { data, error } = await supabase
    .from('roadworks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch roadworks:', error.message);
    return [];
  }

  return data.map(row => ({
    id: row.id,
    location: row.location,
    status: row.status,
    reason: row.reason,
    altRoute: row.alt_route,
    updated: row.updated,
    progress: row.progress,
  }));
}

export async function insertRoadwork(roadwork) {
  const { error } = await supabase
    .from('roadworks')
    .insert({
      id: roadwork.id,
      location: roadwork.location,
      status: roadwork.status,
      reason: roadwork.reason,
      alt_route: roadwork.altRoute || '',
      updated: roadwork.updated || 'Just now',
      progress: roadwork.progress || 0,
    });

  if (error) {
    console.error('Failed to insert roadwork:', error.message);
  }
  return !error;
}

export async function deleteRoadwork(id) {
  const { error } = await supabase
    .from('roadworks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete roadwork:', error.message);
  }
  return !error;
}

export async function updateRoadwork(id, updates) {
  const dbUpdates = {
    location: updates.location,
    status: updates.status,
    reason: updates.reason,
    alt_route: updates.altRoute,
    progress: updates.progress,
    updated: new Date().toLocaleDateString(),
  };
  const { error } = await supabase
    .from('roadworks')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Failed to update roadwork:', error.message);
  }
  return !error;
}

export async function deleteSensor(id) {
  const { error } = await supabase
    .from('sensors')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete sensor:', error.message);
  }
  return !error;
}

// ===== ALERTS =====

export async function fetchAlerts() {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch alerts:', error.message);
    return [];
  }

  return data.map(row => ({
    id: row.id,
    title: row.title,
    type: row.type,
    date: row.date,
    sourceId: row.source_id || null,
    updatedAt: row.updated_at || row.created_at,
  }));
}

export async function insertAlert(alert) {
  const { error } = await supabase
    .from('alerts')
    .insert({
      id: alert.id,
      title: alert.title,
      type: alert.type,
      date: alert.date,
      source_id: alert.sourceId || null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    if (error.message.includes('column') && (error.message.includes('source_id') || error.message.includes('updated_at'))) {
      // Fallback if DB doesn't have source_id or updated_at yet
      const { error: fallbackError } = await supabase
        .from('alerts')
        .insert({
          id: alert.id,
          title: alert.title,
          type: alert.type,
          date: alert.date,
        });
      if (fallbackError) {
        console.error('Failed to insert alert (fallback):', fallbackError.message);
        return false;
      }
      return true;
    }
    console.error('Failed to insert alert:', error.message);
    return false;
  }
  return true;
}

export async function deleteAlert(id) {
  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete alert:', error.message);
  }
  return !error;
}

export async function updateAlert(id, updates) {
  const dbUpdates = { ...updates, updated_at: new Date().toISOString() };
  if (updates.sourceId !== undefined) {
    dbUpdates.source_id = updates.sourceId;
    delete dbUpdates.sourceId;
  }
  if (updates.updatedAt !== undefined) {
    delete dbUpdates.updatedAt;
  }

  const { error } = await supabase
    .from('alerts')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    if (error.message.includes('column') && (error.message.includes('source_id') || error.message.includes('updated_at'))) {
      const basicUpdates = { ...updates };
      delete basicUpdates.sourceId;
      delete basicUpdates.updatedAt;
      
      const { error: fallbackError } = await supabase
        .from('alerts')
        .update(basicUpdates)
        .eq('id', id);
        
      if (fallbackError) {
        console.error('Failed to update alert (fallback):', fallbackError.message);
        return false;
      }
      return true;
    }
    console.error('Failed to update alert:', error.message);
    return false;
  }
  return !error;
}

/**
 * Upsert an alert by source_id (same place = same alert, update & move to top).
 * If an alert with the same source_id exists, update it in place.
 * If source_id column doesn't exist in DB, fall back to matching by alert ID.
 * Returns the alert id (existing or new).
 */
export async function upsertAlertBySource(alert) {
  if (!alert.sourceId) {
    // No source tracking — just insert normally
    return insertAlert(alert);
  }

  // Strategy 1: Try to find by source_id column
  const { data: existing, error: findError } = await supabase
    .from('alerts')
    .select('id')
    .eq('source_id', alert.sourceId)
    .limit(1);

  if (!findError && existing && existing.length > 0) {
    // Found by source_id — update in place (keeps same row, updates content)
    const existingId = existing[0].id;
    const updatePayload = {
      title: alert.title,
      type: alert.type,
      date: alert.date,
    };
    // Try adding updated_at if column exists
    const { error: updateError } = await supabase
      .from('alerts')
      .update({ ...updatePayload, updated_at: new Date().toISOString() })
      .eq('id', existingId);

    if (updateError) {
      // Fallback without updated_at
      await supabase.from('alerts').update(updatePayload).eq('id', existingId);
    }
    return existingId;
  }

  // Strategy 2: source_id column missing or no match — try by stable alert ID
  if (alert.id) {
    const { data: byId, error: idError } = await supabase
      .from('alerts')
      .select('id')
      .eq('id', alert.id)
      .limit(1);

    if (!idError && byId && byId.length > 0) {
      // Found existing alert with same ID — delete old and re-insert to move to top
      await supabase.from('alerts').delete().eq('id', alert.id);
    }
  }

  // Insert (new or replacement) — this gives it the newest created_at = top of list
  return insertAlert(alert);
}

// ===== WIFI IoT SENSOR READINGS (ultrasonic sensor via ESP) =====

/**
 * Fetch the latest N readings from the sensor_readings_wifi table.
 * Data comes from an ultrasonic sensor connected via WiFi (ESP device).
 * Each row has: id, distance_cm, created_at
 */
export async function fetchWifiSensorHistory(limit = 60) {
  const { data, error } = await supabase
    .from('sensor_readings_wifi')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch WiFi sensor history:', error.message);
    return [];
  }

  // Return in chronological order (oldest first) for charting
  return data.reverse().map(row => ({
    id: row.id,
    distanceCm: Number(row.distance_cm),
    createdAt: row.created_at,
  }));
}

/**
 * Fetch only the single most recent reading.
 */
export async function fetchLatestWifiReading() {
  const { data, error } = await supabase
    .from('sensor_readings_wifi')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Failed to fetch latest WiFi reading:', error.message);
    return null;
  }

  if (!data || data.length === 0) return null;

  return {
    id: data[0].id,
    distanceCm: Number(data[0].distance_cm),
    createdAt: data[0].created_at,
  };
}

// ===== WIFI IoT DEVICES (registered devices with location) =====

export async function fetchWifiIotDevices() {
  const { data, error } = await supabase
    .from('wifi_iot_devices')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch WiFi IoT devices:', error.message);
    return [];
  }

  return data.map(row => ({
    id: row.id,
    name: row.name,
    location: row.location || row.name,
    lat: Number(row.lat),
    lng: Number(row.lng),
    sensorHeightCm: row.sensor_height_cm != null ? Number(row.sensor_height_cm) : 200,
    thresholdWarning: Number(row.threshold_warning),
    thresholdDanger: Number(row.threshold_danger),
    status: row.status,
    latestDistanceCm: Number(row.latest_distance_cm),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertWifiIotDevice(device) {
  const dbRow = {
    id: device.id,
    name: device.name,
    lat: device.lat,
    lng: device.lng,
    sensor_height_cm: device.sensorHeightCm ?? 200,
    threshold_warning: device.thresholdWarning,
    threshold_danger: device.thresholdDanger,
    status: device.status || 'normal',
    latest_distance_cm: device.latestDistanceCm || 0,
    updated_at: new Date().toISOString(),
  };
  if (device.location) dbRow.location = device.location;

  const { error } = await supabase
    .from('wifi_iot_devices')
    .upsert(dbRow, { onConflict: 'id' });

  if (error && error.message.includes('location')) {
    // If location column doesn't exist yet, fallback without it
    delete dbRow.location;
    await supabase.from('wifi_iot_devices').upsert(dbRow, { onConflict: 'id' });
  }

  if (error) {
    console.error('Failed to upsert WiFi IoT device:', error.message);
  }
  return !error;
}

export async function deleteWifiIotDevice(id) {
  const { error } = await supabase
    .from('wifi_iot_devices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete WiFi IoT device:', error.message);
  }
  return !error;
}

export async function updateWifiIotDeviceStatus(id, status, latestDistanceCm) {
  const { error } = await supabase
    .from('wifi_iot_devices')
    .update({
      status,
      latest_distance_cm: latestDistanceCm,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to update WiFi IoT device status:', error.message);
  }
  return !error;
}

// ===== ROAD MARKERS =====

export async function fetchRoadMarkers() {
  const { data, error } = await supabase
    .from('road_markers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch road markers:', error.message);
    return [];
  }

  return data.map(row => {
    let mainCoords = row.coordinates;
    let altCoords = [];
    
    // Check if it's the new format { main: [...], alt: [...] }
    if (row.coordinates && !Array.isArray(row.coordinates) && row.coordinates.main) {
      mainCoords = row.coordinates.main;
      altCoords = row.coordinates.alt || [];
    }

    return {
      id: row.id,
      roadworkId: row.roadwork_id,
      name: row.name,
      status: row.status,
      reason: row.reason,
      altRoute: row.alt_route,
      color: row.color,
      coordinates: mainCoords,
      altCoordinates: altCoords,
    };
  });
}

export async function insertRoadMarker(marker) {
  const { error } = await supabase
    .from('road_markers')
    .insert({
      id: marker.id,
      roadwork_id: marker.roadworkId,
      name: marker.name,
      status: marker.status,
      reason: marker.reason,
      alt_route: marker.altRoute || '',
      color: marker.color,
      coordinates: {
        main: marker.coordinates,
        alt: marker.altCoordinates || []
      },
    });

  if (error) {
    console.error('Failed to insert road marker:', error.message);
  }
  return !error;
}

export async function deleteRoadMarker(id) {
  const { error } = await supabase
    .from('road_markers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete road marker:', error.message);
  }
  return !error;
}

// =============================================================
// ADMIN AUTHENTICATION
// =============================================================

export async function loginAdmin(username, password) {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, username')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      return { success: false, message: 'Invalid username or password' };
    }

    return { success: true, user: data };
  } catch (err) {
    console.error('Admin login error:', err);
    return { success: false, message: 'Server error during login' };
  }
}
