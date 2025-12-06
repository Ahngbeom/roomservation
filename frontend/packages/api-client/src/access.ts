import type {
  RoomAccess,
  GenerateAccessTokenDto,
  GenerateAccessTokenResponse,
  VerifyAccessTokenDto,
  VerifyAccessTokenResponse,
  AccessHistoryFilters,
  CurrentRoomStatusResponse,
} from '@roomservation/shared-types';
import { apiClient } from './client';

export const accessApi = {
  /**
   * Generate access token (QR/PIN)
   */
  generateToken: async (
    data: GenerateAccessTokenDto
  ): Promise<GenerateAccessTokenResponse> => {
    const response = await apiClient.instance.post<GenerateAccessTokenResponse>(
      '/api/access/generate',
      data
    );
    return response.data;
  },

  /**
   * Verify access token
   */
  verifyToken: async (
    data: VerifyAccessTokenDto
  ): Promise<VerifyAccessTokenResponse> => {
    const response = await apiClient.instance.post<VerifyAccessTokenResponse>(
      '/api/access/verify',
      data
    );
    return response.data;
  },

  /**
   * Get access history for current user
   */
  getAccessHistory: async (filters?: AccessHistoryFilters): Promise<RoomAccess[]> => {
    const response = await apiClient.instance.get<RoomAccess[]>('/api/access/history', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get current status of a room
   */
  getCurrentRoomStatus: async (roomId: string): Promise<CurrentRoomStatusResponse> => {
    const response = await apiClient.instance.get<CurrentRoomStatusResponse>(
      `/api/access/room/${roomId}/current`
    );
    return response.data;
  },
};
