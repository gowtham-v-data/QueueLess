export type UserRole = 'CUSTOMER' | 'STAFF' | 'ORG_ADMIN' | 'SUPER_ADMIN';

export interface AuthUserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}