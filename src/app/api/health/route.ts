import { NextRequest, NextResponse } from 'next/server';
import { checkRedisConnection } from '@/lib/db/redis';
import { getConnectionHealth } from '@/lib/solana/connection';
import { getQueueHealth } from '@/lib/queue/bullmq';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const [redisHealthy, solanaHealth, queueHealth] = await Promise.all([
      checkRedisConnection(),
      getConnectionHealth(),
      getQueueHealth(),
    ]);

    const isHealthy = redisHealthy && solanaHealth.isHealthy;

    const health = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealthy ? 'up' : 'down',
        solana: {
          status: solanaHealth.isHealthy ? 'up' : 'down',
          blockHeight: solanaHealth.blockHeight,
          error: solanaHealth.error,
        },
        queue: {
          waiting: queueHealth.waiting,
          active: queueHealth.active,
          completed: queueHealth.completed,
          failed: queueHealth.failed,
        },
      },
    };

    return NextResponse.json(health, {
      status: isHealthy ? 200 : 503,
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
