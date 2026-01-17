import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let _usersService: UsersService;
  let _jwtService: JwtService;
  let _configService: ConfigService;

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

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _usersService = module.get<UsersService>(UsersService);
    _jwtService = module.get<JwtService>(JwtService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        phone: '010-9876-5432',
        department: 'Sales',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockUsersService.create).toHaveBeenCalledWith(registerDto);
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
        phone: '010-1234-5678',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user successfully and return tokens', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const userWithCompare = {
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      mockUsersService.findByEmail.mockResolvedValue(userWithCompare);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(userWithCompare.comparePassword).toHaveBeenCalledWith(loginDto.password);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const userWithCompare = {
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      mockUsersService.findByEmail.mockResolvedValue(userWithCompare);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(userWithCompare.comparePassword).toHaveBeenCalledWith(loginDto.password);
    });
  });

  describe('refresh', () => {
    it('should generate new tokens', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refresh(mockUser);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateProfileDto = {
        name: 'Updated Name',
        phone: '010-9999-9999',
      };

      const updatedUser = { ...mockUser, ...updateProfileDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-id', updateProfileDto);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith('user-id', updateProfileDto);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      const userWithCompare = {
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      mockUsersService.findById.mockResolvedValue(userWithCompare);
      mockUsersService.update.mockResolvedValue(userWithCompare);

      await service.changePassword('user-id', changePasswordDto);

      expect(userWithCompare.comparePassword).toHaveBeenCalledWith(
        changePasswordDto.currentPassword,
      );
      expect(mockUsersService.update).toHaveBeenCalledWith('user-id', {
        password: changePasswordDto.newPassword,
      });
    });

    it('should throw BadRequestException if current password is wrong', async () => {
      const changePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      const userWithCompare = {
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      mockUsersService.findById.mockResolvedValue(userWithCompare);

      await expect(service.changePassword('user-id', changePasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });
  });
});
