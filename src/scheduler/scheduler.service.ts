import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Reservation, ReservationStatus } from '../reservations/reservation.entity';
import { RoomAccess } from '../access/room-access.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(RoomAccess)
    private readonly roomAccessRepository: Repository<RoomAccess>,
  ) {}

  /**
   * 매 5분마다 실행
   * No-show 처리: 예약 시작 시간 + 10분이 지났지만 입장 기록이 없는 CONFIRMED 예약을 NO_SHOW로 변경
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleNoShows() {
    this.logger.log('Running no-show check...');

    try {
      // 10분 전 시간 계산
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

      // CONFIRMED 상태이고 시작 시간이 10분 이상 지난 예약 조회
      const potentialNoShows = await this.reservationRepository.find({
        where: {
          status: ReservationStatus.CONFIRMED,
          startTime: LessThan(tenMinutesAgo),
        },
      });

      this.logger.log(`Found ${potentialNoShows.length} potential no-show reservations`);

      let noShowCount = 0;

      for (const reservation of potentialNoShows) {
        // 해당 예약에 대한 입장 기록 확인 (accessTime이 있는 것만)
        const accessRecord = await this.roomAccessRepository.findOne({
          where: {
            reservationId: reservation.id,
          },
        });

        // 입장 기록이 없거나, accessTime이 null인 경우 (토큰만 생성하고 실제 사용하지 않음)
        if (!accessRecord || !accessRecord.accessTime) {
          reservation.status = ReservationStatus.NO_SHOW;
          reservation.cancellationReason = '예약 시간 내 입장하지 않음 (자동 처리)';
          await this.reservationRepository.save(reservation);
          noShowCount++;
        }
      }

      this.logger.log(`Marked ${noShowCount} reservations as NO_SHOW`);
    } catch (error) {
      this.logger.error('Error handling no-shows', error);
    }
  }

  /**
   * 매 10분마다 실행
   * 자동 완료: 예약 종료 시간이 지난 CONFIRMED 예약을 COMPLETED로 변경
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleAutoCompletion() {
    this.logger.log('Running auto-completion check...');

    try {
      const now = new Date();

      // CONFIRMED 상태이고 종료 시간이 지난 예약 조회
      const completedReservations = await this.reservationRepository.find({
        where: {
          status: ReservationStatus.CONFIRMED,
          endTime: LessThan(now),
        },
      });

      this.logger.log(`Found ${completedReservations.length} reservations to complete`);

      for (const reservation of completedReservations) {
        reservation.status = ReservationStatus.COMPLETED;
        await this.reservationRepository.save(reservation);
      }

      this.logger.log(`Marked ${completedReservations.length} reservations as COMPLETED`);
    } catch (error) {
      this.logger.error('Error handling auto-completion', error);
    }
  }

  /**
   * 수동 실행용 메서드 (테스트 및 관리 목적)
   */
  async runNoShowCheck() {
    await this.handleNoShows();
  }

  /**
   * 수동 실행용 메서드 (테스트 및 관리 목적)
   */
  async runAutoCompletionCheck() {
    await this.handleAutoCompletion();
  }
}
