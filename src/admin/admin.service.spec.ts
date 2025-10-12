import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { ReservationsService } from '../reservations/reservations.service';
import { RoomsService } from '../rooms/rooms.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../users/user.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/reservation.entity';
import { Repository } from 'typeorm';
import { CacheService } from '../cache/cache.service';

describe('AdminService', () => {
  let service: AdminService;
  let _usersService: UsersService;
  let _reservationsService: ReservationsService;
  let _roomsService: RoomsService;
  let _userRepository: Repository<User>;
  let _reservationRepository: Repository<Reservation>;
  let _cacheService: CacheService;

  const mockUser = {
    id: 1,
    email: 'admin@example.com',
    password: 'hashedPassword',
    name: 'Admin User',
    role: UserRole.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReservation = {
    id: 1,
    startTime: new Date('2025-10-11T09:00:00'),
    endTime: new Date('2025-10-11T10:00:00'),
    purpose: '회의',
    status: ReservationStatus.CONFIRMED,
    room: {
      id: 1,
      name: '회의실 A',
      description: '10인용 회의실',
      capacity: 10,
      location: '1층',
      amenities: ['프로젝터', '화이트보드'],
      operatingHours: { start: '09:00', end: '18:00' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockReservationsService = {
    findById: jest.fn(),
  };

  const mockRoomsService = {
    findAll: jest.fn(),
  };

  const mockUserRepository = {
    findAndCount: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    })),
  };

  const mockReservationRepository = {
    findAndCount: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
    })),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ReservationsService,
          useValue: mockReservationsService,
        },
        {
          provide: RoomsService,
          useValue: mockRoomsService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    _usersService = module.get<UsersService>(UsersService);
    _reservationsService = module.get<ReservationsService>(ReservationsService);
    _roomsService = module.get<RoomsService>(RoomsService);
    _userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    _reservationRepository = module.get<Repository<Reservation>>(
      getRepositoryToken(Reservation),
    );
    _cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllUsers', () => {
    it('should return paginated users without passwords', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: 2, email: 'user2@example.com' },
      ];
      mockUserRepository.findAndCount.mockResolvedValue([users, 2]);

      const result = await service.getAllUsers({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter users by role', async () => {
      const adminUsers = [mockUser];
      mockUserRepository.findAndCount.mockResolvedValue([adminUsers, 1]);

      const result = await service.getAllUsers({
        page: 1,
        limit: 10,
        role: UserRole.ADMIN,
      });

      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getAllReservations', () => {
    it('should return paginated reservations without user passwords', async () => {
      const reservations = [mockReservation];
      mockReservationRepository.findAndCount.mockResolvedValue([
        reservations,
        1,
      ]);

      const result = await service.getAllReservations({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].user).not.toHaveProperty('password');
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter reservations by status', async () => {
      const confirmedReservations = [mockReservation];
      mockReservationRepository.findAndCount.mockResolvedValue([
        confirmedReservations,
        1,
      ]);

      const result = await service.getAllReservations({
        page: 1,
        limit: 10,
        status: ReservationStatus.CONFIRMED,
      });

      expect(mockReservationRepository.findAndCount).toHaveBeenCalledWith({
        where: { status: ReservationStatus.CONFIRMED },
        relations: ['user', 'room'],
        skip: 0,
        take: 10,
        order: { startTime: 'DESC' },
      });
      expect(result.data).toHaveLength(1);
    });

    it('should filter reservations by roomId', async () => {
      mockReservationRepository.findAndCount.mockResolvedValue([
        [mockReservation],
        1,
      ]);

      await service.getAllReservations({
        page: 1,
        limit: 10,
        roomId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(mockReservationRepository.findAndCount).toHaveBeenCalledWith({
        where: { roomId: '550e8400-e29b-41d4-a716-446655440000' },
        relations: ['user', 'room'],
        skip: 0,
        take: 10,
        order: { startTime: 'DESC' },
      });
    });

    it('should filter reservations by date range', async () => {
      mockReservationRepository.findAndCount.mockResolvedValue([
        [mockReservation],
        1,
      ]);

      const result = await service.getAllReservations({
        page: 1,
        limit: 10,
        startDate: '2025-10-01',
        endDate: '2025-10-31',
      });

      expect(mockReservationRepository.findAndCount).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive statistics', async () => {
      mockUserRepository.count.mockResolvedValue(100);
      mockRoomsService.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockReservationRepository.count.mockResolvedValue(500);

      const queryBuilder = mockReservationRepository.createQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue([
        { role: UserRole.USER, count: '95' },
        { role: UserRole.ADMIN, count: '5' },
      ]);
      queryBuilder.getRawOne.mockResolvedValue({
        totalReservations: '80',
        completedReservations: '50',
        cancelledReservations: '20',
        noshowReservations: '10',
      });

      mockUserRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { role: UserRole.USER, count: '95' },
          { role: UserRole.ADMIN, count: '5' },
        ]),
      });

      mockReservationRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { status: ReservationStatus.CONFIRMED, count: '50' },
          ]),
        getRawOne: jest.fn().mockResolvedValue({
          totalReservations: '80',
          completedReservations: '50',
          cancelledReservations: '20',
          noshowReservations: '10',
        }),
      });

      const result = await service.getStatistics();

      expect(result).toHaveProperty('overview');
      expect(result.overview.totalUsers).toBe(100);
      expect(result.overview.totalRooms).toBe(2);
      expect(result.overview.totalReservations).toBe(500);
      expect(result).toHaveProperty('usersByRole');
      expect(result).toHaveProperty('reservationsByStatus');
      expect(result).toHaveProperty('topRoomsByReservations');
      expect(result).toHaveProperty('dailyReservations');
      expect(result).toHaveProperty('currentMonthStats');
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const updatedUser = { ...mockUser, role: UserRole.USER };
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await service.updateUserRole(1, { role: UserRole.USER });

      expect(mockUsersService.findById).toHaveBeenCalledWith(1);
      expect(mockUsersService.update).toHaveBeenCalledWith(1, {
        role: UserRole.USER,
      });
      expect(result).toEqual(updatedUser);
    });
  });
});
