import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ReservationsService } from '../reservations/reservations.service';
import { RoomsService } from '../rooms/rooms.service';
import {
  AdminUserQueryDto,
  AdminReservationQueryDto,
} from './dto/admin-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { User } from '../users/user.entity';
import { ReservationStatus } from '../reservations/reservation.entity';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from '../reservations/reservation.entity';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache/cache.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly reservationsService: ReservationsService,
    private readonly roomsService: RoomsService,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  async getAllUsers(query: AdminUserQueryDto) {
    const { page = 1, limit = 10, role } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<User> = {};
    if (role) {
      where.role = role;
    }

    const [users, total] = await this.userRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users.map((user) => {
        const { password: _password, ...result } = user;
        return result;
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllReservations(query: AdminReservationQueryDto) {
    const {
      page = 1,
      limit = 10,
      status,
      roomId,
      userId,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Reservation> = {};

    if (status) {
      where.status = status;
    }

    if (roomId) {
      where.roomId = roomId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate && endDate) {
      where.startTime = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.startTime = Between(new Date(startDate), new Date('2100-01-01'));
    } else if (endDate) {
      where.startTime = Between(new Date('2000-01-01'), new Date(endDate));
    }

    const [reservations, total] = await this.reservationRepository.findAndCount(
      {
        where,
        relations: ['user', 'room'],
        skip,
        take: limit,
        order: { startTime: 'DESC' },
      },
    );

    return {
      data: reservations.map((reservation) => {
        const { user, ...rest } = reservation;
        const { password: _password, ...userWithoutPassword } = user;
        return {
          ...rest,
          user: userWithoutPassword,
        };
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStatistics() {
    // 캐시 확인
    const cached = await this.cacheService.get(CACHE_KEYS.STATISTICS);
    if (cached) {
      return cached;
    }

    // 전체 통계
    const totalUsers = await this.userRepository.count();
    const totalRooms = await this.roomsService.findAll({});
    const totalReservations = await this.reservationRepository.count();

    // 사용자 역할별 통계
    const usersByRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    // 예약 상태별 통계
    const reservationsByStatus = await this.reservationRepository
      .createQueryBuilder('reservation')
      .select('reservation.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('reservation.status')
      .getRawMany();

    // 방별 예약 통계 (상위 5개)
    const topRoomsByReservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.room', 'room')
      .select('room.id', 'roomId')
      .addSelect('room.name', 'roomName')
      .addSelect('COUNT(*)', 'reservationCount')
      .groupBy('room.id')
      .addGroupBy('room.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    // 최근 7일간 일별 예약 통계
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyReservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .select('DATE(reservation.startTime)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('reservation.startTime >= :sevenDaysAgo', { sevenDaysAgo })
      .groupBy('DATE(reservation.startTime)')
      .orderBy('DATE(reservation.startTime)', 'ASC')
      .getRawMany();

    // 월별 통계
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await this.reservationRepository
      .createQueryBuilder('reservation')
      .select('COUNT(*)', 'totalReservations')
      .addSelect(
        'SUM(CASE WHEN reservation.status = :completed THEN 1 ELSE 0 END)',
        'completedReservations',
      )
      .addSelect(
        'SUM(CASE WHEN reservation.status = :cancelled THEN 1 ELSE 0 END)',
        'cancelledReservations',
      )
      .where('reservation.startTime >= :currentMonth', { currentMonth })
      .setParameters({
        completed: ReservationStatus.COMPLETED,
        cancelled: ReservationStatus.CANCELLED,
      })
      .getRawOne();

    const result = {
      overview: {
        totalUsers,
        totalRooms: totalRooms.length,
        totalReservations,
      },
      usersByRole: usersByRole.reduce(
        (acc, item) => {
          acc[item.role] = parseInt(item.count);
          return acc;
        },
        {} as Record<string, number>,
      ),
      reservationsByStatus: reservationsByStatus.reduce(
        (acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        },
        {} as Record<string, number>,
      ),
      topRoomsByReservations: topRoomsByReservations.map((item) => ({
        roomId: item.roomId,
        roomName: item.roomName,
        reservationCount: parseInt(item.reservationCount),
      })),
      dailyReservations: dailyReservations.map((item) => ({
        date: item.date,
        count: parseInt(item.count),
      })),
      currentMonthStats: {
        total: parseInt(monthlyStats.totalReservations) || 0,
        completed: parseInt(monthlyStats.completedReservations) || 0,
        cancelled: parseInt(monthlyStats.cancelledReservations) || 0,
      },
    };

    // 캐시 저장 (5분)
    await this.cacheService.set(
      CACHE_KEYS.STATISTICS,
      result,
      CACHE_TTL.MEDIUM,
    );

    return result;
  }

  async updateUserRole(userId: string, updateUserRoleDto: UpdateUserRoleDto) {
    const _user = await this.usersService.findById(userId);
    return this.usersService.update(userId, { role: updateUserRoleDto.role });
  }
}
