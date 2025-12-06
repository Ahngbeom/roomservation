import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export class ApiClient {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.axiosInstance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Send cookies (refresh token)
    });

    // 생성자에서 localStorage 토큰 초기화
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add access token to headers
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // getAccessToken()으로 항상 최신 토큰 확인 (localStorage 포함)
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle 401 and refresh token
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // refresh 엔드포인트는 재시도하지 않음 (무한 루프 방지)
        if (originalRequest.url?.includes('/api/auth/refresh')) {
          this.clearAccessToken();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('auth:logout'));
          }
          return Promise.reject(error);
        }

        // If 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const { data } = await this.axiosInstance.post('/api/auth/refresh');
            this.setAccessToken(data.accessToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            // Refresh failed - clear token and redirect to login
            this.clearAccessToken();
            // Optionally dispatch logout event or redirect
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('auth:logout'));
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  clearAccessToken() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  }

  getAccessToken(): string | null {
    if (!this.accessToken && typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
    return this.accessToken;
  }

  get instance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Default client instance
export const apiClient = new ApiClient();
