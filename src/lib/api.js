// NovaMarket API client.
// Thin wrapper around fetch that talks to the Express backend. It owns token
// storage and transparently refreshes an expired access token once per request.
//
// The backend base URL comes from Vite env (set VITE_API_URL in a root .env),
// falling back to the local dev server.

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:4000';

const ACCESS_KEY = 'novamarket-access-token';
const REFRESH_KEY = 'novamarket-refresh-token';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(session) {
    if (!session) return;
    if (session.accessToken) localStorage.setItem(ACCESS_KEY, session.accessToken);
    if (session.refreshToken) localStorage.setItem(REFRESH_KEY, session.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, auth = false, _retry = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Access token likely expired — try one silent refresh, then replay.
  if (res.status === 401 && auth && !_retry && tokenStore.refresh) {
    const ok = await tryRefresh();
    if (ok) return request(path, { method, body, auth, _retry: true });
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, data?.error || res.statusText, data?.details);
  }
  return data;
}

async function tryRefresh() {
  try {
    const data = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: tokenStore.refresh },
    });
    tokenStore.set(data.session);
    return true;
  } catch {
    tokenStore.clear();
    return false;
  }
}

export const api = {
  // ---- Auth ----
  async register({ email, password, fullName }) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: { email, password, fullName },
    });
    tokenStore.set(data.session);
    return data.user;
  },
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    tokenStore.set(data.session);
    return data.user;
  },
  async me() {
    const data = await request('/auth/me', { auth: true });
    return data.user;
  },
  logout() {
    tokenStore.clear();
  },

  // ---- Generic helpers for later milestones (catalog, orders, etc.) ----
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};
