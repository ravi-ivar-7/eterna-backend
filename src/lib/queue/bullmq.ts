import { Queue, QueueEvents } from 'bullmq';
import { redis } from '@/lib/db/redis';
import { OrderJobData } from '@/types/order';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

const connection = {
  host: new URL(process.env.REDIS_URL).hostname,
  port: parseInt(new URL(process.env.REDIS_URL).port) || 6379,
  password: new URL(process.env.REDIS_URL).password || undefined,
  ...(process.env.REDIS_URL.startsWith('rediss://') && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
};

export const orderQueue = new Queue<OrderJobData>('order-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 50,
    },
  },
});

export const orderQueueEvents = new QueueEvents('order-queue', { connection });

orderQueueEvents.on('completed', ({ jobId }) => {
  console.log(`Job ${jobId} completed successfully`);
});

orderQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed:`, failedReason);
});

export async function addOrderToQueue(orderData: OrderJobData): Promise<string> {
  const job = await orderQueue.add('process-order', orderData, {
    jobId: orderData.orderId,
  });
  return job.id as string;
}

export async function getQueueHealth(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const [waiting, active, completed, failed] = await Promise.all([
    orderQueue.getWaitingCount(),
    orderQueue.getActiveCount(),
    orderQueue.getCompletedCount(),
    orderQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}
