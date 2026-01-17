import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userConnections = new Map<string, Set<string>>(); // userId -> Set of socketIds

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove client from user connections
    for (const [userId, socketIds] of this.userConnections.entries()) {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        if (socketIds.size === 0) {
          this.userConnections.delete(userId);
        }
        break;
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    const { userId } = data;

    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }

    this.userConnections.get(userId)!.add(client.id);
    client.join(`user:${userId}`);

    this.logger.log(`User ${userId} subscribed with socket ${client.id}`);

    return { success: true, message: 'Subscribed to notifications' };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    const { userId } = data;

    if (this.userConnections.has(userId)) {
      this.userConnections.get(userId)!.delete(client.id);
      if (this.userConnections.get(userId)!.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    client.leave(`user:${userId}`);

    this.logger.log(`User ${userId} unsubscribed with socket ${client.id}`);

    return { success: true, message: 'Unsubscribed from notifications' };
  }

  /**
   * 특정 사용자에게 알림 전송
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.log(`Sent ${event} to user ${userId}`);
  }

  /**
   * 모든 관리자에게 알림 전송
   */
  sendToAdmins(event: string, data: any) {
    this.server.to('admins').emit(event, data);
    this.logger.log(`Sent ${event} to all admins`);
  }

  /**
   * 모든 연결된 클라이언트에게 브로드캐스트
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`Broadcast ${event} to all clients`);
  }

  /**
   * 특정 방 ID에 대해 관심 있는 사용자들에게 알림 전송
   */
  sendToRoom(roomId: string, event: string, data: any) {
    this.server.to(`room:${roomId}`).emit(event, data);
    this.logger.log(`Sent ${event} to room ${roomId} subscribers`);
  }
}
