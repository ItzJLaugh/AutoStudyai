const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
}

export function setToken(token, email, refreshToken) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('userEmail', email);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

export function clearAuth() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('refreshToken');
}

export function getUserEmail() {
  return typeof window !== 'undefined' ? localStorage.getItem('userEmail') || '' : '';
}

export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

// Proactive token refresh — silently renews the token 2 min before expiry.
let _proactiveTimer = null;

function getTokenExpiry() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch { return null; }
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
    const resp = await fetch(API + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const data = await resp.json();
    if (resp.ok && data.access_token) {
      localStorage.setItem('authToken', data.access_token);
      if (data.refresh_token) localStorage.setItem('refreshToken', data.refresh_token);
      return true;
    }
  } catch (e) { /* refresh failed */ }
  return false;
}

export async function apiFetch(path, options = {}) {
  if (typeof window === 'undefined' || !getToken()) return null;
  try {
    let resp = await fetch(API + path, {
      ...options,
      headers: { ...authHeaders(), ...options.headers }
    });

    // Auto-refresh on 401
    if (resp.status === 401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        resp = await fetch(API + path, {
          ...options,
          headers: { ...authHeaders(), ...options.headers }
        });
      } else {
        clearAuth();
        window.location.href = '/';
        return null;
      }
    }

    return resp.json();
  } catch (e) {
    console.error('API fetch error:', path, e);
    return null;
  }
}
