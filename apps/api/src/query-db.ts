import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robustly resolve root .env file relative to this file's location
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const prisma = new PrismaClient() as any;
  try {
    console.log('Connecting to MySQL and fetching table counts...');
    const users = await prisma.user.count();
    const orgs = await prisma.organization.count();
    const branches = await prisma.branch.count();
    const services = await prisma.service.count();
    const counters = await prisma.counter.count();
    const queues = await prisma.queue.count();

    console.log('\n--- MySQL Table Counts ---');
    console.log(`User: ${users}`);
    console.log(`Organization: ${orgs}`);
    console.log(`Branch: ${branches}`);
    console.log(`Service: ${services}`);
    console.log(`Counter: ${counters}`);
    console.log(`Queue: ${queues}`);
  } catch (err: any) {
    console.error('Error querying MySQL database:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
