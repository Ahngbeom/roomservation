import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache/cache.service';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly cacheService: CacheService,
  ) {}

  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    // 중복된 방 번호 체크
    const existingRoom = await this.roomRepository.findOne({
      where: { roomNumber: createRoomDto.roomNumber },
    });

    if (existingRoom) {
      throw new ConflictException(
        `Room with number ${createRoomDto.roomNumber} already exists`,
      );
    }

    const room = this.roomRepository.create(createRoomDto);
    const savedRoom = await this.roomRepository.save(room);

    // 방 목록 캐시 무효화
    await this.cacheService.invalidateRoomsList();

    return savedRoom;
  }

  async findAll(query: RoomQueryDto): Promise<Room[]> {
    // 필터가 없는 경우에만 캐시 사용
    const hasFilters = query.minCapacity || query.location || query.facilities;

    if (!hasFilters) {
      const cached = await this.cacheService.get<Room[]>(CACHE_KEYS.ROOMS);
      if (cached) {
        return cached;
      }
    }

    const { minCapacity, location, facilities } = query;
    const queryBuilder = this.roomRepository
      .createQueryBuilder('room')
      .where('room.isActive = :isActive', { isActive: true });

    if (minCapacity) {
      queryBuilder.andWhere('room.capacity >= :minCapacity', { minCapacity });
    }

    if (location) {
      queryBuilder.andWhere('room.location LIKE :location', {
        location: `%${location}%`,
      });
    }

    if (facilities) {
      // facilities는 쉼표로 구분된 문자열로 전달됨
      const facilityList = facilities.split(',').map((f) => f.trim());
      facilityList.forEach((facility, index) => {
        queryBuilder.andWhere(`room.facilities LIKE :facility${index}`, {
          [`facility${index}`]: `%${facility}%`,
        });
      });
    }

    const rooms = await queryBuilder.getMany();

    // 필터가 없는 경우 캐시 저장
    if (!hasFilters) {
      await this.cacheService.set(CACHE_KEYS.ROOMS, rooms, CACHE_TTL.MEDIUM);
    }

    return rooms;
  }

  async findOne(id: string): Promise<Room> {
    // 캐시 확인
    const cached = await this.cacheService.get<Room>(CACHE_KEYS.ROOM(id));
    if (cached) {
      return cached;
    }

    const room = await this.roomRepository.findOne({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    // 캐시 저장
    await this.cacheService.set(CACHE_KEYS.ROOM(id), room, CACHE_TTL.LONG);

    return room;
  }

  async update(id: string, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const room = await this.findOne(id);

    // 방 번호를 변경하는 경우 중복 체크
    if (
      updateRoomDto.roomNumber &&
      updateRoomDto.roomNumber !== room.roomNumber
    ) {
      const existingRoom = await this.roomRepository.findOne({
        where: { roomNumber: updateRoomDto.roomNumber },
      });

      if (existingRoom) {
        throw new ConflictException(
          `Room with number ${updateRoomDto.roomNumber} already exists`,
        );
      }
    }

    Object.assign(room, updateRoomDto);
    const updatedRoom = await this.roomRepository.save(room);

    // 캐시 무효화
    await this.cacheService.invalidateRoom(id);

    return updatedRoom;
  }

  async remove(id: string): Promise<void> {
    const room = await this.findOne(id);
    // Soft delete: isActive를 false로 변경
    room.isActive = false;
    await this.roomRepository.save(room);

    // 캐시 무효화
    await this.cacheService.invalidateRoom(id);
  }

  async getAvailability(id: string, date: string): Promise<any> {
    // 캐시 확인 (날짜별로 캐시)
    const cacheKey = `${CACHE_KEYS.ROOM_AVAILABILITY(id)}:${date}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const room = await this.findOne(id);

    // 해당 날짜의 요일 확인
    const targetDate = new Date(date);
    const weekday = targetDate.getDay();

    // 운영 요일이 아니면 빈 배열 반환
    if (!room.operatingHours.weekdays.includes(weekday)) {
      const result = {
        date,
        availableSlots: [],
        message: 'Room is not operating on this day',
      };
      // 짧은 TTL로 캐시 (1분)
      await this.cacheService.set(cacheKey, result, CACHE_TTL.SHORT);
      return result;
    }

    // TODO: Reservation 모듈 구현 후 예약된 시간대를 조회하여 가능한 시간대 계산
    // 현재는 운영 시간만 반환
    const result = {
      date,
      operatingHours: room.operatingHours,
      availableSlots: [], // 예약 모듈 구현 후 계산
      message:
        'Availability calculation will be completed after Reservation module implementation',
    };

    // 짧은 TTL로 캐시 (1분) - 예약 상태가 자주 변경될 수 있음
    await this.cacheService.set(cacheKey, result, CACHE_TTL.SHORT);

    return result;
  }
}
