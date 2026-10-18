// One service per resource. Components never call fetch/axios directly.
import api from './api.js';

export const authService = {
  login: (body) => api.post('/auth/login', body),
  register: (body) => api.post('/auth/register', body),
  me: () => api.get('/auth/me'),
  updateMe: (body) => api.patch('/auth/me', body),
  forgot: (email) => api.post('/auth/forgot-password', { email }),
  reset: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
};

export const catalogService = {
  categories: () => api.get('/categories'),
  products: (params) => api.get('/products', { params }),
  product: (slug) => api.get(`/products/${slug}`),
  settings: () => api.get('/settings'),
};

export const cartService = {
  get: () => api.get('/me/cart'),
  save: (items) => api.put('/me/cart', { items }),
};

export const wishlistService = {
  get: () => api.get('/me/wishlist'),
  toggle: (productId) => api.post(`/me/wishlist/${productId}`),
};

export const orderService = {
  create: (body) => api.post('/me/orders', body),
  mine: () => api.get('/me/orders'),
  get: (id) => api.get(`/me/orders/${id}`),
  cancel: (id) => api.post(`/me/orders/${id}/cancel`),
  requestReturn: (id, body) => api.post(`/me/orders/${id}/return`, body),
};

export const reviewService = { create: (body) => api.post('/reviews', body) };
export const couponService = { validate: (body) => api.post('/coupons/validate', body) };

export const adminService = {
  dashboard: (days) => api.get('/admin/dashboard', { params: { days } }),
  products: (q) => api.get('/admin/products', { params: { q } }),
  product: (id) => api.get(`/admin/products/${id}`),
  saveProduct: (p) => (p._id ? api.put(`/admin/products/${p._id}`, p) : api.post('/admin/products', p)),
  archiveProduct: (id) => api.delete(`/admin/products/${id}`),
  importCsv: (file, csvText) => {
    if (import.meta.env.VITE_USE_MOCK !== 'false') return api.post('/admin/products/import', { csv: csvText });
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/admin/products/import', fd);
  },
  inventory: (low) => api.get('/admin/inventory', { params: { low } }),
  setStock: (sku, stock) => api.patch('/admin/inventory', { sku, stock }),
  orders: (params) => api.get('/admin/orders', { params }),
  order: (id) => api.get(`/admin/orders/${id}`),
  setStatus: (id, body) => api.patch(`/admin/orders/${id}/status`, body),
  decideReturn: (id, decision) => api.patch(`/admin/orders/${id}/return`, { decision }),
  saveCategory: (c) => (c._id ? api.put(`/admin/categories/${c._id}`, c) : api.post('/admin/categories', c)),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  customers: () => api.get('/admin/customers'),
  setBlocked: (id, isBlocked) => api.patch(`/admin/customers/${id}`, { isBlocked }),
  coupons: () => api.get('/admin/coupons'),
  saveCoupon: (c) => (c._id ? api.put(`/admin/coupons/${c._id}`, c) : api.post('/admin/coupons', c)),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  reviews: () => api.get('/admin/reviews'),
  setReviewStatus: (id, status) => api.patch(`/admin/reviews/${id}`, { status }),
  saveSettings: (s) => api.put('/admin/settings', s),
  activity: () => api.get('/admin/activity'),
};
