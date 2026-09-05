// NovaMarket API client.
// Thin wrapper around fetch that talks to the Express backend. It owns token
// storage and transparently refreshes an expired access token once per request.
//
// The backend base URL comes from Vite env (set VITE_API_URL in a root .env),
// falling back to the local dev server.

const BASE_URL = import.meta.env?.VITE_API_URL || '/api';

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

async function request(path, { method = 'GET', body, auth = false, formData = false, _retry = false } = {}) {
  const headers = {};
  if (auth && tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

  let payload;
  if (formData) {
    payload = body; // FormData sets its own multipart Content-Type + boundary
  } else {
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    payload = body !== undefined ? JSON.stringify(body) : undefined;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: payload,
  });

  // Access token likely expired — try one silent refresh, then replay.
  if (res.status === 401 && auth && !_retry && tokenStore.refresh) {
    const ok = await tryRefresh();
    if (ok) return request(path, { method, body, auth, formData, _retry: true });
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

  // ---- Catalog ----
  categories: () => request('/categories'),
  products: ({ search, category, page = 1, limit = 100 } = {}) => {
    const qs = new URLSearchParams({ page, limit });
    if (search) qs.set('search', search);
    if (category) qs.set('category', category);
    return request(`/products?${qs}`);
  },
  product: (id) => request(`/products/${id}`),
  productReviews: (id) => request(`/products/${id}/reviews`),
  createProductReview: (id, { rating, comment }) =>
    request(`/products/${id}/reviews`, { method: 'POST', body: { rating, comment }, auth: true }),

  // ---- Seller products ----
  sellerProducts: () => request('/seller/products', { auth: true }),
  createProduct: (data) => request('/products', { method: 'POST', body: data, auth: true }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PATCH', body: data, auth: true }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE', auth: true }),
  uploadProductImages: (id, files) => {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return request(`/products/${id}/images`, {
      method: 'POST',
      body: form,
      auth: true,
      formData: true,
    });
  },

  // ---- Seller applications ----
  createSellerApplication: (data) =>
    request('/seller-applications', { method: 'POST', body: data, auth: true }),
  mySellerApplications: () => request('/seller-applications/me', { auth: true }),

  // ---- Seller store profile ----
  getSellerStore: () => request('/seller/store', { auth: true }),
  updateSellerStore: (patch) => request('/seller/store', { method: 'PATCH', body: patch, auth: true }),

  // ---- Admin ----
  adminApplications: (status) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/admin/seller-applications${qs}`, { auth: true });
  },
  reviewApplication: (id, action) =>
    request(`/admin/seller-applications/${id}`, { method: 'PATCH', body: { action }, auth: true }),
  adminSellers: () => request('/admin/sellers', { auth: true }),
  revokeSeller: (id) => request(`/admin/sellers/${id}`, { method: 'DELETE', auth: true }),
  adminOrders: () => request('/admin/orders', { auth: true }),
  adminUpdateOrderStatus: (id, status) =>
    request(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status }, auth: true }),
  adminCategories: () => request('/admin/categories', { auth: true }),
  createCategory: (name) => request('/admin/categories', { method: 'POST', body: { name }, auth: true }),
  deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE', auth: true }),
  adminDeleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE', auth: true }),

  // ---- Seller orders ----
  sellerOrders: () => request('/seller/orders', { auth: true }),
  updateSellerOrderStatus: (id, status) =>
    request(`/seller/orders/${id}/status`, { method: 'PATCH', body: { status }, auth: true }),

  // ---- Orders ----
  createOrder: (items, shippingAddress) =>
    request('/orders', {
      method: 'POST',
      body: { items, shipping_address: shippingAddress },
      auth: true,
    }),
  myOrders: () => request('/orders', { auth: true }),
  order: (id) => request(`/orders/${id}`, { auth: true }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'PATCH', auth: true }),

  // ---- Contact ----
  submitContactMessage: (data) => request('/contact', { method: 'POST', body: data }),
  adminContactMessages: () => request('/admin/contact-messages', { auth: true }),
  adminUpdateContactMessage: (id, isRead) =>
    request(`/admin/contact-messages/${id}`, { method: 'PATCH', body: { is_read: isRead }, auth: true }),
  adminDeleteContactMessage: (id) =>
    request(`/admin/contact-messages/${id}`, { method: 'DELETE', auth: true }),
};
