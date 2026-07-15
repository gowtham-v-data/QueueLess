import compression from 'compression';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'QueueLess API is running. Visit /api/health for the health check.'
    });
  });
  app.get('/favicon.ico', (_req: Request, res: Response) => {
    res.status(204).end();
  });
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
  app.use(pinoHttp());

  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
