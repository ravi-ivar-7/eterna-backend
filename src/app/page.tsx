'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useWalletConnection } from '@/lib/hooks/useWalletConnection';
import { Order, OrderStatus } from '@/types/order';
import { useState, useEffect, useCallback } from 'react';
import AuthForm from './components/AuthForm';
import WalletConnect from './components/WalletConnect';
import OrderForm from './components/OrderForm';
import ActiveOrders from './components/ActiveOrders';
import OrderHistory from './components/OrderHistory';
import PriceChart from './components/PriceChart';

export default function Home() {
  const { isAuthenticated, username, token, login, logout, isLoading: authLoading } = useAuth();
  const { isWalletConnected, walletAddress, loading: walletLoading, setIsWalletConnected } = useWalletConnection(token);
  const { orderUpdates, subscribeToOrder, removeOrder } = useWebSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);

        // Subscribe to all orders for real-time updates
        data.orders.forEach((order: Order) => {
          subscribeToOrder(order.id, order.tokenIn, order.tokenOut, parseFloat(order.amountIn), order.status as OrderStatus);
        });
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [token, subscribeToOrder]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, token, fetchOrders]);

  const handleOrderSubmit = (orderId: string, tokenIn: string, tokenOut: string, amount: number) => {
    console.log('🎯 handleOrderSubmit called with orderId:', orderId);
    subscribeToOrder(orderId, tokenIn, tokenOut, amount);
  };

  const handleWalletConnected = () => {
    setIsWalletConnected(true);
  };

  const handleOrderDeleted = (orderId: string) => {
    console.log('🗑️ Order deleted:', orderId);
    removeOrder(orderId);
  };

  // Loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <AuthForm onLogin={login} />;
  }

  // Loading wallet status
  if (walletLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // No wallet connected
  if (!isWalletConnected) {
    return <WalletConnect token={token!} onWalletConnected={handleWalletConnected} />;
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-none">Eterna</h1>
                <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">Order Execution Engine</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                System Operational
              </div>

              <div className="h-6 w-px bg-gray-200 mx-2"></div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-500">Logged in as</p>
                  <p className="text-sm font-medium text-gray-900">{username}</p>
                </div>

                {walletAddress ? (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full pl-1 pr-3 py-1">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M2.5 4A1.5 1.5 0 001 5.5V6h18v-.5A1.5 1.5 0 0017.5 4h-15zM19 8.5H1v6A1.5 1.5 0 002.5 16h15a1.5 1.5 0 001.5-1.5v-6zM3 13.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zm4.75-.75a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-xs font-mono font-medium text-blue-700">
                      {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">No wallet connected</span>
                )}

                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Main Area */}
          <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
            {/* Top Row: Form and Active Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[600px]">
                <OrderForm token={token!} onOrderSubmit={handleOrderSubmit} />
              </div>
              <div className="h-[590px]">
                <ActiveOrders orderUpdates={orderUpdates} token={token!} onOrderDeleted={handleOrderDeleted} />
              </div>
            </div>

            {/* Bottom Row: Price Chart */}
            <div>
              <PriceChart tokenIn="SOL" tokenOut="USDC" orders={orders} />
            </div>
          </div>

          {/* Right Sidebar: History */}
          <div className="col-span-12 lg:col-span-3">
            <OrderHistory
              token={token!}
              orders={orders}
              isLoading={isLoadingOrders}
              orderUpdates={orderUpdates}
              subscribeToOrder={subscribeToOrder}
              className="h-[calc(100vh-8rem)] sticky top-4"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
