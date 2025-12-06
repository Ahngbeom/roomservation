import type {
  Room,
  CreateRoomDto,
  UpdateRoomDto,
  RoomFilters,
  AvailabilityQuery,
  AvailabilityResponse,
  ApiResponse,
} from '@roomservation/shared-types';
import { apiClient } from './client';

export const roomsApi = {
  /**
   * Get all rooms with optional filters
   */
  getRooms: async (filters?: RoomFilters): Promise<Room[]> => {
    const response = await apiClient.instance.get<Room[]>('/api/rooms', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get room by ID
   */
  getRoomById: async (id: string): Promise<Room> => {
    const response = await apiClient.instance.get<Room>(`/api/rooms/${id}`);
    return response.data;
  },

  /**
   * Create a new room (Admin only)
   */
  createRoom: async (data: CreateRoomDto): Promise<Room> => {
    const response = await apiClient.instance.post<Room>('/api/rooms', data);
    return response.data;
  },

  /**
   * Update room (Admin only)
   */
  updateRoom: async (id: string, data: UpdateRoomDto): Promise<Room> => {
    const response = await apiClient.instance.patch<Room>(`/api/rooms/${id}`, data);
    return response.data;
  },

  /**
   * Delete room (Admin only)
   */
  deleteRoom: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.instance.delete<ApiResponse>(`/api/rooms/${id}`);
    return response.data;
  },

  /**
   * Get available time slots for a room on a specific date
   */
  getAvailability: async (
    id: string,
    query: AvailabilityQuery
  ): Promise<AvailabilityResponse> => {
    const response = await apiClient.instance.get<AvailabilityResponse>(
      `/api/rooms/${id}/availability`,
      { params: query }
    );
    return response.data;
  },
};
