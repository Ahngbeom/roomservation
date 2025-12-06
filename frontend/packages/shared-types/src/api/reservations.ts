import { Reservation, ReservationStatus, ReservationWithRelations } from '../index';

// Create Reservation
export interface CreateReservationDto {
  roomId: string;
  title: string;
  purpose: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  attendees: number;
}

// Update Reservation
export interface UpdateReservationDto {
  title?: string;
  purpose?: string;
  startTime?: string; // ISO 8601
  endTime?: string; // ISO 8601
  attendees?: number;
}

// Cancel Reservation
export interface CancelReservationDto {
  cancellationReason: string;
}

// Reservation filters
export interface ReservationFilters {
  status?: ReservationStatus;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  roomId?: string;
}

// Room reservations query
export interface RoomReservationsQuery {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}
