import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { RoomsModule } from '../rooms/rooms.module';
import { User } from '../users/user.entity';
import { Reservation } from '../reservations/reservation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Reservation]),
    UsersModule,
    ReservationsModule,
    RoomsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
