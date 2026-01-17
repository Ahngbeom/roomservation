import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';
import { NotFoundException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

describe('UsersService', () => {
  let service: UsersService;
  let _repository: Repository<User>;
  let _cacheService: CacheService;

  const mockUser: User = {
    id: 'user-id',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    name: 'Test User',
    phone: '010-1234-5678',
    role: UserRole.USER,
    department: 'Engineering',
    createdAt: new Date(),
    updatedAt: new Date(),
    comparePassword: jest.fn(),
    hashPassword: jest.fn(),
    toJSON: jest.fn(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    invalidateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    _repository = module.get<Repository<User>>(getRepositoryToken(User));
    _cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('user-id');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        phone: '010-9876-5432',
        department: 'Sales',
      };

      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(userData);

      expect(result).toEqual(mockUser);
      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        phone: '010-9999-9999',
      };

      const updatedUser = { ...mockUser, ...updateData };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update('user-id', updateData);

      expect(result.name).toEqual(updateData.name);
      expect(result.phone).toEqual(updateData.phone);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-id-2' }];
      mockRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockRepository.find).toHaveBeenCalled();
    });

    it('should return empty array if no users', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });
});
