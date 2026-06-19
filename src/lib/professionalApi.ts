import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { saveSessionBeforeLogout } from './authUtils';

// API Configuration Types
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Enhanced API Error Types
export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
  config?: AxiosRequestConfig;
  response?: AxiosResponse;
}

// Response Types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
    requestId: string;
  };
}

// Request Types
export interface RequestConfig extends AxiosRequestConfig {
  retry?: boolean;
  silent?: boolean;
  showProgress?: boolean;
  cache?: boolean;
  cacheTTL?: number;
}

class ProfessionalApi {
  private instance: AxiosInstance;
  private config: ApiConfig;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(config: Partial<ApiConfig> = {}) {
    // Use absolute URL for backend API if not in production
    const backendUrl = (import.meta as any).env?.VITE_API_BASE_URL ||
                       (typeof window !== 'undefined' && window.location.hostname === 'localhost'
                         ? 'http://localhost:5003/api'
                         : '/api');
    
    this.config = {
      baseURL: backendUrl,
      timeout: 45000,
      retryAttempts: 2,
      retryDelay: 1000,
      ...config
    };

    this.instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request Interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Auth endpointlariga token qo'shmaymiz (login paytida eski token kerak emas)
        const requestUrl = config.url || '';
        const isAuthEndpoint =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/cashier-login') ||
          requestUrl.includes('/auth/register');

        if (!isAuthEndpoint) {
          const token = this.getAuthToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        // Add timestamp
        config.headers['X-Request-Time'] = new Date().toISOString();

        return config;
      },
      (error) => {
        return Promise.reject(this.enhanceError(error));
      }
    );

    // Response Interceptor
    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized — faqat avval token bo'lgan bo'lsa
        if (error.response?.status === 401 && !originalRequest._retry) {
          const existingToken = this.getAuthToken();
          // Auth endpointlari uchun handleUnauthorized chaqirmaymiz
          // (login/cashier-login 401 = noto'g'ri parol, token eskirishi emas)
          const requestUrl = originalRequest.url || '';
          const isAuthEndpoint =
            requestUrl.includes('/auth/login') ||
            requestUrl.includes('/auth/cashier-login') ||
            requestUrl.includes('/auth/register') ||
            requestUrl.includes('/auth/refresh-token');

          if (existingToken && !isAuthEndpoint) {
            await this.handleUnauthorized();
          }
          return Promise.reject(this.enhanceError(error));
        }

        // Retry logic
        if (this.shouldRetry(error) && originalRequest._retryCount < this.config.retryAttempts) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          originalRequest._retry = true;

          const delay = this.config.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
          await this.sleep(delay);

