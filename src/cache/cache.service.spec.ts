import { Test, TestingModule } from '@nestjs/testing';
import { CacheService, CACHE_KEYS, CACHE_TTL } from './cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

describe('CacheService', () => {
  let service: CacheService;
  let _cacheManager: Cache;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    _cacheManager = module.get<Cache>(CACHE_MANAGER);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should retrieve value from cache', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      mockCacheManager.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(value);
    });

    it('should return undefined for non-existent key', async () => {
      const key = 'non-existent';
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get(key);

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should store value in cache with default TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await service.set(key, value);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, CACHE_TTL.MEDIUM);
    });

    it('should store value with custom TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const customTTL = 1000;

      await service.set(key, value, customTTL);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, customTTL);
    });
  });

  describe('del', () => {
    it('should delete key from cache', async () => {
      const key = 'test-key';

      await service.del(key);

      expect(mockCacheManager.del).toHaveBeenCalledWith(key);
    });
  });

  describe('reset', () => {
    it('should be a no-op in cache-manager 7.x', async () => {
      await service.reset();

      // reset 메서드가 제거되었으므로 아무것도 호출되지 않음
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('invalidateRoom', () => {
    it('should invalidate room and related caches', async () => {
      const roomId = '123';

      await service.invalidateRoom(roomId);

      expect(mockCacheManager.del).toHaveBeenCalledWith(CACHE_KEYS.ROOM(roomId));
      expect(mockCacheManager.del).toHaveBeenCalledWith(CACHE_KEYS.ROOM_AVAILABILITY(roomId));
      expect(mockCacheManager.del).toHaveBeenCalledWith(CACHE_KEYS.ROOMS);
    });
  });

  describe('invalidateUser', () => {
    it('should invalidate user cache', async () => {
      const userId = '456';

      await service.invalidateUser(userId);

      expect(mockCacheManager.del).toHaveBeenCalledWith(CACHE_KEYS.USER(userId));
    });
  });

  describe('invalidateUserReservations', () => {
    it('should invalidate user reservations cache', async () => {
      const userId = '456';

      await service.invalidateUserReservations(userId);

      expect(mockCacheManager.del).toHaveBeenCalledWith(CACHE_KEYS.RESERVATIONS_USER(userId));
    });
  });

  describe('invalidateStatistics', () => {
    it('should invalidate statistics cache', async () => {
      await service.invalidateStatistics();

      expect(mockCacheManager.del).toHaveBeenCalledWith(CACHE_KEYS.STATISTICS);
    });
  });
});
