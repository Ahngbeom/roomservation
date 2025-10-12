import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Room } from '../rooms/room.entity';
import { Reservation } from '../reservations/reservation.entity';

export enum AccessMethod {
  QR = 'QR',
  PIN = 'PIN',
  NFC = 'NFC',
}

@Entity('room_accesses')
export class RoomAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reservationId: string;

  @Column()
  userId: string;

  @Column()
  roomId: string;

  @Column({
    type: 'enum',
    enum: AccessMethod,
  })
  accessMethod: AccessMethod;

  @Column()
  accessToken: string;

  @Column({ type: 'timestamp', nullable: true })
  accessTime?: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Reservation, { eager: false })
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Room, { eager: false })
  @JoinColumn({ name: 'roomId' })
  room: Room;
}
