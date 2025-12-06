import { ReservationStatus } from '../common/enums';
import { User } from './user';
import { Room } from './room';

/**
 * Reservation entity
 */
export interface Reservation {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  purpose: string;
  startTime: string; // ISO 8601 timestamp
  endTime: string; // ISO 8601 timestamp
  attendees: number;
  status: ReservationStatus;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Reservation with relations
 */
export interface ReservationWithRelations extends Reservation {
  user?: User;
  room?: Room;
}
