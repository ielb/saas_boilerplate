import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getApiUrl } from './env.client';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './token-manager';

/**
 * API Response wrapper (for endpoints that use it)
 */
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * API Error response (matches NestJS error format)
 */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp?: string;
  path?: string;
}

/**
 * Get tenant ID from storage
 */
function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const tenantStore = localStorage.getItem('tenant-store');
    if (tenantStore) {
      const parsed = JSON.parse(tenantStore);
      return parsed?.state?.currentTenant?.id || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Create axios instance with default configuration
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies/auth
});

/**
 * Request interceptor - Add auth token and tenant ID to requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    const tenantId = getTenantId();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add tenant ID header for multi-tenant requests
    if (tenantId && config.headers) {
      config.headers['X-Tenant-Id'] = tenantId;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors and token refresh
 * Note: Some endpoints return data directly, others wrap in { success, data }
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // If response is wrapped in ApiResponse format, unwrap it
    if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data &&
      ('success' in response.data || 'message' in response.data)
    ) {
      return {
        ...response,
        data: response.data.data,
      };
    }
    // Otherwise return response as-is (direct data format)
    return response;
  },
  async (error: AxiosError<ApiError | { message: string | string[] }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();

        if (refreshToken) {
          // Call refresh token endpoint (returns data directly, not wrapped)
          const response = await axios.post<{
            accessToken: string;
            refreshToken?: string;
            expiresIn: number;
            user?: unknown;
          }>(`${getApiUrl()}/auth/refresh`, { refreshToken });

          const responseData = response.data;
          if (responseData?.accessToken) {
            setTokens(
              responseData.accessToken,
              responseData.refreshToken || refreshToken
            );

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${responseData.accessToken}`;
            }
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors - match NestJS error format
    const errorData = error.response?.data;
    let errorMessage = 'An error occurred';

    if (errorData) {
      if (typeof errorData === 'object') {
        // NestJS error format: { statusCode, message, error }
        if ('message' in errorData) {
          errorMessage =
            typeof errorData.message === 'string'
              ? errorData.message
              : Array.isArray(errorData.message)
                ? errorData.message.join(', ')
                : errorMessage;
        }
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
    }

    const apiError: ApiError = {
      statusCode: error.response?.status || 500,
      message: errorMessage,
      error: error.response?.statusText || 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: originalRequest?.url,
    };

    return Promise.reject(apiError);
  }
);

/**
 * API request helper functions
 */
export const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((response) => response.data),

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((response) => response.data),

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((response) => response.data),

  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((response) => response.data),

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((response) => response.data),
};

export default apiClient;

