import Redis from 'ioredis';
import { OrderUpdate } from '@/types/order';

const REDIS_URL = process.env.REDIS_URL;
export const ORDER_UPDATES_CHANNEL = 'order:updates';

if (!REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set in pubsub.ts');
}

console.log('🔧 Redis Pub/Sub module loaded - PID:', process.pid);

// Publisher instance - ONLY used for publishing
let publisherInstance: Redis | null = null;

function getPublisher(): Redis {
  if (!publisherInstance) {
    console.log('📤 Creating Redis PUBLISHER instance - PID:', process.pid);
    publisherInstance = new Redis(REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return publisherInstance;
}

export function publishOrderUpdate(orderId: string, update: OrderUpdate): void {
  const message = JSON.stringify({ orderId, update });
  console.log('📤 Publishing update to Redis:', orderId, 'status:', update.status, 'PID:', process.pid);

  getPublisher().publish(ORDER_UPDATES_CHANNEL, message)
    .then((numSubscribers) => {
      console.log(`✅ Published to ${numSubscribers} subscribers`);
    })
    .catch((err) => {
      console.error('❌ Failed to publish order update:', err);
    });
}

// Subscriber management - ONLY for server process
export function createOrderUpdateSubscriber(
  callback: (orderId: string, update: OrderUpdate) => void
): Redis {
  console.log('📥 Creating Redis SUBSCRIBER instance - PID:', process.pid);

  const subscriber = new Redis(REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  subscriber.on('connect', () => {
    console.log('✅ Redis subscriber connected - PID:', process.pid);
  });

  subscriber.on('ready', () => {
    console.log('✅ Redis subscriber READY - PID:', process.pid);
  });

  subscriber.on('error', (err) => {
    console.error('❌ Redis subscriber error:', err);
  });

  subscriber.on('message', (channel, message) => {
    console.log('📨 Redis message received on channel:', channel, 'PID:', process.pid);
    if (channel === ORDER_UPDATES_CHANNEL) {
      try {
        const { orderId, update } = JSON.parse(message);
        console.log('📦 Parsed update for order:', orderId, 'status:', update.status);
        callback(orderId, update);
        console.log('✅ Callback executed successfully');
      } catch (err) {
        console.error('❌ Failed to parse order update message:', err, 'message:', message);
      }
    }
  });

  // Subscribe immediately
  subscriber.subscribe(ORDER_UPDATES_CHANNEL, (err) => {
    if (err) {
      console.error('❌ Failed to subscribe to order updates:', err);
    } else {
      console.log(`✅ Subscribed to ${ORDER_UPDATES_CHANNEL} - PID:`, process.pid);
    }
  });

  return subscriber;
}
