import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { OrderUpdate, OrderStatus } from '@/types/order';

interface UseWebSocketReturn {
  orderUpdates: Record<string, OrderUpdate>;
  socket: Socket | null;
  subscribeToOrder: (orderId: string, tokenIn?: string, tokenOut?: string, amountIn?: number, initialStatus?: OrderStatus) => void;
  unsubscribeFromOrder: (orderId: string) => void;
  removeOrder: (orderId: string) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [orderUpdates, setOrderUpdates] = useState<Record<string, OrderUpdate>>({});

  // Connect to WebSocket immediately on mount
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
    console.log('useWebSocket: Initializing WebSocket connection to:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    newSocket.on('order:update', (update: OrderUpdate) => {
      console.log('📦 Order update received:', update);
      setOrderUpdates((prev) => {
        const existingUpdate = prev[update.orderId];
        // Merge new update with existing data for this specific order
        return {
          ...prev,
          [update.orderId]: existingUpdate ? { ...existingUpdate, ...update } : update,
        };
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });

    setSocket(newSocket);

    return () => {
      console.log('useWebSocket: Cleanup - closing connection');
      newSocket.close();
    };
  }, []);

  const subscribeToOrder = useCallback((orderId: string, tokenIn?: string, tokenOut?: string, amountIn?: number, initialStatus: OrderStatus = 'pending') => {
    console.log('📡 subscribeToOrder called with:', { orderId, tokenIn, tokenOut, amountIn, initialStatus });

    const doSubscribe = () => {
      if (socket?.connected) {
        console.log('✅ Socket connected, subscribing to room:', orderId);
        socket.emit('subscribe', { orderId });
      } else {
        console.log('⏳ Socket not connected yet, will subscribe on connect');
        socket?.once('connect', () => {
          console.log('✅ Socket connected, now subscribing to room:', orderId);
          socket.emit('subscribe', { orderId });
        });
      }
    };

    doSubscribe();

    // Optimistically add order to state immediately
    // BUT only if we don't have a "better" status already
    setOrderUpdates((prev) => {
      const existing = prev[orderId];

      // Status precedence: pending < waiting_for_price < confirmed/failed
      const statusPrecedence: Record<OrderStatus, number> = {
        'pending': 0,
        'waiting_for_price': 1,
        'confirmed': 2,
        'failed': 2
      };

      const currentStatusLevel = existing ? statusPrecedence[existing.status] : -1;
      const newStatusLevel = statusPrecedence[initialStatus];

      // If we already have a more advanced status, don't overwrite it with a "lower" status
      // unless we are explicitly forcing it (which we aren't here)
      if (existing && currentStatusLevel > newStatusLevel) {
        console.log(`🛡️ Ignoring status update from ${existing.status} to ${initialStatus} for order ${orderId}`);
        return prev;
      }

      const optimisticUpdate = {
        // Preserve existing data first
        ...existing,
        // Overwrite with new data
        orderId,
        status: initialStatus,
        ...(tokenIn && { tokenIn }),
        ...(tokenOut && { tokenOut }),
        ...(amountIn && { amountIn }),
      };

      console.log('🎯 Setting optimistic update:', optimisticUpdate);

      return {
        ...prev,
        [orderId]: optimisticUpdate,
      };
    });
  }, [socket]);

  const unsubscribeFromOrder = useCallback((orderId: string) => {
    if (socket) {
      console.log('🔄 Unsubscribing from order:', orderId);
      socket.emit('unsubscribe', { orderId });
    }
  }, [socket]);

  const removeOrder = useCallback((orderId: string) => {
    console.log('🗑️ Removing order from state:', orderId);
    setOrderUpdates((prev) => {
      const newState = { ...prev };
      delete newState[orderId];
      return newState;
    });
    unsubscribeFromOrder(orderId);
  }, [unsubscribeFromOrder]);

  return { orderUpdates, socket, subscribeToOrder, unsubscribeFromOrder, removeOrder };
}
