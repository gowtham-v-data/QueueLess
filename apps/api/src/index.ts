import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();
const server = http.createServer(app);

server.listen(env.PORT, () => {
  console.log(`QueueLess API is running on port ${env.PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received. Shutting down QueueLess API...`);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
