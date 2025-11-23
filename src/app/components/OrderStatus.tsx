'use client';

import { OrderUpdate } from '@/types/order';

interface OrderStatusProps {
  update: OrderUpdate | null;
}

export default function OrderStatus({ update }: OrderStatusProps) {
  if (!update) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'routing':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'building':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'submitted':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Status</h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Order ID</span>
          <span className="text-sm font-mono text-gray-900">
            {update.orderId.slice(0, 8)}...
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
              update.status
            )}`}
          >
            {update.status.toUpperCase()}
          </span>
        </div>

        {update.dexQuotes && (
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-md p-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-2">DEX Quotes</p>
            <div className="space-y-1">
              {update.dexQuotes.raydium !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Raydium:</span>
                  <span className="font-mono text-gray-900">
                    {update.dexQuotes.raydium.toFixed(6)}
                  </span>
                </div>
              )}
              {update.dexQuotes.meteora !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Meteora:</span>
                  <span className="font-mono text-gray-900">
                    {update.dexQuotes.meteora.toFixed(6)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {update.selectedDex && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Selected DEX</span>
            <span className="text-sm font-semibold text-blue-600">
              {update.selectedDex.toUpperCase()}
            </span>
          </div>
        )}

        {update.executionPrice && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Execution Price</span>
            <span className="text-sm font-mono text-gray-900">
              {update.executionPrice.toFixed(6)}
            </span>
          </div>
        )}

        {update.txHash && (
          <div className="mt-4">
            <a
              href={`https://explorer.solana.com/tx/${update.txHash}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
            >
              View on Solana Explorer
            </a>
          </div>
        )}

        {update.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
            <p className="font-medium">Error:</p>
            <p className="text-xs mt-1">{update.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
