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
      case 'waiting_for_price':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'awaiting_signature') return 'AWAITING SIGNATURE';
    return status.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
      <div className="space-y-1.5">
        {/* Token Pair and Amount */}
        {update.tokenIn && update.tokenOut && (
          <div className="flex items-center justify-between bg-indigo-50 px-2 py-1 rounded">
            <span className="text-xs font-semibold text-indigo-900">
              {update.tokenIn} → {update.tokenOut}
            </span>
            {update.amountIn && (
              <span className="text-xs font-mono text-indigo-700">
                {update.amountIn} {update.tokenIn}
              </span>
            )}
          </div>
        )}

        {/* Order ID and Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-500">
            {update.orderId.slice(0, 8)}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
              update.status
            )}`}
          >
            {getStatusLabel(update.status)}
          </span>
        </div>

        {/* DEX Quotes */}
        {update.dexQuotes && (
          <div className="flex items-center justify-between text-xs bg-blue-50 px-2 py-1 rounded">
            <span className="text-gray-600">Quotes:</span>
            <div className="flex gap-3">
              {update.dexQuotes.raydium !== undefined && (
                <span className="text-gray-700">
                  R: <span className="font-mono font-semibold">{update.dexQuotes.raydium.toFixed(2)}</span>
                </span>
              )}
              {update.dexQuotes.meteora !== undefined && (
                <span className="text-gray-700">
                  M: <span className="font-mono font-semibold">{update.dexQuotes.meteora.toFixed(2)}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Selected DEX */}
        {update.selectedDex && (
          <div className="flex items-center justify-between text-xs bg-green-50 px-2 py-1 rounded">
            <span className="text-gray-600">Selected:</span>
            <span className="font-semibold text-green-700">{update.selectedDex.toUpperCase()}</span>
          </div>
        )}

        {/* Execution Price */}
        {update.executionPrice && (
          <div className="flex items-center justify-between text-xs bg-purple-50 px-2 py-1 rounded">
            <span className="text-gray-600">Expected Out:</span>
            <span className="font-mono font-semibold text-purple-900">
              {update.executionPrice.toFixed(6)} {update.tokenOut}
            </span>
          </div>
        )}

        {/* Transaction Link */}
        {update.txHash && (
          <a
            href={`https://explorer.solana.com/tx/${update.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-2 rounded transition-colors"
          >
            View TX
          </a>
        )}

        {/* Error */}
        {update.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded text-xs">
            <p className="font-medium">Error:</p>
            <p className="mt-0.5">{update.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
