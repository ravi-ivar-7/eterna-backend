import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

// Parse the Redis URL to extract components
const redisUrl = new URL(process.env.REDIS_URL);

// Decode URL-encoded username/password
const username = redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined;
const password = redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined;

const redisConfig: import('ioredis').RedisOptions = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  username,
  password,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Enable TLS for rediss:// URLs
  ...(process.env.REDIS_URL.startsWith('rediss://') && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
};

export const redis = new Redis(redisConfig);

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
