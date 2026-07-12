// Utility functions for IoT sensor simulation
// Initial data arrays have been removed — all data now lives in Supabase

// Helper to determine status based on value and thresholds
export const calculateStatus = (value, warning, danger) => {
  if (value >= danger) return 'danger';
  if (value >= warning) return 'warning';
  return 'normal';
};

// Generates a slight variation in sensor reading (simulates real IoT drift)
export const generateReading = (currentValue, type) => {
  const change = (Math.random() - 0.5) * (type === 'water_level' ? 0.5 : 5);
  let newValue = Math.max(0, currentValue + change); // prevent negative values
  return Number(newValue.toFixed(1));
};

// Default thresholds for test panel
export const defaultThresholds = {
  water_level: { warning: 6.0, danger: 8.0, unit: 'm' },
  rainfall: { warning: 30, danger: 50, unit: 'mm/hr' },
  rain_sensor: { warning: 1, danger: 1, unit: '' }, // binary: 0 = no rain, 1 = rain
};

// Road disruption color mapping
export const roadStatusColors = {
  'Full Closure': '#ef4444',
  'Partial Lane': '#f59e0b',
  'Maintenance': '#3b82f6',
  'Flooding': '#8b5cf6',
  'Pipeline Repair': '#ec4899',
};
