import { AccessMethod } from '../common/enums';

/**
 * Room access entity
 */
export interface RoomAccess {
  id: string;
  reservationId: string;
  userId: string;
  roomId: string;
  accessMethod: AccessMethod;
  accessToken: string;
  accessTime?: string; // ISO 8601 timestamp
  expiresAt: string; // ISO 8601 timestamp
  isUsed: boolean;
  createdAt: string;
}
