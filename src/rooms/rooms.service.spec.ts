import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomsService } from './rooms.service';
import { Room } from './room.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

describe('RoomsService', () => {
  let service: RoomsService;
  let _repository: Repository<Room>;
  let _cacheService: CacheService;

  const mockRoom: Room = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    roomNumber: 'A101',
    name: 'Conference Room A',
    capacity: 10,
    location: 'Building A, 1st Floor',
    facilities: ['Projector', 'Whiteboard'],
    operatingHours: {
      startTime: '09:00',
      endTime: '18:00',
      weekdays: [1, 2, 3, 4, 5],
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    invalidateRoom: jest.fn(),
    invalidateRoomsList: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: getRepositoryToken(Room),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    _repository = module.get<Repository<Room>>(getRepositoryToken(Room));
    _cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new room', async () => {
      const createDto = {
        roomNumber: 'A101',
        name: 'Conference Room A',
        capacity: 10,
        location: 'Building A, 1st Floor',
        facilities: ['Projector', 'Whiteboard'],
        operatingHours: {
          startTime: '09:00',
          endTime: '18:00',
          weekdays: [1, 2, 3, 4, 5],
        },
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockRoom);
      mockRepository.save.mockResolvedValue(mockRoom);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRoom);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { roomNumber: createDto.roomNumber },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockRoom);
    });

    it('should throw ConflictException if room number already exists', async () => {
      const createDto = {
        roomNumber: 'A101',
        name: 'Conference Room A',
        capacity: 10,
        location: 'Building A, 1st Floor',
        facilities: ['Projector', 'Whiteboard'],
        operatingHours: {
          startTime: '09:00',
          endTime: '18:00',
          weekdays: [1, 2, 3, 4, 5],
        },
      };

      mockRepository.findOne.mockResolvedValue(mockRoom);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a room by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockRoom);

      const result = await service.findOne(mockRoom.id);

      expect(result).toEqual(mockRoom);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRoom.id },
      });
    });

    it('should throw NotFoundException if room not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all active rooms', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockRoom]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll({});

      expect(result).toEqual([mockRoom]);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter rooms by capacity', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockRoom]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll({ minCapacity: 5 });

      expect(result).toEqual([mockRoom]);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('room.capacity >= :minCapacity', {
        minCapacity: 5,
      });
    });
  });

  describe('update', () => {
    it('should update a room', async () => {
      const updateDto = { name: 'Updated Room' };
      const updatedRoom = { ...mockRoom, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockRoom);
      mockRepository.save.mockResolvedValue(updatedRoom);

      const result = await service.update(mockRoom.id, updateDto);

      expect(result.name).toEqual(updateDto.name);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if room not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if updating to existing room number', async () => {
      const anotherRoom = { ...mockRoom, id: 'another-id' };
      mockRepository.findOne.mockResolvedValueOnce(mockRoom).mockResolvedValueOnce(anotherRoom);

      await expect(service.update(mockRoom.id, { roomNumber: 'A102' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a room by setting isActive to false', async () => {
      mockRepository.findOne.mockResolvedValue(mockRoom);
      mockRepository.save.mockResolvedValue({ ...mockRoom, isActive: false });

      await service.remove(mockRoom.id);

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockRoom,
        isActive: false,
      });
    });

    it('should throw NotFoundException if room not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvailability', () => {
    it('should return operating hours for valid weekday', async () => {
      mockRepository.findOne.mockResolvedValue(mockRoom);

      // Monday (weekday 1)
      const result = await service.getAvailability(mockRoom.id, '2025-10-13');

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('operatingHours');
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRoom.id },
      });
    });

    it('should return empty slots for non-operating day', async () => {
      mockRepository.findOne.mockResolvedValue(mockRoom);

      // Sunday (weekday 0)
      const result = await service.getAvailability(mockRoom.id, '2025-10-12');

      expect(result.availableSlots).toEqual([]);
      expect(result.message).toContain('not operating');
    });

    it('should throw NotFoundException if room not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getAvailability('invalid-id', '2025-10-13')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
