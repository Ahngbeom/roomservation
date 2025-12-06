import { User, UserRole } from '../index';

// Register
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone: string;
  department?: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

// Login
export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  accessToken: string;
}

// Refresh Token
export interface RefreshTokenResponse {
  accessToken: string;
}

// Update Profile
export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  department?: string;
}

// Change Password
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
