import type { NextFunction, Request, Response } from 'express';
import { firebaseAuth, firebaseEnabled } from '../config/firebase.js';
import { AppError } from './error.middleware.js';
import { verifyAccessToken } from '../utils/jwt.js';
import type { UserRole } from '../types/auth.js';

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    next(new AppError('Authentication is required.', 401, 'UNAUTHORIZED'));
    return;
  }

  try {
    if (firebaseEnabled && firebaseAuth) {
      const decoded = await firebaseAuth.verifyIdToken(token);
      req.auth = {
        userId: decoded.uid,
        role: String(decoded.role ?? 'CUSTOMER') as UserRole,
        organizationId: typeof decoded.organizationId === 'string' ? decoded.organizationId : null
      };
      next();
      return;
    }

    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      role: payload.role as UserRole,
      organizationId: payload.organizationId ?? null
    };
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown auth error';
    console.warn('[auth.middleware] Token verification failed:', message);
    next(new AppError('Invalid or expired access token.', 401, 'UNAUTHORIZED'));
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      next(new AppError('You do not have permission to access this resource.', 403, 'FORBIDDEN'));
      return;
    }

    next();
  };
};
