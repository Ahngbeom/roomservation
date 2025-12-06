import type {
  RegisterDto,
  RegisterResponse,
  LoginDto,
  LoginResponse,
  RefreshTokenResponse,
  UpdateProfileDto,
  ChangePasswordDto,
  User,
  ApiResponse,
} from '@roomservation/shared-types';
import { apiClient } from './client';

export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterDto): Promise<RegisterResponse> => {
    const response = await apiClient.instance.post<RegisterResponse>(
      '/api/auth/register',
      data
    );
    return response.data;
  },

  /**
   * Login with email and password
   */
  login: async (data: LoginDto): Promise<LoginResponse> => {
    const response = await apiClient.instance.post<LoginResponse>(
      '/api/auth/login',
      data
    );
    // Store access token
    if (response.data.accessToken) {
      apiClient.setAccessToken(response.data.accessToken);
    }
    return response.data;
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<ApiResponse> => {
    const response = await apiClient.instance.post<ApiResponse>('/api/auth/logout');
    apiClient.clearAccessToken();
    return response.data;
  },

  /**
   * Refresh access token
   */
  refresh: async (): Promise<RefreshTokenResponse> => {
    const response = await apiClient.instance.post<RefreshTokenResponse>(
      '/api/auth/refresh'
    );
    if (response.data.accessToken) {
      apiClient.setAccessToken(response.data.accessToken);
    }
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<User> => {
    const response = await apiClient.instance.get<User>('/api/auth/profile');
    return response.data;
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: UpdateProfileDto): Promise<User> => {
    const response = await apiClient.instance.patch<User>('/api/auth/profile', data);
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (data: ChangePasswordDto): Promise<ApiResponse> => {
    const response = await apiClient.instance.patch<ApiResponse>(
      '/api/auth/password',
      data
    );
    return response.data;
  },
};
