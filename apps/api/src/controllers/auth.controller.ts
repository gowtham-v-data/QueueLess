import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../middlewares/error.middleware.js';
import { authService } from '../services/auth.service.js';

const readTokenFromRequest = (req: Request) => {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7);
  }

  return typeof req.body.refreshToken === 'string' ? req.body.refreshToken : undefined;
};

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = typeof req.body.refreshToken === 'string' ? req.body.refreshToken : undefined;
      if (!refreshToken) {
        throw new AppError('Refresh token is required.', 400, 'BAD_REQUEST');
      }

      const result = await authService.refresh(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = readTokenFromRequest(req);
      if (!token) {
        throw new AppError('Refresh token is required.', 400, 'BAD_REQUEST');
      }

      const result = await authService.logout(token);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  me: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        throw new AppError('Authentication is required.', 401, 'UNAUTHORIZED');
      }

      const user = await authService.me(req.auth.userId);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = String(req.body.email ?? '').trim().toLowerCase();
      const result = await authService.requestPasswordReset(email);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.resetPassword(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  sendVerification: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = String(req.body.email ?? '').trim().toLowerCase();
      const result = await authService.requestEmailVerification(email);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  verifyEmail: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = String(req.body.token ?? '').trim();
      const result = await authService.verifyEmail(token);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
};
