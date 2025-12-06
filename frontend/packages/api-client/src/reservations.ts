import type {
  Reservation,
  ReservationWithRelations,
  CreateReservationDto,
  UpdateReservationDto,
  CancelReservationDto,
  ReservationFilters,
  RoomReservationsQuery,
  ApiResponse,
} from '@roomservation/shared-types';
import { apiClient } from './client';

export const reservationsApi = {
  /**
   * Get current user's reservations
   */
  getMyReservations: async (filters?: ReservationFilters): Promise<Reservation[]> => {
    const response = await apiClient.instance.get<Reservation[]>('/api/reservations', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get reservation by ID
   */
  getReservationById: async (id: string): Promise<ReservationWithRelations> => {
    const response = await apiClient.instance.get<ReservationWithRelations>(
      `/api/reservations/${id}`
    );
    return response.data;
  },

  /**
   * Create a new reservation
   */
  createReservation: async (data: CreateReservationDto): Promise<Reservation> => {
    const response = await apiClient.instance.post<Reservation>(
      '/api/reservations',
      data
    );
    return response.data;
  },

  /**
   * Update reservation
   */
  updateReservation: async (
    id: string,
    data: UpdateReservationDto
  ): Promise<Reservation> => {
    const response = await apiClient.instance.patch<Reservation>(
      `/api/reservations/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Cancel reservation
   */
  cancelReservation: async (
    id: string,
    data: CancelReservationDto
  ): Promise<ApiResponse> => {
    const response = await apiClient.instance.delete<ApiResponse>(
      `/api/reservations/${id}`,
      { data }
    );
    return response.data;
  },

  /**
   * Confirm reservation (Admin only)
   */
  confirmReservation: async (id: string): Promise<Reservation> => {
    const response = await apiClient.instance.post<Reservation>(
      `/api/reservations/${id}/confirm`
    );
    return response.data;
  },

  /**
   * Get reservations for a specific room
   */
  getRoomReservations: async (
    roomId: string,
    query?: RoomReservationsQuery
  ): Promise<Reservation[]> => {
    const response = await apiClient.instance.get<Reservation[]>(
      `/api/reservations/room/${roomId}`,
      { params: query }
    );
    return response.data;
  },
};
