import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache/cache.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  async findById(id: string): Promise<User> {
    // 캐시 확인
    const cached = await this.cacheService.get<User>(CACHE_KEYS.USER(id));
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    // 캐시 저장
    await this.cacheService.set(CACHE_KEYS.USER(id), user, CACHE_TTL.MEDIUM);

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, userData);
    const updatedUser = await this.userRepository.save(user);

    // 캐시 무효화
    await this.cacheService.invalidateUser(id);

    return updatedUser;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }
}
