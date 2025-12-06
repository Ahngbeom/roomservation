import type {
  User,
  Reservation,
  PaginatedResponse,
  AdminUserFilters,
  UpdateUserRoleDto,
  AdminReservationFilters,
  StatisticsResponse,
} from '@roomservation/shared-types';
import { apiClient } from './client';

export const adminApi = {
  /**
   * Get all users (Admin only)
   */
  getUsers: async (filters?: AdminUserFilters): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.instance.get<PaginatedResponse<User>>(
      '/api/admin/users',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Update user role (Admin only)
   */
  updateUserRole: async (userId: string, data: UpdateUserRoleDto): Promise<User> => {
    const response = await apiClient.instance.patch<User>(
      `/api/admin/users/${userId}/role`,
      data
    );
    return response.data;
  },

  /**
   * Get all reservations (Admin only)
   */
  getReservations: async (
    filters?: AdminReservationFilters
  ): Promise<PaginatedResponse<Reservation>> => {
    const response = await apiClient.instance.get<PaginatedResponse<Reservation>>(
      '/api/admin/reservations',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get statistics (Admin only)
   */
  getStatistics: async (): Promise<StatisticsResponse> => {
    const response = await apiClient.instance.get<StatisticsResponse>(
      '/api/admin/statistics'
    );
    return response.data;
  },
};
