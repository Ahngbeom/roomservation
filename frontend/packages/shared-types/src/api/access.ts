import { AccessMethod, RoomAccess } from '../index';

// Generate Access Token
export interface GenerateAccessTokenDto {
  reservationId: string;
  accessMethod: AccessMethod;
}

export interface GenerateAccessTokenResponse {
  accessToken: string;
  expiresAt: string; // ISO 8601
  qrCode?: string; // base64 encoded QR code image (if method is QR)
  pin?: string; // PIN code (if method is PIN)
}

// Verify Access Token
export interface VerifyAccessTokenDto {
  accessToken: string;
  roomId: string;
}

export interface VerifyAccessTokenResponse {
  message: string;
  access: RoomAccess;
  granted: boolean;
}

// Access history filters
export interface AccessHistoryFilters {
  roomId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

// Current room status
export interface CurrentRoomStatusResponse {
  roomId: string;
  isOccupied: boolean;
  currentReservation?: {
    id: string;
    userId: string;
    userName: string;
    startTime: string;
    endTime: string;
  };
}
