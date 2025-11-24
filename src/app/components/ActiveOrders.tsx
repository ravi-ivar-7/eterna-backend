'use client';

import { useState } from 'react';
import { OrderUpdate } from '@/types/order';
import OrderStatus from './OrderStatus';

interface ActiveOrdersProps {
  orderUpdates: Record<string, OrderUpdate>;
  token: string;
  onOrderDeleted: (orderId: string) => void;
}

const ACTIVE_STATUSES = ['pending', 'waiting_for_price', 'failed'];

export default function ActiveOrders({ orderUpdates, token, onOrderDeleted }: ActiveOrdersProps) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const activeOrders = Object.values(orderUpdates)
    .filter((update) => ACTIVE_STATUSES.includes(update.status))
    .reverse(); // Show latest first

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
    if (selectedOrderIds.size === activeOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(activeOrders.map((o) => o.orderId)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedOrderIds.size === 0) return;

    if (!confirm(`Delete ${selectedOrderIds.size} active order(s)?`)) {
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
        console.log('Active orders deleted successfully');
        // Notify parent to remove from state
        selectedOrderIds.forEach((orderId) => onOrderDeleted(orderId));
        setSelectedOrderIds(new Set());
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

  if (activeOrders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-96">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Active Orders</h2>
        <p className="text-sm text-gray-600">
          No active orders. Submit an order to see real-time status updates.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Active Orders ({activeOrders.length})
        </h2>
        <div className="flex items-center gap-2">
          {activeOrders.length > 0 && (
            <>
              <button
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedOrderIds.size === activeOrders.length ? 'Deselect All' : 'Select All'}
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
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {activeOrders.map((update) => {
          const isSelected = selectedOrderIds.has(update.orderId);

          return (
            <div
              key={update.orderId}
              className={`border-b border-gray-100 last:border-0 pb-3 last:pb-0 rounded-md transition-colors ${isSelected ? 'bg-blue-50 border-blue-300' : ''
                }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSelectOrder(update.orderId)}
                  className="w-4 h-4 mt-2 text-blue-600 rounded cursor-pointer shrink-0"
                />
                <div className="flex-1" onClick={() => handleSelectOrder(update.orderId)}>
                  <OrderStatus update={update} />
                  <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 gap-2">
                    {update.selectedDex && (
                      <div>
                        <span className="font-medium">DEX:</span> {update.selectedDex.toUpperCase()}
                      </div>
                    )}
                    {update.amountOut && (
                      <div>
                        <span className="font-medium">Out:</span> {parseFloat(update.amountOut).toFixed(4)}
                      </div>
                    )}
                    {update.executionPrice && (
                      <div>
                        <span className="font-medium">Price:</span> {update.executionPrice.toFixed(4)}
                      </div>
                    )}
                    {update.txHash && (
                      <div className="col-span-2">
                        <span className="font-medium">TX:</span>{' '}
                        <a
                          href={`https://explorer.solana.com/tx/${update.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {update.txHash.slice(0, 8)}...
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
