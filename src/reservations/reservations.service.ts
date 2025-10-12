import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { RoomsService } from '../rooms/rooms.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly roomsService: RoomsService,
  ) {}

  async create(
    createReservationDto: CreateReservationDto,
    userId: string,
  ): Promise<Reservation> {
    const { roomId, startTime, endTime, attendees } = createReservationDto;

    // 방 존재 여부 확인
    const room = await this.roomsService.findOne(roomId);

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    // 1. 예약 시작 시간이 현재 시간 이후인지 확인
    if (start <= now) {
      throw new BadRequestException(
        'Reservation start time must be in the future',
      );
    }

    // 2. 시작 시간이 종료 시간보다 이전인지 확인
    if (start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }

    // 3. 최소 예약 시간: 30분
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 30) {
      throw new BadRequestException(
        'Minimum reservation duration is 30 minutes',
      );
    }

    // 4. 최대 예약 시간: 8시간
    if (durationMinutes > 480) {
      throw new BadRequestException('Maximum reservation duration is 8 hours');
    }

    // 5. 참석 인원이 방 수용 인원을 초과하지 않는지 확인
    if (attendees > room.capacity) {
      throw new BadRequestException(
        `Attendees count (${attendees}) exceeds room capacity (${room.capacity})`,
      );
    }

    // 6. 예약 시간이 방의 운영 시간 내에 있는지 확인
    this.validateOperatingHours(start, end, room.operatingHours);

    // 7. 예약 충돌 검사
    await this.checkReservationConflict(roomId, start, end);

    // 예약 생성
    const reservation = this.reservationRepository.create({
      ...createReservationDto,
      userId,
      startTime: start,
      endTime: end,
      status: ReservationStatus.PENDING,
    });

    return await this.reservationRepository.save(reservation);
  }

  async findAll(userId: string): Promise<Reservation[]> {
    return await this.reservationRepository.find({
      where: { userId },
      relations: ['room', 'user'],
      order: { startTime: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['room', 'user'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    // 사용자는 자신의 예약만 조회 가능
    if (reservation.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this reservation',
      );
    }

    return reservation;
  }

  async findByRoomId(roomId: string): Promise<Reservation[]> {
    // 방 존재 여부 확인
    await this.roomsService.findOne(roomId);

    return await this.reservationRepository.find({
      where: {
        roomId,
        status: ReservationStatus.CONFIRMED,
      },
      relations: ['user'],
      order: { startTime: 'ASC' },
    });
  }

  async update(
    id: string,
    updateReservationDto: UpdateReservationDto,
    userId: string,
  ): Promise<Reservation> {
    const reservation = await this.findOne(id, userId);

    // 예약 상태 확인
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled reservation');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('Cannot update a completed reservation');
    }

    // 예약 시작 1시간 전까지만 변경 가능
    const oneHourBeforeStart = new Date(reservation.startTime);
    oneHourBeforeStart.setHours(oneHourBeforeStart.getHours() - 1);

    if (new Date() > oneHourBeforeStart) {
      throw new BadRequestException(
        'Cannot update reservation within 1 hour of start time',
      );
    }

    // 시간 변경 시 유효성 검사
    if (updateReservationDto.startTime || updateReservationDto.endTime) {
      const newStart = updateReservationDto.startTime
        ? new Date(updateReservationDto.startTime)
        : reservation.startTime;
      const newEnd = updateReservationDto.endTime
        ? new Date(updateReservationDto.endTime)
        : reservation.endTime;

      const room = await this.roomsService.findOne(reservation.roomId);

      // 시작/종료 시간 검증
      if (newStart >= newEnd) {
        throw new BadRequestException('Start time must be before end time');
      }

      const durationMinutes =
        (newEnd.getTime() - newStart.getTime()) / (1000 * 60);
      if (durationMinutes < 30 || durationMinutes > 480) {
        throw new BadRequestException(
          'Reservation duration must be between 30 minutes and 8 hours',
        );
      }

      // 운영 시간 검증
      this.validateOperatingHours(newStart, newEnd, room.operatingHours);

      // 충돌 검사 (자신의 예약 제외)
      await this.checkReservationConflict(
        reservation.roomId,
        newStart,
        newEnd,
        id,
      );

      Object.assign(reservation, {
        startTime: newStart,
        endTime: newEnd,
      });
    }

    // 나머지 필드 업데이트
    if (updateReservationDto.title) {
      reservation.title = updateReservationDto.title;
    }
    if (updateReservationDto.purpose) {
      reservation.purpose = updateReservationDto.purpose;
    }
    if (updateReservationDto.attendees) {
      const room = await this.roomsService.findOne(reservation.roomId);
      if (updateReservationDto.attendees > room.capacity) {
        throw new BadRequestException(
          `Attendees count exceeds room capacity (${room.capacity})`,
        );
      }
      reservation.attendees = updateReservationDto.attendees;
    }

    return await this.reservationRepository.save(reservation);
  }

  async cancel(
    id: string,
    cancelDto: CancelReservationDto,
    userId: string,
  ): Promise<Reservation> {
    const reservation = await this.findOne(id, userId);

    // 이미 취소되었는지 확인
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Reservation is already cancelled');
    }

    // 예약 시작 30분 전까지만 취소 가능
    const thirtyMinutesBeforeStart = new Date(reservation.startTime);
    thirtyMinutesBeforeStart.setMinutes(
      thirtyMinutesBeforeStart.getMinutes() - 30,
    );

    if (new Date() > thirtyMinutesBeforeStart) {
      throw new BadRequestException(
        'Cannot cancel reservation within 30 minutes of start time',
      );
    }

    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancellationReason = cancelDto.cancellationReason;

    return await this.reservationRepository.save(reservation);
  }

  async confirm(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Only pending reservations can be confirmed',
      );
    }

    reservation.status = ReservationStatus.CONFIRMED;
    return await this.reservationRepository.save(reservation);
  }

  private validateOperatingHours(
    start: Date,
    end: Date,
    operatingHours: any,
  ): void {
    const startWeekday = start.getDay();
    const endWeekday = end.getDay();

    // 시작과 종료가 같은 날인지 확인
    if (startWeekday !== endWeekday) {
      throw new BadRequestException(
        'Reservation cannot span across multiple days',
      );
    }

    // 운영 요일인지 확인
    if (!operatingHours.weekdays.includes(startWeekday)) {
      throw new BadRequestException(
        'Room is not operating on the selected day',
      );
    }

    // 운영 시간 내인지 확인
    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    const endHour = end.getHours();
    const endMinute = end.getMinutes();

    const [opStartHour, opStartMinute] = operatingHours.startTime
      .split(':')
      .map(Number);
    const [opEndHour, opEndMinute] = operatingHours.endTime
      .split(':')
      .map(Number);

    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    const opStartTimeMinutes = opStartHour * 60 + opStartMinute;
    const opEndTimeMinutes = opEndHour * 60 + opEndMinute;

    if (
      startTimeMinutes < opStartTimeMinutes ||
      endTimeMinutes > opEndTimeMinutes
    ) {
      throw new BadRequestException(
        `Reservation time must be within operating hours (${operatingHours.startTime} - ${operatingHours.endTime})`,
      );
    }
  }

  private async checkReservationConflict(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeReservationId?: string,
  ): Promise<void> {
    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.roomId = :roomId', { roomId })
      .andWhere('reservation.status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
      })
      .andWhere(
        '(reservation.startTime < :endTime AND reservation.endTime > :startTime)',
        { startTime, endTime },
      );

    if (excludeReservationId) {
      queryBuilder.andWhere('reservation.id != :excludeReservationId', {
        excludeReservationId,
      });
    }

    const conflictingReservation = await queryBuilder.getOne();

    if (conflictingReservation) {
      throw new ConflictException(
        'The selected time slot conflicts with an existing reservation',
      );
    }
  }
}
