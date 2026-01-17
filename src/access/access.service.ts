import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomAccess, AccessMethod } from './room-access.entity';
import { GenerateAccessTokenDto } from './dto/generate-access-token.dto';
import { VerifyAccessTokenDto } from './dto/verify-access-token.dto';
import { ReservationsService } from '../reservations/reservations.service';
import { ReservationStatus } from '../reservations/reservation.entity';
import * as crypto from 'crypto';

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(RoomAccess)
    private readonly roomAccessRepository: Repository<RoomAccess>,
    private readonly reservationsService: ReservationsService,
  ) {}

  async generateAccessToken(
    generateDto: GenerateAccessTokenDto,
    userId: string,
  ): Promise<RoomAccess> {
    const { reservationId, accessMethod } = generateDto;

    // 예약 정보 조회 및 권한 확인
    const reservation = await this.reservationsService.findOne(reservationId, userId);

    // 예약 상태 확인
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('취소된 예약입니다');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('완료된 예약입니다');
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException('확정된 예약만 입장 토큰을 생성할 수 있습니다');
    }

    const now = new Date();
    const startTime = new Date(reservation.startTime);
    const tenMinutesBeforeStart = new Date(startTime.getTime() - 10 * 60 * 1000);
    const thirtyMinutesAfterStart = new Date(startTime.getTime() + 30 * 60 * 1000);

    // 토큰 생성 가능 시간 확인 (예약 시작 10분 전 ~ 예약 시작 30분 후)
    if (now < tenMinutesBeforeStart) {
      throw new BadRequestException('입장 토큰은 예약 시작 10분 전부터 생성할 수 있습니다');
    }

    if (now > thirtyMinutesAfterStart) {
      throw new BadRequestException('입장 토큰 생성 시간이 만료되었습니다');
    }

    // 이미 생성된 토큰이 있는지 확인 (미사용 토큰)
    const existingToken = await this.roomAccessRepository.findOne({
      where: {
        reservationId,
        isUsed: false,
      },
    });

    if (existingToken) {
      // 기존 토큰이 만료되지 않았으면 반환
      if (new Date() < existingToken.expiresAt) {
        return existingToken;
      }
    }

    // 토큰 생성
    const accessToken = this.generateToken(accessMethod);

    // 만료 시간 설정 (예약 시작 30분 후)
    const expiresAt = thirtyMinutesAfterStart;

    const roomAccess = this.roomAccessRepository.create({
      reservationId,
      userId,
      roomId: reservation.roomId,
      accessMethod,
      accessToken,
      expiresAt,
      isUsed: false,
    });

    return await this.roomAccessRepository.save(roomAccess);
  }

  async verifyAccessToken(
    verifyDto: VerifyAccessTokenDto,
  ): Promise<{ success: boolean; message: string; roomAccess?: RoomAccess }> {
    const { accessToken } = verifyDto;

    // 토큰 조회
    const roomAccess = await this.roomAccessRepository.findOne({
      where: { accessToken },
      relations: ['reservation', 'room', 'user'],
    });

    if (!roomAccess) {
      return {
        success: false,
        message: '유효하지 않은 토큰입니다',
      };
    }

    // 토큰 사용 여부 확인
    if (roomAccess.isUsed) {
      return {
        success: false,
        message: '이미 사용된 토큰입니다',
      };
    }

    // 토큰 만료 확인
    if (new Date() > roomAccess.expiresAt) {
      return {
        success: false,
        message: '만료된 토큰입니다',
      };
    }

    // 토큰 사용 처리
    roomAccess.isUsed = true;
    roomAccess.accessTime = new Date();
    await this.roomAccessRepository.save(roomAccess);

    return {
      success: true,
      message: '출입이 승인되었습니다',
      roomAccess,
    };
  }

  async getAccessHistory(userId: string): Promise<RoomAccess[]> {
    return await this.roomAccessRepository.find({
      where: { userId },
      relations: ['reservation', 'room'],
      order: { createdAt: 'DESC' },
    });
  }

  async getCurrentRoomStatus(roomId: string): Promise<{
    isOccupied: boolean;
    currentReservation?: any;
    accessRecords?: RoomAccess[];
  }> {
    const now = new Date();

    // 현재 시간에 해당하는 예약 조회
    const currentReservations = await this.roomAccessRepository
      .createQueryBuilder('access')
      .leftJoinAndSelect('access.reservation', 'reservation')
      .leftJoinAndSelect('access.user', 'user')
      .where('access.roomId = :roomId', { roomId })
      .andWhere('access.isUsed = :isUsed', { isUsed: true })
      .andWhere('reservation.startTime <= :now', { now })
      .andWhere('reservation.endTime > :now', { now })
      .andWhere('reservation.status = :status', {
        status: ReservationStatus.CONFIRMED,
      })
      .getMany();

    if (currentReservations.length === 0) {
      return {
        isOccupied: false,
      };
    }

    return {
      isOccupied: true,
      currentReservation: currentReservations[0].reservation,
      accessRecords: currentReservations,
    };
  }

  private generateToken(method: AccessMethod): string {
    if (method === AccessMethod.PIN) {
      // 6자리 숫자 PIN 생성
      return Math.floor(100000 + Math.random() * 900000).toString();
    } else {
      // QR 코드용 랜덤 토큰 (32자리 hex)
      return crypto.randomBytes(16).toString('hex');
    }
  }
}
