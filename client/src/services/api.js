import axios from 'axios';
import { mockAdapter } from './mock/adapter.js';

export const TOKEN_KEY = 'fashionist:token';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  ...(USE_MOCK && { adapter: mockAdapter }),
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status;
    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('fashionist:logout'));
    }
    return Promise.reject(Object.assign(new Error(err.response?.data?.message || err.message || 'Network error'), { status, details: err.response?.data?.details }));
  }
);

export default api;
