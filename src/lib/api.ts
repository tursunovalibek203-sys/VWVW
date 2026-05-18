import axios from 'axios';

// professionalApi.ts bilan bir xil env-var (config-drift oldini olish)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  // authStore sessionStorage'ga persist qiladi (localStorage emas).
  // Moslik uchun sessionStorage -> localStorage tartibida o'qiymiz.
  const storage =
    sessionStorage.getItem('auth-storage') || localStorage.getItem('auth-storage');
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
      // Tokenni tozalash (ikkala storage'dan ham)
      sessionStorage.removeItem('auth-storage');
      localStorage.removeItem('auth-storage');
      // Login ga yo'naltirish (faqat login sahifasida bo'lmasa)
      if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.location.href = '/';
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
