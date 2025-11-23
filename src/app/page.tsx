'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import AuthForm from './components/AuthForm';
import OrderForm from './components/OrderForm';
import OrderStatus from './components/OrderStatus';

export default function Home() {
  const { isAuthenticated, username, token, login, logout } = useAuth();
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const { orderUpdate } = useWebSocket(currentOrderId);

  const handleOrderSubmit = (orderId: string) => {
    setCurrentOrderId(orderId);
  };

  if (!isAuthenticated) {
    return <AuthForm onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Eterna</h1>
              <p className="text-xs text-gray-600">DEX Order Execution Engine</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{username}</span>
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <OrderForm token={token!} onOrderSubmit={handleOrderSubmit} />
          </div>

          <div>
            {orderUpdate ? (
              <OrderStatus update={orderUpdate} />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Order Status
                </h2>
                <p className="text-sm text-gray-600">
                  Submit an order to see real-time status updates
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md p-4 border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">1. Submit Order</h3>
              <p className="text-gray-700">
                Choose token pair, amount, and slippage tolerance
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-md p-4 border border-amber-200">
              <h3 className="font-medium text-amber-900 mb-2">2. DEX Routing</h3>
              <p className="text-gray-700">
                System compares prices from Raydium and Meteora
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-md p-4 border border-green-200">
              <h3 className="font-medium text-green-900 mb-2">3. Execution</h3>
              <p className="text-gray-700">
                Best price executed on Solana devnet with real tx hash
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
