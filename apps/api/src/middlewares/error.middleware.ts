import type { NextFunction, Request, Response } from 'express';
import type { ErrorRequestHandler } from 'express-serve-static-core';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError('Route not found.', 404, 'NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR';
  const message = error instanceof Error ? error.message : 'Something went wrong.';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
};
