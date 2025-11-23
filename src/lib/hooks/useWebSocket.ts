import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { OrderUpdate } from '@/types/order';

export function useWebSocket(orderId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [orderUpdate, setOrderUpdate] = useState<OrderUpdate | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      newSocket.emit('subscribe', { orderId });
    });

    newSocket.on('order:update', (update: OrderUpdate) => {
      console.log('Order update received:', update);
      setOrderUpdate(update);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('unsubscribe', { orderId });
      newSocket.close();
    };
  }, [orderId]);

  return { orderUpdate, socket };
}
