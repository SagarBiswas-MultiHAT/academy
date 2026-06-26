import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Inject auth token on every request
// Falls back to the cookie that the SSR admin-guard uses, so
// client-side requests stay authenticated even when localStorage
// hasn't been seeded yet (e.g. fresh page load after SSR redirect).
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('accessToken');

    // Fallback: read from cookie (set by auth-context on login)
    if (!token) {
      const match = document.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
      token = match ? decodeURIComponent(match[1]) : null;
      // Sync cookie token back into localStorage so subsequent requests work
      if (token) localStorage.setItem('accessToken', token);
    }

    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → auto-refresh or redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      document.cookie = 'accessToken=; path=/; max-age=0';
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  },
);

export default api;
