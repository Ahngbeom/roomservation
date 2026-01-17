import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { Reservation } from '../reservations/reservation.entity';
import { RoomAccess } from '../access/room-access.entity';

@Module({
  imports: [NestScheduleModule.forRoot(), TypeOrmModule.forFeature([Reservation, RoomAccess])],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
