import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService, NotificationEvent } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let _gateway: NotificationsGateway;

  const mockReservation = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    roomId: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    startTime: new Date('2025-10-11T09:00:00'),
    endTime: new Date('2025-10-11T10:00:00'),
    status: 'CONFIRMED',
  };

  const mockGateway = {
    sendToUser: jest.fn(),
    sendToAdmins: jest.fn(),
    sendToRoom: jest.fn(),
    broadcast: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    _gateway = module.get<NotificationsGateway>(NotificationsGateway);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyReservationCreated', () => {
    it('should send notification to user and admins', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';

      service.notifyReservationCreated(userId, mockReservation);

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        userId,
        NotificationEvent.RESERVATION_CREATED,
        expect.objectContaining({
          event: NotificationEvent.RESERVATION_CREATED,
          data: mockReservation,
          timestamp: expect.any(Date),
        }),
      );

      expect(mockGateway.sendToAdmins).toHaveBeenCalledWith(
        NotificationEvent.RESERVATION_CREATED,
        expect.objectContaining({
          event: NotificationEvent.RESERVATION_CREATED,
          data: mockReservation,
        }),
      );
    });
  });

  describe('notifyReservationUpdated', () => {
    it('should send notification to user and admins', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';

      service.notifyReservationUpdated(userId, mockReservation);

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        userId,
        NotificationEvent.RESERVATION_UPDATED,
        expect.any(Object),
      );

      expect(mockGateway.sendToAdmins).toHaveBeenCalled();
    });
  });

  describe('notifyReservationCancelled', () => {
    it('should send notification to user, admins, and room subscribers', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';

      service.notifyReservationCancelled(userId, mockReservation);

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        userId,
        NotificationEvent.RESERVATION_CANCELLED,
        expect.any(Object),
      );

      expect(mockGateway.sendToAdmins).toHaveBeenCalled();

      expect(mockGateway.sendToRoom).toHaveBeenCalledWith(
        mockReservation.roomId,
        NotificationEvent.ROOM_AVAILABLE,
        expect.objectContaining({
          roomId: mockReservation.roomId,
          availableFrom: mockReservation.startTime,
        }),
      );
    });
  });

  describe('notifyReservationCompleted', () => {
    it('should send notification to user and room subscribers', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';

      service.notifyReservationCompleted(userId, mockReservation);

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        userId,
        NotificationEvent.RESERVATION_COMPLETED,
        expect.any(Object),
      );

      expect(mockGateway.sendToRoom).toHaveBeenCalledWith(
        mockReservation.roomId,
        NotificationEvent.ROOM_AVAILABLE,
        expect.any(Object),
      );
    });
  });

  describe('notifyReservationNoShow', () => {
    it('should send notification to user, admins, and room subscribers', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';

      service.notifyReservationNoShow(userId, mockReservation);

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        userId,
        NotificationEvent.RESERVATION_NO_SHOW,
        expect.any(Object),
      );

      expect(mockGateway.sendToAdmins).toHaveBeenCalled();

      expect(mockGateway.sendToRoom).toHaveBeenCalledWith(
        mockReservation.roomId,
        NotificationEvent.ROOM_AVAILABLE,
        expect.any(Object),
      );
    });
  });

  describe('notifyRoomOccupied', () => {
    it('should send notification to room subscribers and admins', () => {
      const roomId = '550e8400-e29b-41d4-a716-446655440001';

      service.notifyRoomOccupied(roomId, mockReservation);

      expect(mockGateway.sendToRoom).toHaveBeenCalledWith(
        roomId,
        NotificationEvent.ROOM_OCCUPIED,
        expect.objectContaining({
          roomId,
          reservation: mockReservation,
        }),
      );

      expect(mockGateway.sendToAdmins).toHaveBeenCalled();
    });
  });

  describe('notifyRoomAvailable', () => {
    it('should send notification to room subscribers', () => {
      const roomId = '550e8400-e29b-41d4-a716-446655440001';

      service.notifyRoomAvailable(roomId);

      expect(mockGateway.sendToRoom).toHaveBeenCalledWith(
        roomId,
        NotificationEvent.ROOM_AVAILABLE,
        expect.objectContaining({
          roomId,
          timestamp: expect.any(Date),
        }),
      );
    });
  });

  describe('notifyAccessGranted', () => {
    it('should send notification to user', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';
      const roomId = '550e8400-e29b-41d4-a716-446655440001';
      const accessDetails = { token: 'abc123', method: 'QR' };

      service.notifyAccessGranted(userId, roomId, accessDetails);

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        userId,
        NotificationEvent.ACCESS_GRANTED,
        expect.objectContaining({
          roomId,
          accessDetails,
        }),
      );
    });
  });

  describe('notifyAccessDenied', () => {
    it('should send notification to user with reason', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';
      const roomId = '550e8400-e29b-41d4-a716-446655440001';
      const reason = 'Reservation not found';

      service.notifyAccessDenied(userId, roomId, reason);

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        userId,
        NotificationEvent.ACCESS_DENIED,
        expect.objectContaining({
          roomId,
          reason,
        }),
      );
    });
  });
});
