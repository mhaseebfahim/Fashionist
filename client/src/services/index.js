// One service per resource. Components never call fetch/axios directly.
import api, { USE_MOCK } from './api.js';

export const authService = {
  login: (body) => api.post('/auth/login', body),
  register: (body) => api.post('/auth/register', body),
  me: () => api.get('/auth/me'),
  updateMe: (body) => api.patch('/auth/me', body),
  forgot: (email) => api.post('/auth/forgot-password', { email }),
  reset: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  config: () => api.get('/auth/config'),
  verifyEmail: (email, otp) => api.post('/auth/verify-email', { email, otp }),
  resendOtp: (email) => api.post('/auth/resend-otp', { email }),
  google: (credential) => api.post('/auth/google', { credential }),
  addresses: () => api.get('/auth/addresses'),
  addAddress: (a) => api.post('/auth/addresses', a),
  updateAddress: (id, a) => api.put(`/auth/addresses/${id}`, a),
  deleteAddress: (id) => api.delete(`/auth/addresses/${id}`),
};

export const catalogService = {
  categories: () => api.get('/categories'),
  products: (params) => api.get('/products', { params }),
  facets: (params) => api.get('/products/facets', { params }),
  product: (slug) => api.get(`/products/${slug}`),
  reviews: (id) => api.get(`/products/${id}/reviews`),
  addReview: (id, body) => api.post(`/products/${id}/reviews`, body),
  settings: () => api.get('/settings/public'),
};

export const cmsService = {
  get: (preview) => api.get(preview ? '/admin/cms/preview' : '/cms'),
  page: (slug) => api.get(`/cms/pages/${slug}`),
};

export const cartService = { get: () => api.get('/cart'), save: (items) => api.put('/cart', { items }) };
export const wishlistService = { get: () => api.get('/wishlist'), toggle: (productId) => api.post(`/wishlist/${productId}`) };

export const orderService = {
  create: (body) => api.post('/orders', body),
  mine: () => api.get('/orders/my'),
  get: (id) => api.get(`/orders/${id}`),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  requestReturn: (id, body) => api.post(`/orders/${id}/return`, body),
  validateCoupon: (body) => api.post('/orders/validate-coupon', body),
};

/** Downscales an image file to a JPEG data URL (mock mode has no Cloudinary). */
const toDataUrl = (file, max = 1000) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

const csv = (url, params) => api.get(url, { params, responseType: 'text', transformResponse: (d) => d });

export const adminService = {
  dashboard: (params) => api.get('/admin/dashboard', { params }),
  notifications: () => api.get('/admin/notifications'),
  search: (q) => api.get('/admin/search', { params: { q } }),
  // products
  products: (params) => api.get('/admin/products', { params }),
  product: (id) => api.get(`/admin/products/${id}`),
  saveProduct: (p) => (p._id ? api.put(`/admin/products/${p._id}`, p) : api.post('/admin/products', p)),
  patchProduct: (id, body) => api.put(`/admin/products/${id}`, body),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  bulkProducts: (body) => api.post('/admin/products/bulk', body),
  importPreview: (csvText) => api.post('/admin/bulk-import/preview', { csv: csvText }),
  importCsv: (csvText) => api.post('/admin/bulk-import', { csv: csvText }),
  // categories & inventory
  categories: () => api.get('/admin/categories'),
  saveCategory: (c) => (c._id ? api.put(`/admin/categories/${c._id}`, c) : api.post('/admin/categories', c)),
  reorderCategories: (items) => api.patch('/admin/categories/reorder', { items }),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  inventory: (low) => api.get('/admin/inventory', { params: { low } }),
  inventoryCsv: () => csv('/admin/inventory/export'),
  setStock: (sku, stock) => api.patch('/admin/inventory', { sku, stock }),
  // orders & returns
  orders: (params) => api.get('/admin/orders', { params }),
  ordersCsv: (params) => csv('/admin/orders/export', params),
  order: (id) => api.get(`/admin/orders/${id}`),
  invoice: (id) => api.get(`/admin/orders/${id}/invoice`),
  setStatus: (id, body) => api.patch(`/admin/orders/${id}/status`, body),
  bulkStatus: (body) => api.post('/admin/orders/bulk-status', body),
  returns: (status) => api.get('/admin/returns', { params: { status } }),
  decideReturn: (id, decision, note) => api.patch(`/admin/returns/${id}`, { decision, note }),
  // people
  customers: (q) => api.get('/admin/customers', { params: { q } }),
  customer: (id) => api.get(`/admin/customers/${id}`),
  setBlocked: (id, isBlocked) => api.patch(`/admin/customers/${id}`, { isBlocked }),
  coupons: () => api.get('/admin/coupons'),
  saveCoupon: (c) => (c._id ? api.put(`/admin/coupons/${c._id}`, c) : api.post('/admin/coupons', c)),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  reviews: (params) => api.get('/admin/reviews', { params }),
  setReviewStatus: (id, status) => api.patch(`/admin/reviews/${id}`, { status }),
  // reports, settings, activity
  reports: (params) => api.get('/admin/reports', { params }),
  reportCsv: (params) => csv('/admin/reports/export', params),
  settings: () => api.get('/admin/settings'),
  saveSettings: (s) => api.put('/admin/settings', s),
  activity: (params) => api.get('/admin/activity', { params }),
  // media
  media: (params) => api.get('/admin/media', { params }),
  uploadMedia: async (files, folder = 'general') => {
    if (USE_MOCK) {
      const out = [];
      for (const f of files) out.push(...(await api.post('/admin/media', { url: await toDataUrl(f), alt: f.name.replace(/\.[^.]+$/, ''), folder })).media);
      return { media: out };
    }
    const fd = new FormData();
    [...files].forEach((f) => fd.append('images', f));
    fd.append('folder', folder);
    return api.post('/admin/media/upload', fd);
  },
  addMediaUrl: (body) => api.post('/admin/media', body),
  deleteMedia: (id) => api.delete(`/admin/media/${id}`),
  // cms
  cms: {
    get: (k) => api.get(`/admin/cms/${k}`),
    put: (k, body) => api.put(`/admin/cms/${k}`, body),
    resetTheme: () => api.post('/admin/cms/theme/reset'),
    sections: () => api.get('/admin/cms/sections'),
    createSection: (s) => api.post('/admin/cms/sections', s),
    updateSection: (id, s) => api.put(`/admin/cms/sections/${id}`, s),
    duplicateSection: (id) => api.post(`/admin/cms/sections/${id}/duplicate`),
    deleteSection: (id) => api.delete(`/admin/cms/sections/${id}`),
    reorderSections: (ids) => api.patch('/admin/cms/sections/reorder', { ids }),
    publish: () => api.post('/admin/cms/sections/publish'),
    revert: () => api.post('/admin/cms/sections/revert'),
    pages: () => api.get('/admin/cms/pages'),
    savePage: (p) => (p._id ? api.put(`/admin/cms/pages/${p._id}`, p) : api.post('/admin/cms/pages', p)),
    deletePage: (id) => api.delete(`/admin/cms/pages/${id}`),
  },
};
