import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

export enum NotificationEvent {
  RESERVATION_CREATED = 'reservation:created',
  RESERVATION_UPDATED = 'reservation:updated',
  RESERVATION_CANCELLED = 'reservation:cancelled',
  RESERVATION_COMPLETED = 'reservation:completed',
  RESERVATION_NO_SHOW = 'reservation:no_show',
  ROOM_OCCUPIED = 'room:occupied',
  ROOM_AVAILABLE = 'room:available',
  ACCESS_GRANTED = 'access:granted',
  ACCESS_DENIED = 'access:denied',
}

export interface NotificationPayload {
  event: NotificationEvent;
  data: any;
  timestamp: Date;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  /**
   * 예약 생성 알림
   */
  notifyReservationCreated(userId: string, reservation: any) {
    const payload: NotificationPayload = {
      event: NotificationEvent.RESERVATION_CREATED,
      data: reservation,
      timestamp: new Date(),
    };

    this.notificationsGateway.sendToUser(
      userId,
      NotificationEvent.RESERVATION_CREATED,
      payload,
    );

    // 관리자에게도 알림
    this.notificationsGateway.sendToAdmins(
      NotificationEvent.RESERVATION_CREATED,
      payload,
    );
  }

  /**
   * 예약 수정 알림
   */
  notifyReservationUpdated(userId: string, reservation: any) {
    const payload: NotificationPayload = {
      event: NotificationEvent.RESERVATION_UPDATED,
      data: reservation,
      timestamp: new Date(),
    };

    this.notificationsGateway.sendToUser(
      userId,
      NotificationEvent.RESERVATION_UPDATED,
      payload,
    );

    // 관리자에게도 알림
    this.notificationsGateway.sendToAdmins(
      NotificationEvent.RESERVATION_UPDATED,
      payload,
    );
  }

  /**
   * 예약 취소 알림
   */
  notifyReservationCancelled(userId: string, reservation: any) {
    const payload: NotificationPayload = {
      event: NotificationEvent.RESERVATION_CANCELLED,
      data: reservation,
      timestamp: new Date(),
    };

    this.notificationsGateway.sendToUser(
      userId,
      NotificationEvent.RESERVATION_CANCELLED,
      payload,
    );

    // 관리자에게도 알림
    this.notificationsGateway.sendToAdmins(
      NotificationEvent.RESERVATION_CANCELLED,
      payload,
    );

    // 해당 방을 구독 중인 사용자들에게도 알림 (가용성 변경)
    this.notificationsGateway.sendToRoom(
      reservation.roomId,
      NotificationEvent.ROOM_AVAILABLE,
      {
        roomId: reservation.roomId,
        availableFrom: reservation.startTime,
        timestamp: new Date(),
      },
    );
  }

  /**
   * 예약 완료 알림
   */
  notifyReservationCompleted(userId: string, reservation: any) {
    const payload: NotificationPayload = {
      event: NotificationEvent.RESERVATION_COMPLETED,
      data: reservation,
      timestamp: new Date(),
    };

    this.notificationsGateway.sendToUser(
      userId,
      NotificationEvent.RESERVATION_COMPLETED,
      payload,
    );

    // 해당 방을 구독 중인 사용자들에게도 알림 (가용성 변경)
    this.notificationsGateway.sendToRoom(
      reservation.roomId,
      NotificationEvent.ROOM_AVAILABLE,
      {
        roomId: reservation.roomId,
        availableFrom: new Date(),
        timestamp: new Date(),
      },
    );
  }

  /**
   * No-show 알림
   */
  notifyReservationNoShow(userId: string, reservation: any) {
    const payload: NotificationPayload = {
      event: NotificationEvent.RESERVATION_NO_SHOW,
      data: reservation,
      timestamp: new Date(),
    };

    this.notificationsGateway.sendToUser(
      userId,
      NotificationEvent.RESERVATION_NO_SHOW,
      payload,
    );

    // 관리자에게도 알림
    this.notificationsGateway.sendToAdmins(
      NotificationEvent.RESERVATION_NO_SHOW,
      payload,
    );

    // 해당 방을 구독 중인 사용자들에게도 알림 (가용성 변경)
    this.notificationsGateway.sendToRoom(
      reservation.roomId,
      NotificationEvent.ROOM_AVAILABLE,
      {
        roomId: reservation.roomId,
        availableFrom: new Date(),
        timestamp: new Date(),
      },
    );
  }

  /**
   * 방 입장 알림
   */
  notifyRoomOccupied(roomId: string, reservation: any) {
    const payload = {
      roomId,
      reservation,
      timestamp: new Date(),
    };

    this.notificationsGateway.sendToRoom(
      roomId,
      NotificationEvent.ROOM_OCCUPIED,
      payload,
    );

    // 관리자에게도 알림
    this.notificationsGateway.sendToAdmins(
      NotificationEvent.ROOM_OCCUPIED,
      payload,
    );
  }

  /**
   * 방 가용 알림
   */
  notifyRoomAvailable(roomId: string) {
    const payload = {
      roomId,
      timestamp: new Date(),
    };

    this.notificationsGateway.sendToRoom(
      roomId,
      NotificationEvent.ROOM_AVAILABLE,
      payload,
    );
  }

  /**
   * 접근 승인 알림
   */
  notifyAccessGranted(userId: string, roomId: string, accessDetails: any) {
    const payload = {
      roomId,
      accessDetails,
      timestamp: new Date(),
    };

    this.notificationsGateway.sendToUser(
      userId,
      NotificationEvent.ACCESS_GRANTED,
      payload,
    );
  }

  /**
   * 접근 거부 알림
   */
  notifyAccessDenied(userId: string, roomId: string, reason: string) {
    const payload = {
      roomId,
      reason,
      timestamp: new Date(),
    };

    this.notificationsGateway.sendToUser(
      userId,
      NotificationEvent.ACCESS_DENIED,
      payload,
    );
  }
}
