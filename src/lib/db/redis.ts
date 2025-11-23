import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

const redisConfig = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

export const redis = new Redis(process.env.REDIS_URL, redisConfig);

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

export async function getRedisValue<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  if (!value) return null;
  return JSON.parse(value) as T;
}

export async function setRedisValue<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

export async function deleteRedisValue(key: string): Promise<void> {
  await redis.del(key);
}

export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}
