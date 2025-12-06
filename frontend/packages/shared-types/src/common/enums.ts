/**
 * User role enumeration
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/**
 * Reservation status enumeration
 */
export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

/**
 * Access method enumeration
 */
export enum AccessMethod {
  QR = 'QR',
  PIN = 'PIN',
  NFC = 'NFC',
}
