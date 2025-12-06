import { Room, OperatingHours } from '../index';

// Create Room
export interface CreateRoomDto {
  roomNumber: string;
  name: string;
  capacity: number;
  location: string;
  facilities: string[];
  operatingHours: OperatingHours;
}

// Update Room
export interface UpdateRoomDto {
  roomNumber?: string;
  name?: string;
  capacity?: number;
  location?: string;
  facilities?: string[];
  operatingHours?: OperatingHours;
  isActive?: boolean;
}

// Room filters
export interface RoomFilters {
  minCapacity?: number;
  maxCapacity?: number;
  location?: string;
  facilities?: string[];
  isActive?: boolean;
}

// Available time slot
export interface TimeSlot {
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  isAvailable: boolean;
}

export interface AvailabilityQuery {
  date: string; // YYYY-MM-DD
}

export interface AvailabilityResponse {
  date: string;
  slots: TimeSlot[];
}
