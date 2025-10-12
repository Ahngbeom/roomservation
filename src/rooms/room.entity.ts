import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface OperatingHours {
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  weekdays: number[]; // 0-6 (일-토)
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  roomNumber: string;

  @Column()
  name: string;

  @Column()
  capacity: number;

  @Column()
  location: string;

  @Column('simple-array')
  facilities: string[];

  @Column('jsonb')
  operatingHours: OperatingHours;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations will be added when Reservation entity is created
  // @OneToMany(() => Reservation, reservation => reservation.room)
  // reservations: Reservation[];
}
