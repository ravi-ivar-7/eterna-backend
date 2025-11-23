import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { OrderUpdate } from '@/types/order';

let io: SocketIOServer | null = null;

export function initializeWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe', ({ orderId }: { orderId: string }) => {
      socket.join(orderId);
      console.log(`Client ${socket.id} subscribed to order ${orderId}`);
    });

    socket.on('unsubscribe', ({ orderId }: { orderId: string }) => {
      socket.leave(orderId);
      console.log(`Client ${socket.id} unsubscribed from order ${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  console.log('WebSocket server initialized');
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
