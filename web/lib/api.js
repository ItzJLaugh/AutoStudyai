const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const REQUEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (options.signal) options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
}

function tokenPayload(token = getToken()) {
  if (!token) return {};
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
  } catch {
    return {};
  }
}

function notifyAuthChanged() {
  window.postMessage({ type: 'CORDIA_AUTH_UPDATED' }, window.location.origin);
}

export function setToken(token, email, refreshToken) {
  const payload = tokenPayload(token);
  const metadata = payload.user_metadata || {};
  localStorage.setItem('authToken', token);
  localStorage.setItem('userEmail', email || payload.email || '');
  if (payload.sub) localStorage.setItem('userId', payload.sub);
  const name = metadata.full_name || metadata.name || '';
  if (name) localStorage.setItem('userName', name);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  notifyAuthChanged();
}

export function clearAuth() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('refreshToken');
  notifyAuthChanged();
}

export function getUserEmail() {
  return typeof window !== 'undefined' ? localStorage.getItem('userEmail') || '' : '';
}

export function getUserId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('userId') || tokenPayload().sub || '';
}

export function getUserName() {
  return typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '';
}

export function cacheUserIdentity(identity = {}) {
  if (typeof window === 'undefined') return;
  if (identity.user_id) localStorage.setItem('userId', identity.user_id);
  if (identity.email) localStorage.setItem('userEmail', identity.email);
  if (identity.name) localStorage.setItem('userName', identity.name);
}

export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

export function authOnlyHeaders() {
  return {
    'Authorization': 'Bearer ' + getToken()
  };
}

export function apiErrorMessage(detail, fallback = 'Something went wrong. Please try again.') {
  const message = typeof detail === 'string' ? detail.trim() : String(detail?.message || '').trim();
  if (!message) return fallback;
  if (/invalid or expired token|invalid refresh token|failed to refresh token/i.test(message)) {
    return 'Your session expired. Sign in again.';
  }
  if (/failed to fetch|networkerror|load failed|service unavailable/i.test(message)) {
    return 'Classroom could not reach the service. Check your connection and try again.';
  }
  if (/internal server error|unexpected server error/i.test(message)) {
    return 'Classroom hit a temporary problem. Please try again.';
  }
  if (/too many (requests|attempts)/i.test(message)) {
    return 'Too many requests were sent at once. Wait a moment and try again.';
  }
  return message;
}

function addRequestReference(data, response) {
  if (response.ok || !data || typeof data !== 'object' || Array.isArray(data)) return data;
  const requestId = response.headers.get('X-Request-ID');
  if (!requestId) return data;
  const suffix = ` Reference: ${requestId}`;
  return {
    ...data,
    request_id: requestId,
    detail: typeof data.detail === 'string' ? `${data.detail}${suffix}` : data.detail,
  };
}

export async function responseJson(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = { detail: response.ok ? '' : 'Classroom received an unreadable response. Please try again.' };
  }
  if (data?.detail) data = { ...data, detail: apiErrorMessage(data.detail) };
  return addRequestReference(data, response);
}

// Proactive token refresh — silently renews the token 2 min before expiry.
let _proactiveTimer = null;

function getTokenExpiry() {
  const payload = tokenPayload();
  return payload.exp ? payload.exp * 1000 : null;
}

export function scheduleProactiveRefresh() {
  if (typeof window === 'undefined') return;
  if (_proactiveTimer) clearTimeout(_proactiveTimer);
  const expiry = getTokenExpiry();
  if (!expiry) return;
  const msUntilRefresh = expiry - Date.now() - 2 * 60 * 1000; // 2 min before expiry
  const delay = Math.max(msUntilRefresh, 10000); // at least 10s from now
  _proactiveTimer = setTimeout(async () => {
    const refreshed = await tryRefreshToken();
    if (refreshed) scheduleProactiveRefresh();
    // if refresh fails, the next API call will handle it via the 401 path
  }, delay);
}

// Singleton: only one refresh request in-flight at a time so parallel
// API calls on the same page don't each fire their own refresh.
let _refreshPromise = null;

async function tryRefreshToken() {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

async function _doRefresh() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  try {
    const resp = await fetchWithTimeout(API + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const data = await resp.json();
    if (resp.ok && data.access_token) {
      localStorage.setItem('authToken', data.access_token);
      if (data.refresh_token) localStorage.setItem('refreshToken', data.refresh_token);
      notifyAuthChanged();
      return true;
    }
  } catch (e) { /* refresh failed */ }
  return false;
}

export async function apiFetch(path, options = {}) {
  if (typeof window === 'undefined' || !getToken()) return null;
  try {
    let resp = await fetchWithTimeout(API + path, {
      ...options,
      headers: { ...authHeaders(), ...options.headers }
    });

    // Auto-refresh on 401
    if (resp.status === 401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        resp = await fetchWithTimeout(API + path, {
          ...options,
          headers: { ...authHeaders(), ...options.headers }
        });
      } else {
        clearAuth();
        window.location.href = '/';
        return null;
      }
    }

    return responseJson(resp);
  } catch (e) {
    console.error('API fetch error:', path, e);
    return null;
  }
}
