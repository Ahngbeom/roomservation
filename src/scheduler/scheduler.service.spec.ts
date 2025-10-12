import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/reservation.entity';
import { RoomAccess } from '../access/room-access.entity';
import { Repository } from 'typeorm';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let _reservationRepository: Repository<Reservation>;
  let _roomAccessRepository: Repository<RoomAccess>;

  const mockReservation = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    startTime: new Date('2025-10-11T09:00:00'),
    endTime: new Date('2025-10-11T10:00:00'),
    status: ReservationStatus.CONFIRMED,
    title: '회의',
    purpose: '팀 회의',
    attendees: 5,
    roomId: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRoomAccess = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    reservationId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    roomId: '550e8400-e29b-41d4-a716-446655440001',
    accessTime: new Date('2025-10-11T09:05:00'),
    isUsed: true,
  };

  const mockReservationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockRoomAccessRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
        {
          provide: getRepositoryToken(RoomAccess),
          useValue: mockRoomAccessRepository,
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    _reservationRepository = module.get<Repository<Reservation>>(
      getRepositoryToken(Reservation),
    );
    _roomAccessRepository = module.get<Repository<RoomAccess>>(
      getRepositoryToken(RoomAccess),
    );

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleNoShows', () => {
    it('should mark reservations as NO_SHOW when no access record exists', async () => {
      const reservation = { ...mockReservation };
      mockReservationRepository.find.mockResolvedValue([reservation]);
      mockRoomAccessRepository.findOne.mockResolvedValue(null);
      mockReservationRepository.save.mockResolvedValue({
        ...reservation,
        status: ReservationStatus.NO_SHOW,
      });

      await service.handleNoShows();

      expect(mockReservationRepository.find).toHaveBeenCalledWith({
        where: {
          status: ReservationStatus.CONFIRMED,
          startTime: expect.any(Object), // LessThan matcher
        },
      });
      expect(mockRoomAccessRepository.findOne).toHaveBeenCalledWith({
        where: { reservationId: reservation.id },
      });
      expect(mockReservationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReservationStatus.NO_SHOW,
          cancellationReason: '예약 시간 내 입장하지 않음 (자동 처리)',
        }),
      );
    });

    it('should mark reservations as NO_SHOW when access record exists but accessTime is null', async () => {
      const reservation = { ...mockReservation };
      const accessWithoutTime = { ...mockRoomAccess, accessTime: null };
      mockReservationRepository.find.mockResolvedValue([reservation]);
      mockRoomAccessRepository.findOne.mockResolvedValue(accessWithoutTime);
      mockReservationRepository.save.mockResolvedValue({
        ...reservation,
        status: ReservationStatus.NO_SHOW,
      });

      await service.handleNoShows();

      expect(mockReservationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReservationStatus.NO_SHOW,
          cancellationReason: '예약 시간 내 입장하지 않음 (자동 처리)',
        }),
      );
    });

    it('should not mark reservations as NO_SHOW when access record with accessTime exists', async () => {
      const reservation = { ...mockReservation };
      mockReservationRepository.find.mockResolvedValue([reservation]);
      mockRoomAccessRepository.findOne.mockResolvedValue(mockRoomAccess);

      await service.handleNoShows();

      expect(mockReservationRepository.save).not.toHaveBeenCalled();
    });

    it('should handle empty result set', async () => {
      mockReservationRepository.find.mockResolvedValue([]);

      await service.handleNoShows();

      expect(mockReservationRepository.find).toHaveBeenCalled();
      expect(mockRoomAccessRepository.findOne).not.toHaveBeenCalled();
      expect(mockReservationRepository.save).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockReservationRepository.find.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.handleNoShows()).resolves.not.toThrow();
    });
  });

  describe('handleAutoCompletion', () => {
    it('should mark CONFIRMED reservations as COMPLETED when end time has passed', async () => {
      const pastReservation = {
        ...mockReservation,
        endTime: new Date('2025-10-10T10:00:00'), // Past date
      };
      mockReservationRepository.find.mockResolvedValue([pastReservation]);
      mockReservationRepository.save.mockResolvedValue({
        ...pastReservation,
        status: ReservationStatus.COMPLETED,
      });

      await service.handleAutoCompletion();

      expect(mockReservationRepository.find).toHaveBeenCalledWith({
        where: {
          status: ReservationStatus.CONFIRMED,
          endTime: expect.any(Object), // LessThan matcher
        },
      });
      expect(mockReservationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReservationStatus.COMPLETED,
        }),
      );
    });

    it('should handle empty result set', async () => {
      mockReservationRepository.find.mockResolvedValue([]);

      await service.handleAutoCompletion();

      expect(mockReservationRepository.find).toHaveBeenCalled();
      expect(mockReservationRepository.save).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockReservationRepository.find.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.handleAutoCompletion()).resolves.not.toThrow();
    });
  });

  describe('manual execution methods', () => {
    it('should allow manual no-show check', async () => {
      mockReservationRepository.find.mockResolvedValue([]);

      await service.runNoShowCheck();

      expect(mockReservationRepository.find).toHaveBeenCalled();
    });

    it('should allow manual auto-completion check', async () => {
      mockReservationRepository.find.mockResolvedValue([]);

      await service.runAutoCompletionCheck();

      expect(mockReservationRepository.find).toHaveBeenCalled();
    });
  });
});
