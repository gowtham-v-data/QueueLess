import type { UserRole } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: UserRole;
        organizationId?: string | null;
      };
    }
  }
}

export {};
