// OpenWeatherMap One Call API 4.0 service
// Docs: https://openweathermap.org/api/one-call-3

const OWM_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

// Default location: Mumbai, Maharashtra (the app's primary region)
const DEFAULT_LAT = 19.0760;
const DEFAULT_LON = 72.8777;

/**
 * Fetch current weather for a given lat/lon.
 * Uses OpenWeatherMap's standard current weather endpoint (2.5 API - widely available).
 * Falls back gracefully if One Call 4.0 is not subscribed.
 */
export async function fetchCurrentWeather(lat = DEFAULT_LAT, lon = DEFAULT_LON) {
  try {
    // Standard current weather API - universally available
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    return {
      temp: Math.round(json.main.temp),
      feelsLike: Math.round(json.main.feels_like),
      humidity: json.main.humidity,
      pressure: json.main.pressure,
      windSpeed: json.wind.speed,
      windDeg: json.wind.deg,
      clouds: json.clouds.all,
      visibility: json.visibility,
      description: json.weather[0].description,
      main: json.weather[0].main,
      icon: json.weather[0].icon,
      iconUrl: `https://openweathermap.org/img/wn/${json.weather[0].icon}@2x.png`,
      cityName: json.name,
      country: json.sys.country,
      sunrise: json.sys.sunrise,
      sunset: json.sys.sunset,
      // Rain data
      rain1h: json.rain?.['1h'] ?? 0,
      snow1h: json.snow?.['1h'] ?? 0,
      isRaining: json.weather[0].main === 'Rain' || json.weather[0].main === 'Drizzle' || json.weather[0].main === 'Thunderstorm',
      isThunderstorm: json.weather[0].main === 'Thunderstorm',
      weatherId: json.weather[0].id,
      fetchedAt: new Date().toISOString(),
      lat: json.coord.lat,
      lng: json.coord.lon,
    };
  } catch (err) {
    console.error('Failed to fetch weather:', err.message);
    return null;
  }
}

export async function fetchCurrentWeatherByCity(city) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OWM_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    return {
      temp: Math.round(json.main.temp),
      feelsLike: Math.round(json.main.feels_like),
      humidity: json.main.humidity,
      pressure: json.main.pressure,
      windSpeed: json.wind.speed,
      windDeg: json.wind.deg,
      clouds: json.clouds.all,
      visibility: json.visibility,
      description: json.weather[0].description,
      main: json.weather[0].main,
      icon: json.weather[0].icon,
      iconUrl: `https://openweathermap.org/img/wn/${json.weather[0].icon}@2x.png`,
      cityName: json.name,
      country: json.sys.country,
      sunrise: json.sys.sunrise,
      sunset: json.sys.sunset,
      rain1h: json.rain?.['1h'] ?? 0,
      snow1h: json.snow?.['1h'] ?? 0,
      isRaining: json.weather[0].main === 'Rain' || json.weather[0].main === 'Drizzle' || json.weather[0].main === 'Thunderstorm',
      isThunderstorm: json.weather[0].main === 'Thunderstorm',
      weatherId: json.weather[0].id,
      fetchedAt: new Date().toISOString(),
      lat: json.coord.lat,
      lng: json.coord.lon,
    };
  } catch (err) {
    console.error('Failed to fetch weather by city:', err.message);
    return null;
  }
}

/**
 * Fetch 5-day / 3-hour forecast.
 * Returns hourly-like data for the next 48 hours.
 */
export async function fetchForecast(lat = DEFAULT_LAT, lon = DEFAULT_LON) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=16&appid=${OWM_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    return json.list.map(item => ({
      time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date(item.dt * 1000).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
      temp: Math.round(item.main.temp),
      humidity: item.main.humidity,
      rain3h: item.rain?.['3h'] ?? 0,
      description: item.weather[0].description,
      main: item.weather[0].main,
      icon: item.weather[0].icon,
      iconUrl: `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`,
      windSpeed: item.wind.speed,
    }));
  } catch (err) {
    console.error('Failed to fetch forecast:', err.message);
    return [];
  }
}

export async function fetchForecastByCity(city) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&cnt=16&appid=${OWM_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    return json.list.map(item => ({
      time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date(item.dt * 1000).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
      temp: Math.round(item.main.temp),
      humidity: item.main.humidity,
      rain3h: item.rain?.['3h'] ?? 0,
      description: item.weather[0].description,
      main: item.weather[0].main,
      icon: item.weather[0].icon,
      iconUrl: `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`,
      windSpeed: item.wind.speed,
    }));
  } catch (err) {
    console.error('Failed to fetch forecast by city:', err.message);
    return [];
  }
}

/**
 * Determine flood risk level based on live weather data.
 * Integrates with our sensor thresholds to give a holistic risk.
 */
export function assessFloodRisk(weather, sensors = []) {
  if (!weather) return { level: 'unknown', reason: 'Weather data unavailable' };

  const dangerSensors = sensors.filter(s => s.status === 'danger');
  const warnSensors = sensors.filter(s => s.status === 'warning');

  // Rain intensity classification
  const rain = weather.rain1h || 0;
  let rainRisk = 'low';
  if (rain >= 50) rainRisk = 'extreme';
  else if (rain >= 30) rainRisk = 'high';
  else if (rain >= 15) rainRisk = 'moderate';
  else if (rain > 0) rainRisk = 'low';

  // Combine rain + sensors
  if (dangerSensors.length > 0 || rainRisk === 'extreme' || weather.isThunderstorm) {
    return {
      level: 'critical',
      reason: dangerSensors.length > 0
        ? `${dangerSensors.length} sensor(s) at danger level. ${weather.isThunderstorm ? 'Active thunderstorm.' : ''}`
        : `Extreme rainfall: ${rain.toFixed(1)} mm/h`,
      color: '#ef4444',
    };
  }
  if (warnSensors.length > 0 || rainRisk === 'high') {
    return {
      level: 'elevated',
      reason: warnSensors.length > 0
        ? `${warnSensors.length} sensor(s) at warning level.`
        : `Heavy rainfall: ${rain.toFixed(1)} mm/h`,
      color: '#f59e0b',
    };
  }
  if (rainRisk === 'moderate' || weather.isRaining) {
    return {
      level: 'watch',
      reason: `Light-moderate rain: ${rain > 0 ? rain.toFixed(1) + ' mm/h' : weather.description}`,
      color: '#3b82f6',
    };
  }
  return {
    level: 'normal',
    reason: 'No significant rain activity. All sensors nominal.',
    color: '#22c55e',
  };
}

/**
 * Convert wind degrees to compass direction string.
 */
export function windDirection(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export const DEFAULT_COORDS = { lat: DEFAULT_LAT, lon: DEFAULT_LON };
