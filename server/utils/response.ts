/**
 * Standard API Response Format
 * All endpoints MUST use this format for consistency
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message })
  };
}

/**
 * Success response with pagination
 */
export function paginatedResponse<T>(
  data: T,
  pagination: { page: number; limit: number; total: number; totalPages: number },
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    pagination,
    ...(message && { message })
  };
}

/**
 * Error response helper
 */
export function errorResponse(error: string, details?: any): ApiResponse {
  return {
    success: false,
    error,
    ...(details && process.env.NODE_ENV === 'development' && { data: details })
  };
}

/**
 * Validation error response
 */
export function validationErrorResponse(errors: Record<string, string>): ApiResponse {
  return {
    success: false,
    error: 'Validation failed',
    data: { errors }
  };
}
