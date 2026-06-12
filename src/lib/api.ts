import axios from 'axios';

// Localhost'da to'g'ridan-to'g'ri, production'da Vercel proxy (/api → Render)
const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5004/api')
    : '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const storage = localStorage.getItem('auth-storage');
  if (storage) {
    try {
      const parsed = JSON.parse(storage);
      if (parsed.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`;
      }
    } catch (e) {
      console.error('Failed to parse auth-storage:', e);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Xatolikni log qilish
    if (error.response) {
      console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error('[API Error] Network error:', error.message);
    }

    if (error.response?.status === 401) {
      // Faqat avval token bo'lgan bo'lsa logout qilamiz
      // (Login endpoint'i ham 401 qaytaradi — u holda logout kerak emas)
      const storage = localStorage.getItem('auth-storage');
      let hadToken = false;
      try {
        hadToken = !!JSON.parse(storage || '{}')?.state?.token;
      } catch { /* ignore */ }

      if (hadToken) {
        localStorage.removeItem('auth-storage');
        const path = window.location.pathname;
        if (path !== '/' && path !== '/login' && path !== '/cashier/login') {
          window.location.href = '/login';
        }
      }
    }
    
    // Xato obyektini boyitish
    const enhancedError = {
      ...error,
      userMessage: error.response?.data?.error || error.message || 'Xatolik yuz berdi',
      statusCode: error.response?.status,
    };
    
    return Promise.reject(enhancedError);
  }
);

export default api;
