import 'dotenv/config';
import { orderWorker } from './src/lib/queue/worker';

console.log('Starting order worker service...');
console.log('Environment:', {
  nodeEnv: process.env.NODE_ENV,
  redisUrl: process.env.REDIS_URL ? 'Set' : 'Not set',
  databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
  solanaRpcUrl: process.env.SOLANA_RPC_URL ? 'Set' : 'Not set',
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await orderWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await orderWorker.close();
  process.exit(0);
});

console.log('Worker service is running and processing jobs...');
