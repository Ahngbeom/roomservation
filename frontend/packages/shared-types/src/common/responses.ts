/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = void> {
  message?: string;
  data?: T;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
