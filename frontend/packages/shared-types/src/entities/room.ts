/**
 * Room operating hours
 */
export interface OperatingHours {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  weekdays: number[]; // 0-6 (Sunday-Saturday)
}

/**
 * Room entity
 */
export interface Room {
  id: string;
  roomNumber: string;
  name: string;
  capacity: number;
  location: string;
  facilities: string[];
  operatingHours: OperatingHours;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
