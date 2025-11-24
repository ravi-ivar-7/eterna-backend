'use client';

import { useEffect, useState } from 'react';
import { OrderUpdate, OrderStatus, Order } from '@/types/order';

interface OrderHistoryProps {
  token: string;
  orders: Order[];
  isLoading: boolean;
  orderUpdates: Record<string, OrderUpdate>;
  subscribeToOrder: (orderId: string, tokenIn?: string, tokenOut?: string, amountIn?: number, initialStatus?: OrderStatus) => void;
  className?: string;
}

export default function OrderHistory({ token, orders, isLoading, orderUpdates, subscribeToOrder, className = '' }: OrderHistoryProps) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const visibleOrders = orders.filter((order) => {
      const update = orderUpdates[order.id];
      const currentStatus = update?.status || order.status;
      return currentStatus === 'confirmed' || currentStatus === 'failed';
    });

    if (selectedOrderIds.size === visibleOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(visibleOrders.map((o) => o.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedOrderIds.size === 0) return;

    if (!confirm(`Delete ${selectedOrderIds.size} order(s)?`)) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch('/api/orders/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrderIds),
        }),
      });

      if (response.ok) {
        console.log('Orders deleted successfully');
        setSelectedOrderIds(new Set());
        // Parent will refresh via polling, or we could add a callback prop if needed
        // await fetchOrders();
      } else {
        const errorData = await response.json();
        alert('Failed to delete orders: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete orders:', error);
      alert('Failed to delete orders');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'waiting_for_price':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'awaiting_signature') return 'AWAITING SIGNATURE';
    return status.replace(/_/g, ' ').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Order History</h2>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Order History</h2>
        <p className="text-sm text-gray-600">No orders yet. Submit your first order above!</p>
      </div>
    );
  }

  const visibleOrders = orders.filter((order) => {
    const update = orderUpdates[order.id];
    const currentStatus = update?.status || order.status;
    return currentStatus === 'confirmed' || currentStatus === 'failed';
  });

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col ${className || 'h-64'}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
        <div className="flex items-center gap-2">
          {visibleOrders.length > 0 && (
            <>
              <button
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedOrderIds.size === visibleOrders.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedOrderIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : `Delete (${selectedOrderIds.size})`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {visibleOrders.map((order) => {
          const update = orderUpdates[order.id];
          const currentStatus = update?.status || order.status;
          const currentDex = update?.selectedDex || order.selectedDex;
          const currentTxHash = update?.txHash || order.txHash;
          const isSelected = selectedOrderIds.has(order.id);

          return (
            <div
              key={order.id}
              className={`p-2 rounded-md border cursor-pointer transition-colors ${isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                }`}
              onClick={() => handleSelectOrder(order.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectOrder(order.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-medium text-gray-900">
                    {order.tokenIn} → {order.tokenOut}
                  </span>
                  <span className="text-xs text-gray-500">
                    {parseFloat(order.amountIn).toFixed(2)}
                  </span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    currentStatus
                  )}`}
                >
                  {getStatusLabel(currentStatus)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 ml-6">
                <span className="font-mono">{order.id.slice(0, 8)}...</span>
                {currentDex && (
                  <span className="text-blue-600 font-medium">{currentDex.toUpperCase()}</span>
                )}
                {order.amountOut && (
                  <span>Out: {parseFloat(order.amountOut).toFixed(4)}</span>
                )}
                <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
              </div>

              {currentTxHash && (
                <div className="mt-1.5 ml-6">
                  <a
                    href={`https://explorer.solana.com/tx/${currentTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View TX
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
