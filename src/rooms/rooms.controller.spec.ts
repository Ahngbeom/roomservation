import { Test, TestingModule } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

describe('RoomsController', () => {
  let controller: RoomsController;
  let service: RoomsService;

  const mockRoom = {
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

  const mockRoomsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getAvailability: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        {
          provide: RoomsService,
          useValue: mockRoomsService,
        },
      ],
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
    service = module.get<RoomsService>(RoomsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

      mockRoomsService.create.mockResolvedValue(mockRoom);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockRoom);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of rooms', async () => {
      mockRoomsService.findAll.mockResolvedValue([mockRoom]);

      const result = await controller.findAll({});

      expect(result).toEqual([mockRoom]);
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should return filtered rooms', async () => {
      const query = { minCapacity: 5, location: 'Building A' };
      mockRoomsService.findAll.mockResolvedValue([mockRoom]);

      const result = await controller.findAll(query);

      expect(result).toEqual([mockRoom]);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a room by id', async () => {
      mockRoomsService.findOne.mockResolvedValue(mockRoom);

      const result = await controller.findOne(mockRoom.id);

      expect(result).toEqual(mockRoom);
      expect(service.findOne).toHaveBeenCalledWith(mockRoom.id);
    });
  });

  describe('getAvailability', () => {
    it('should return room availability', async () => {
      const availability = {
        date: '2025-10-13',
        operatingHours: mockRoom.operatingHours,
        availableSlots: [],
      };

      mockRoomsService.getAvailability.mockResolvedValue(availability);

      const result = await controller.getAvailability(mockRoom.id, {
        date: '2025-10-13',
      });

      expect(result).toEqual(availability);
      expect(service.getAvailability).toHaveBeenCalledWith(mockRoom.id, '2025-10-13');
    });
  });

  describe('update', () => {
    it('should update a room', async () => {
      const updateDto = { name: 'Updated Room' };
      const updatedRoom = { ...mockRoom, ...updateDto };

      mockRoomsService.update.mockResolvedValue(updatedRoom);

      const result = await controller.update(mockRoom.id, updateDto);

      expect(result).toEqual(updatedRoom);
      expect(service.update).toHaveBeenCalledWith(mockRoom.id, updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a room', async () => {
      mockRoomsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockRoom.id);

      expect(service.remove).toHaveBeenCalledWith(mockRoom.id);
    });
  });
});
