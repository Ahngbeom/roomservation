import { User, UserRole, Reservation, PaginationQuery } from '../index';

// User management
export interface AdminUserFilters extends PaginationQuery {
  role?: UserRole;
  search?: string; // search by name or email
}

export interface UpdateUserRoleDto {
  role: UserRole;
}

// Reservation management
export interface AdminReservationFilters extends PaginationQuery {
  status?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  userId?: string;
  roomId?: string;
}

// Statistics
export interface StatisticsResponse {
  users: {
    total: number;
    admins: number;
    regularUsers: number;
  };
  rooms: {
    total: number;
    active: number;
    inactive: number;
  };
  reservations: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    byStatus: {
      pending: number;
      confirmed: number;
      completed: number;
      cancelled: number;
      noShow: number;
    };
  };
  usage: {
    utilizationRate: number; // percentage
    popularRooms: Array<{
      roomId: string;
      roomName: string;
      reservationCount: number;
    }>;
    peakHours: Array<{
      hour: number; // 0-23
      reservationCount: number;
    }>;
  };
}
