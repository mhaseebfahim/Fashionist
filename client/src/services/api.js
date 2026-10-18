import axios from 'axios';
import { mockAdapter } from './mock/adapter.js';

export const TOKEN_KEY = 'fashionist:token';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
  ...(USE_MOCK && { adapter: mockAdapter }),
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Unwraps the server envelope { success, data, meta } → { ...data, meta }. CSV/text responses pass through.
api.interceptors.response.use(
  (res) => {
    const b = res.data;
    return b && typeof b === 'object' && 'success' in b ? { ...b.data, ...(b.meta && { meta: b.meta }) } : b;
  },
  (err) => {
    const status = err.response?.status;
    const body = err.response?.data || {};
    if (status === 401 && localStorage.getItem(TOKEN_KEY) && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('fashionist:logout'));
    }
    const message = status === 429 ? body.message || 'Too many requests — please wait a moment' : body.message || (err.code === 'ECONNABORTED' ? 'The server took too long to respond' : err.message) || 'Network error';
    return Promise.reject(Object.assign(new Error(message), { status, errors: body.errors }));
  }
);

export default api;