          return this.instance(originalRequest);
        }

        return Promise.reject(this.enhanceError(error));
      }
    );
  }

  private getAuthToken(): string | null {
    // Avval Zustand store dan o'qiymiz (always up-to-date, setAuth dan keyin darhol yangilanadi)
    try {
      // Dynamic require emas — module-level import mavjud bo'lmaydi shu yerda
      // Shuning uchun localStorage dan o'qiymiz, lekin Zustand persist formatini to'g'ri parse qilamiz
      const storage = localStorage.getItem('auth-storage');
      if (storage) {
        const parsed = JSON.parse(storage);
        return parsed.state?.token || null;
      }
    } catch {
      // Failed to get auth token
    }
    return null;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldRetry(error: AxiosError): boolean {
    if (!error.config) return false;

    const status = error.response?.status;
    const method = error.config.method?.toLowerCase();
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');

    // Timeout bo'lsa — POST ham retry (Render cold start uchun)
    if (isTimeout) return true;

    // Don't retry on network errors (offline mode)
    if (status === undefined && error.code === 'NETWORK_ERROR') {
      console.warn('🌐 Network error - possibly offline');
      return false;
    }

    // Retry on 5xx server errors
    if (status !== undefined && status >= 500) return true;

    // Don't retry on 4xx client errors (except 429 Too Many Requests)
    if (status !== undefined && status >= 400 && status < 500 && status !== 429) return false;

    // Don't retry on POST/PUT/DELETE requests by default
    if (method === 'post' || method === 'put' || method === 'delete') return false;

    return true;
  }

  private async handleUnauthorized() {
    saveSessionBeforeLogout();

    // Zustand store orqali logout (localStorage ham tozalanadi)
    const { useAuthStore } = await import('../store/authStore');
    useAuthStore.getState().logout();

    // React Router navigate orqali — oq ekransiz SPA navigatsiya
    window.dispatchEvent(new CustomEvent('app:unauthorized'));
  }

  private enhanceError(error: any): ApiError {
    const apiError: ApiError = new Error(error.message || 'API Error') as ApiError;
    
    if (error.response) {
      apiError.status = error.response.status;
      apiError.code = error.response.data?.code;
      apiError.details = error.response.data;
      apiError.response = error.response;
    } else if (error.request) {
      apiError.code = 'NETWORK_ERROR';
      apiError.details = 'Network request failed';
    }

    apiError.config = error.config;
    
    return apiError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCacheKey(config: RequestConfig): string {
    const { method, url, params, data } = config;
    return `${method}_${url}_${JSON.stringify(params)}_${JSON.stringify(data)}`;
  }

  private isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    return Date.now() - cached.timestamp < cached.ttl;
  }

  // HTTP Methods with enhanced functionality
  async get<T = any>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const cacheKey = this.getCacheKey({ ...config, method: 'get', url });
    
    // Check cache - enable by default for GET requests
    const shouldCache = config.cache !== false;
    if (shouldCache && this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return {
        data: cached.data,
        success: true,
        meta: {
          timestamp: new Date(cached.timestamp).toISOString(),
          requestId: 'cached',
        }
      };
    }

    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const request = this.instance.get(url, config).then(response => {
      const result: ApiResponse<T> = {
        data: response.data,
        success: true,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: response.config.headers['X-Request-ID'] as string,
        }
      };

      // Cache response by default for all GET requests (2 min TTL)
      if (shouldCache) {
        const ttl = config.cacheTTL || 120000; // 2 minutes default
        this.cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
          ttl
        });
      }

      return result;
    }).finally(() => {
      this.pendingRequests.delete(cacheKey);
    });

    this.pendingRequests.set(cacheKey, request);
    return request;
  }

  // Invalidate all cache entries whose key contains the given path segment
  invalidateCache(urlPattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(urlPattern)) {
        this.cache.delete(key);
      }
    }
  }

  clearAllCache() {
    this.cache.clear();
  }

  async post<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const response = await this.instance.post(url, data, config);
    // Invalidate related GET cache after mutation
    const basePath = url.split('/')[1];
    if (basePath) this.invalidateCache(basePath);

    return {
      data: response.data,
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: response.config.headers['X-Request-ID'] as string,
      }
    };
  }

  async put<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const response = await this.instance.put(url, data, config);
    const basePath = url.split('/')[1];
    if (basePath) this.invalidateCache(basePath);

    return {
      data: response.data,
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: response.config.headers['X-Request-ID'] as string,
      }
    };
  }

  async patch<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const response = await this.instance.patch(url, data, config);
    
    return {
      data: response.data,
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: response.config.headers['X-Request-ID'] as string,
      }
    };
  }

  async delete<T = any>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const response = await this.instance.delete(url, config);
    const basePath = url.split('/')[1];
    if (basePath) this.invalidateCache(basePath);

    return {
      data: response.data,
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: response.config.headers['X-Request-ID'] as string,
      }
    };
  }

  // Utility methods
  async upload<T = any>(url: string, file: File, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.instance.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers,
      },
    });

    return {
      data: response.data,
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: response.config.headers['X-Request-ID'] as string,
      }
    };
  }

  async download(url: string, filename?: string, config: RequestConfig = {}): Promise<void> {
    const response = await this.instance.get(url, {
      ...config,
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
        ttl: value.ttl,
      }))
    };
  }
}

// Create singleton instance
// Localhost'da to'g'ridan-to'g'ri, production'da Vercel proxy (/api → Render)
const _apiBase =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5004/api')
    : '/api';

export const api = new ProfessionalApi({
  baseURL: _apiBase,
  timeout: 60000,
  retryAttempts: 3,
  retryDelay: 1000,
});

// Default export
export default api;
