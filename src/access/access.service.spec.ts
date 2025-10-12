import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessService } from './access.service';
import { RoomAccess, AccessMethod } from './room-access.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { ReservationStatus } from '../reservations/reservation.entity';
import { BadRequestException } from '@nestjs/common';

describe('AccessService', () => {
  let service: AccessService;
  let _repository: Repository<RoomAccess>;
  let _reservationsService: ReservationsService;

  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 2);

  const mockReservation = {
    id: 'reservation-id',
    roomId: 'room-id',
    userId: 'user-id',
    title: 'Meeting',
    purpose: 'Discussion',
    startTime: futureDate,
    endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
    attendees: 5,
    status: ReservationStatus.CONFIRMED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRoomAccess = {
    id: 'access-id',
    reservationId: 'reservation-id',
    userId: 'user-id',
    roomId: 'room-id',
    accessMethod: AccessMethod.QR,
    accessToken: 'test-token-123',
    expiresAt: new Date(futureDate.getTime() + 30 * 60 * 1000),
    isUsed: false,
    createdAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockReservationsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessService,
        {
          provide: getRepositoryToken(RoomAccess),
          useValue: mockRepository,
        },
        {
          provide: ReservationsService,
          useValue: mockReservationsService,
        },
      ],
    }).compile();

    service = module.get<AccessService>(AccessService);
    _repository = module.get<Repository<RoomAccess>>(
      getRepositoryToken(RoomAccess),
    );
    _reservationsService = module.get<ReservationsService>(ReservationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should generate access token successfully for confirmed reservation', async () => {
      // Set reservation to start in 5 minutes (within valid window)
      const nearFutureDate = new Date();
      nearFutureDate.setMinutes(nearFutureDate.getMinutes() + 5);

      const nearFutureReservation = {
        ...mockReservation,
        startTime: nearFutureDate,
        endTime: new Date(nearFutureDate.getTime() + 60 * 60 * 1000),
      };

      mockReservationsService.findOne.mockResolvedValue(nearFutureReservation);
      mockRepository.findOne.mockResolvedValue(null); // No existing token
      mockRepository.create.mockReturnValue(mockRoomAccess);
      mockRepository.save.mockResolvedValue(mockRoomAccess);

      const result = await service.generateAccessToken(
        { reservationId: 'reservation-id', accessMethod: AccessMethod.QR },
        'user-id',
      );

      expect(result).toBeDefined();
      expect(mockReservationsService.findOne).toHaveBeenCalledWith(
        'reservation-id',
        'user-id',
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for cancelled reservation', async () => {
      const cancelledReservation = {
        ...mockReservation,
        status: ReservationStatus.CANCELLED,
      };

      mockReservationsService.findOne.mockResolvedValue(cancelledReservation);

      await expect(
        service.generateAccessToken(
          { reservationId: 'reservation-id', accessMethod: AccessMethod.QR },
          'user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token generation is too early', async () => {
      // Reservation starts in 30 minutes (outside valid window)
      const farFutureDate = new Date();
      farFutureDate.setMinutes(farFutureDate.getMinutes() + 30);

      const farFutureReservation = {
        ...mockReservation,
        startTime: farFutureDate,
        endTime: new Date(farFutureDate.getTime() + 60 * 60 * 1000),
      };

      mockReservationsService.findOne.mockResolvedValue(farFutureReservation);

      await expect(
        service.generateAccessToken(
          { reservationId: 'reservation-id', accessMethod: AccessMethod.QR },
          'user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing token if not expired', async () => {
      const nearFutureDate = new Date();
      nearFutureDate.setMinutes(nearFutureDate.getMinutes() + 5);

      const nearFutureReservation = {
        ...mockReservation,
        startTime: nearFutureDate,
        endTime: new Date(nearFutureDate.getTime() + 60 * 60 * 1000),
      };

      mockReservationsService.findOne.mockResolvedValue(nearFutureReservation);
      mockRepository.findOne.mockResolvedValue(mockRoomAccess); // Existing token

      const result = await service.generateAccessToken(
        { reservationId: 'reservation-id', accessMethod: AccessMethod.QR },
        'user-id',
      );

      expect(result).toEqual(mockRoomAccess);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify token successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockRoomAccess);
      mockRepository.save.mockResolvedValue({
        ...mockRoomAccess,
        isUsed: true,
        accessTime: new Date(),
      });

      const result = await service.verifyAccessToken({
        accessToken: 'test-token-123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('승인');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should return failure for invalid token', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyAccessToken({
        accessToken: 'invalid-token',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('유효하지 않은');
    });

    it('should return failure for already used token', async () => {
      const usedToken = { ...mockRoomAccess, isUsed: true };
      mockRepository.findOne.mockResolvedValue(usedToken);

      const result = await service.verifyAccessToken({
        accessToken: 'test-token-123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('이미 사용된');
    });

    it('should return failure for expired token', async () => {
      const expiredToken = {
        ...mockRoomAccess,
        isUsed: false, // Make sure token is not used
        expiresAt: new Date(Date.now() - 1000),
      };
      mockRepository.findOne.mockResolvedValue(expiredToken);

      const result = await service.verifyAccessToken({
        accessToken: 'test-token-123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('만료된');
    });
  });

  describe('getAccessHistory', () => {
    it('should return access history for user', async () => {
      mockRepository.find.mockResolvedValue([mockRoomAccess]);

      const result = await service.getAccessHistory('user-id');

      expect(result).toEqual([mockRoomAccess]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        relations: ['reservation', 'room'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getCurrentRoomStatus', () => {
    it('should return occupied status if room is in use', async () => {
      const accessWithReservation = {
        ...mockRoomAccess,
        reservation: mockReservation,
      };

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([accessWithReservation]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getCurrentRoomStatus('room-id');

      expect(result.isOccupied).toBe(true);
      expect(result.currentReservation).toBeDefined();
    });

    it('should return not occupied if no active reservation', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getCurrentRoomStatus('room-id');

      expect(result.isOccupied).toBe(false);
      expect(result.currentReservation).toBeUndefined();
    });
  });
});
