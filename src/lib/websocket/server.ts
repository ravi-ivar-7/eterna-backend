import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { OrderUpdate } from '@/types/order';
import { createOrderUpdateSubscriber } from '@/lib/redis/pubsub';
import Redis from 'ioredis';

let io: SocketIOServer | null = null;
let redisSubscriber: Redis | null = null;

export function initializeWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  console.log('🚀 initializeWebSocketServer called - PID:', process.pid);

  if (io) {
    console.log('⚠️  WebSocket server already initialized, returning existing instance');
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });

  console.log('✅ Socket.IO server created');

  io.on('connection', (socket) => {
    console.log('👤 Client connected:', socket.id);

    socket.on('subscribe', ({ orderId }: { orderId: string }) => {
      socket.join(orderId);
      console.log(`📥 Client ${socket.id} subscribed to order ${orderId}`);
    });

    socket.on('unsubscribe', ({ orderId }: { orderId: string }) => {
      socket.leave(orderId);
      console.log(`📤 Client ${socket.id} unsubscribed from order ${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log('👋 Client disconnected:', socket.id);
    });
  });

  console.log('🔗 Creating Redis subscriber for order updates...');

  // Create Redis subscriber and forward updates to WebSocket clients
  redisSubscriber = createOrderUpdateSubscriber((orderId, update) => {
    console.log(`📨 REDIS CALLBACK for order ${orderId}:`, update.status);
    const room = io!.to(orderId);
    room.emit('order:update', update);
    console.log(`✅ Emitted update to Socket.IO room ${orderId}:`, update.status);
  });

  console.log('✅ WebSocket server initialized with Redis Pub/Sub');
  return io;
}

export function getWebSocketServer(): SocketIOServer {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
}

export function emitOrderUpdate(orderId: string, update: OrderUpdate): void {
  if (!io) {
    console.warn('WebSocket server not initialized, skipping emit');
    return;
  }

  io.to(orderId).emit('order:update', update);
  console.log(`Emitted update for order ${orderId}:`, update.status);
}
