import { UserRole } from '../common/enums';

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User without sensitive fields (for public display)
 */
export type PublicUser = Omit<User, 'phone' | 'department'>;
