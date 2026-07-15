import type { Request, Response } from 'express';

export const getHealth = (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'QueueLess API',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
};
