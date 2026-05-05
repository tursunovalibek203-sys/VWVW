/**
 * API Response Helpers
 * Standardized helpers for handling API responses with backward compatibility
 * 
 * Standard API Response Format:
 * {
 *   success: boolean,
 *   data: any,
 *   error?: string,
 *   pagination?: {...}
 * }
 */

import type { ApiResponse } from './professionalApi';

/**
 * Extract data from API response with backward compatibility
 * Handles both formats:
 * - New: { success: true, data: { sales: [...], ... }, pagination: {...} }
 * - Old: { sales: [...], ... } or direct array
 */
export function extractData<T>(response: ApiResponse<T> | any, defaultValue: T): T {
  if (!response) return defaultValue;
  
  // New standard format: response.data contains the actual data
  if (response.success === true && response.data !== undefined) {
    return response.data as T;
  }
  
  // Direct data (old format or unwrapped response)
  if (response.data !== undefined && !response.success) {
    return response.data as T;
  }
  
  // Direct array/object response
  if (Array.isArray(response) || (typeof response === 'object' && !response.success)) {
    return response as T;
  }
  
  return defaultValue;
}

/**
 * Extract array data with safety checks
 */
export function extractArray<T>(response: ApiResponse<T[]> | any, defaultValue: T[] = []): T[] {
  const data = extractData<T[]>(response, defaultValue);
  return Array.isArray(data) ? data : defaultValue;
}

/**
 * Extract paginated data
 * Returns { data, pagination } structure
 */
export function extractPaginatedData<T>(
  response: ApiResponse<any> | any,
  dataKey: string,
  defaultValue: T[] = []
): { data: T[]; pagination: { total: number; page: number; limit: number; totalPages: number } } {
  const responseData = extractData<any>(response, {});
  
  // Handle nested data structure (e.g., { sales: [...] })
  const actualData = responseData[dataKey] || responseData;
  
  return {
    data: Array.isArray(actualData) ? actualData : defaultValue,
    pagination: {
      total: response.pagination?.total || responseData.pagination?.total || 0,
      page: response.pagination?.page || responseData.pagination?.page || 1,
      limit: response.pagination?.limit || responseData.pagination?.limit || 50,
      totalPages: response.pagination?.totalPages || responseData.pagination?.totalPages || 1,
    },
  };
}

/**
 * Check if API response is successful
 */
export function isSuccess(response: ApiResponse<any> | any): boolean {
  if (!response) return false;
  
  // Explicit success flag
  if (response.success === true) return true;
  if (response.success === false) return false;
  
  // No error means success
  if (response.error) return false;
  
  // Has data means success
  if (response.data !== undefined) return true;
  
  return true;
}

/**
 * Get error message from API response
 */
export function getErrorMessage(response: ApiResponse<any> | any, defaultMessage = 'Xatolik yuz berdi'): string {
  if (!response) return defaultMessage;
  
  return response.error 
    || response.message 
    || response.data?.error 
    || response.data?.message 
    || defaultMessage;
}

/**
 * Safe API call wrapper with error handling
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  defaultValue: T,
  options?: {
    onError?: (error: any) => void;
    showAlert?: boolean;
  }
): Promise<T> {
  try {
    const response = await apiCall();
    
    if (!isSuccess(response)) {
      const errorMsg = getErrorMessage(response);
      if (options?.showAlert) {
        alert(errorMsg);
      }
      if (options?.onError) {
        options.onError(new Error(errorMsg));
      }
      return defaultValue;
    }
    
    return extractData(response, defaultValue);
  } catch (error) {
    console.error('API call failed:', error);
    if (options?.showAlert) {
      alert(options?.onError ? 'Xatolik yuz berdi' : 'Xatolik yuz berdi');
    }
    if (options?.onError) {
      options.onError(error);
    }
    return defaultValue;
  }
}
