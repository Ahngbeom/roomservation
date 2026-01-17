import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservationsService } from './reservations.service';
import { Reservation, ReservationStatus } from './reservation.entity';
import { RoomsService } from '../rooms/rooms.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let _repository: Repository<Reservation>;
  let _roomsService: RoomsService;

  const mockRoom = {
    id: 'room-id',
    roomNumber: 'A101',
    name: 'Conference Room A',
    capacity: 10,
    location: 'Building A',
    facilities: ['Projector'],
    operatingHours: {
      startTime: '09:00',
      endTime: '18:00',
      weekdays: [1, 2, 3, 4, 5], // Mon-Fri
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Get next Monday (weekday 1) for testing
  const getNextMonday = () => {
    const date = new Date();
    const daysUntilMonday = (1 - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilMonday);
    date.setHours(10, 0, 0, 0);
    return date;
  };

  const futureDate = getNextMonday();

  const mockReservation: Reservation = {
    id: 'reservation-id',
    roomId: 'room-id',
    userId: 'user-id',
    title: 'Team Meeting',
    purpose: 'Weekly sync',
    startTime: new Date(futureDate),
    endTime: new Date(futureDate.getTime() + 60 * 60 * 1000), // 1 hour later
    attendees: 5,
    status: ReservationStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    room: mockRoom as any,
    user: null,
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockRoomsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockRepository,
        },
        {
          provide: RoomsService,
          useValue: mockRoomsService,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    _repository = module.get<Repository<Reservation>>(getRepositoryToken(Reservation));
    _roomsService = module.get<RoomsService>(RoomsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a reservation successfully', async () => {
      const createDto = {
        roomId: 'room-id',
        title: 'Team Meeting',
        purpose: 'Weekly sync',
        startTime: futureDate.toISOString(),
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000).toISOString(),
        attendees: 5,
      };

      mockRoomsService.findOne.mockResolvedValue(mockRoom);
      mockQueryBuilder.getOne.mockResolvedValue(null); // No conflict
      mockRepository.create.mockReturnValue(mockReservation);
      mockRepository.save.mockResolvedValue(mockReservation);

      const result = await service.create(createDto, 'user-id');

      expect(result).toEqual(mockReservation);
      expect(mockRoomsService.findOne).toHaveBeenCalledWith('room-id');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if start time is in the past', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      const createDto = {
        roomId: 'room-id',
        title: 'Team Meeting',
        purpose: 'Weekly sync',
        startTime: pastDate.toISOString(),
        endTime: new Date().toISOString(),
        attendees: 5,
      };

      mockRoomsService.findOne.mockResolvedValue(mockRoom);

      await expect(service.create(createDto, 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if duration is less than 30 minutes', async () => {
      const start = new Date(futureDate);
      const end = new Date(futureDate.getTime() + 20 * 60 * 1000); // 20 minutes

      const createDto = {
        roomId: 'room-id',
        title: 'Team Meeting',
        purpose: 'Weekly sync',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        attendees: 5,
      };

      mockRoomsService.findOne.mockResolvedValue(mockRoom);

      await expect(service.create(createDto, 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if attendees exceed room capacity', async () => {
      const createDto = {
        roomId: 'room-id',
        title: 'Team Meeting',
        purpose: 'Weekly sync',
        startTime: futureDate.toISOString(),
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000).toISOString(),
        attendees: 15, // Exceeds capacity of 10
      };

      mockRoomsService.findOne.mockResolvedValue(mockRoom);

      await expect(service.create(createDto, 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if time slot is already booked', async () => {
      const createDto = {
        roomId: 'room-id',
        title: 'Team Meeting',
        purpose: 'Weekly sync',
        startTime: futureDate.toISOString(),
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000).toISOString(),
        attendees: 5,
      };

      mockRoomsService.findOne.mockResolvedValue(mockRoom);
      mockQueryBuilder.getOne.mockResolvedValue(mockReservation); // Conflict exists

      await expect(service.create(createDto, 'user-id')).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all reservations for a user', async () => {
      mockRepository.find.mockResolvedValue([mockReservation]);

      const result = await service.findAll('user-id');

      expect(result).toEqual([mockReservation]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        relations: ['room', 'user'],
        order: { startTime: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a reservation if user owns it', async () => {
      mockRepository.findOne.mockResolvedValue(mockReservation);

      const result = await service.findOne('reservation-id', 'user-id');

      expect(result).toEqual(mockReservation);
    });

    it('should throw NotFoundException if reservation does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id', 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own reservation', async () => {
      mockRepository.findOne.mockResolvedValue(mockReservation);

      await expect(service.findOne('reservation-id', 'another-user-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a reservation successfully', async () => {
      const farFutureReservation = {
        ...mockReservation,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      mockRepository.findOne.mockResolvedValue(farFutureReservation);
      mockRepository.save.mockResolvedValue({
        ...farFutureReservation,
        status: ReservationStatus.CANCELLED,
        cancellationReason: 'Test reason',
      });

      const result = await service.cancel(
        'reservation-id',
        { cancellationReason: 'Test reason' },
        'user-id',
      );

      expect(result.status).toBe(ReservationStatus.CANCELLED);
      expect(result.cancellationReason).toBe('Test reason');
    });

    it('should throw BadRequestException if already cancelled', async () => {
      const cancelledReservation = {
        ...mockReservation,
        status: ReservationStatus.CANCELLED,
      };

      mockRepository.findOne.mockResolvedValue(cancelledReservation);

      await expect(
        service.cancel('reservation-id', { cancellationReason: 'Test' }, 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirm', () => {
    it('should confirm a pending reservation', async () => {
      mockRepository.findOne.mockResolvedValue(mockReservation);
      mockRepository.save.mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
      });

      const result = await service.confirm('reservation-id');

      expect(result.status).toBe(ReservationStatus.CONFIRMED);
    });

    it('should throw BadRequestException if not pending', async () => {
      const confirmedReservation = {
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
      };

      mockRepository.findOne.mockResolvedValue(confirmedReservation);

      await expect(service.confirm('reservation-id')).rejects.toThrow(BadRequestException);
    });
  });
});
