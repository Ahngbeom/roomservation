import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * 캐시 키 상수
 */
export const CACHE_KEYS = {
  ROOMS: 'rooms:list',
  ROOM: (id: string) => `room:${id}`,
  USER: (id: string) => `user:${id}`,
  ROOM_AVAILABILITY: (id: string) => `room:${id}:availability`,
  RESERVATIONS_USER: (userId: string) => `reservations:user:${userId}`,
  STATISTICS: 'admin:statistics',
};

/**
 * TTL 상수 (밀리초)
 */
export const CACHE_TTL = {
  SHORT: 60 * 1000, // 1분
  MEDIUM: 5 * 60 * 1000, // 5분
  LONG: 30 * 60 * 1000, // 30분
};

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * 캐시에서 값 가져오기
   */
  async get<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  /**
   * 캐시에 값 저장
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl || CACHE_TTL.MEDIUM);
  }

  /**
   * 특정 키 삭제
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * 패턴으로 키 삭제 (예: "room:*")
   * Note: 메모리 캐시에서는 패턴 매칭이 제한적
   */
  async delPattern(_pattern: string): Promise<void> {
    // cache-manager 7.x에서는 패턴 매칭이 제한적
    // Redis store를 직접 사용하는 경우에만 가능
    // 현재는 개별 키 삭제만 지원
  }

  /**
   * 모든 캐시 삭제
   * Note: cache-manager 7.x에서는 reset 메서드가 없음
   */
  async reset(): Promise<void> {
    // cache-manager 7.x에서는 reset 메서드가 제거됨
    // 대신 TTL로 자동 만료되도록 함
  }

  /**
   * 방 목록 캐시 무효화
   */
  async invalidateRoomsList(): Promise<void> {
    await this.del(CACHE_KEYS.ROOMS);
  }

  /**
   * 특정 방 캐시 무효화
   */
  async invalidateRoom(roomId: string): Promise<void> {
    await this.del(CACHE_KEYS.ROOM(roomId));
    await this.del(CACHE_KEYS.ROOM_AVAILABILITY(roomId));
    await this.invalidateRoomsList();
  }

  /**
   * 사용자 캐시 무효화
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.del(CACHE_KEYS.USER(userId));
  }

  /**
   * 사용자의 예약 캐시 무효화
   */
  async invalidateUserReservations(userId: string): Promise<void> {
    await this.del(CACHE_KEYS.RESERVATIONS_USER(userId));
  }

  /**
   * 통계 캐시 무효화
   */
  async invalidateStatistics(): Promise<void> {
    await this.del(CACHE_KEYS.STATISTICS);
  }
}
