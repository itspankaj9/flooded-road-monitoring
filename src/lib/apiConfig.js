/**
 * API Configuration for Smart Road App Integration
 * 
 * When the website is loaded with ?apiKey=<KEY>&mode=app in the URL,
 * it enters "app mode" — a read-only view without admin features.
 * Normal browser users are completely unaffected.
 */

// Static API key for the mobile app
const VALID_API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Parse current URL params once and cache the result.
 */
function getUrlParams() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    apiKey: params.get('apiKey'),
    mode: params.get('mode'),
    pushToken: params.get('pushToken'),
  };
}

// Cache the result so we don't re-parse on every call
let _cachedParams = null;
function getCachedParams() {
  if (!_cachedParams) {
    _cachedParams = getUrlParams();
  }
  return _cachedParams;
}

/**
 * Returns true if the website is being accessed from the mobile app
 * (i.e. ?mode=app&apiKey=<valid key> is present)
 */
export function isAppMode() {
  const { apiKey, mode } = getCachedParams();
  return mode === 'app' && apiKey === VALID_API_KEY;
}

/**
 * Returns true if the current session should be read-only
 * (same condition as app mode for now)
 */
export function isReadOnly() {
  return isAppMode();
}

/**
 * The API key constant — exported so the app can use the same key
 */
export const API_KEY = VALID_API_KEY;

export function getPushToken() {
  const { pushToken } = getCachedParams();
  return pushToken;
}
