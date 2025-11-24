'use client';

import { useState } from 'react';

interface OrderFormProps {
  token: string;
  onOrderSubmit: (orderId: string, tokenIn: string, tokenOut: string, amount: number) => void;
}

export default function OrderForm({ token, onOrderSubmit }: OrderFormProps) {
  const [tokenIn, setTokenIn] = useState('SOL');
  const [tokenOut, setTokenOut] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('📝 Submitting order:', { tokenIn, tokenOut, amount, slippage });

    // Fire and forget - don't wait for response to unblock the form
    fetch('/api/orders/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tokenIn,
        tokenOut,
        amount: parseFloat(amount),
        slippage: parseFloat(slippage) / 100,
      }),
    })
      .then(async (response) => {
        console.log('📡 API Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Order submission failed:', errorData);
          throw new Error(errorData.error || 'Failed to submit order');
        }

        const data = await response.json();
        console.log('✅ Order created:', data);
        console.log('🎯 Calling onOrderSubmit with orderId:', data.orderId);
        onOrderSubmit(data.orderId, tokenIn, tokenOut, parseFloat(amount));
      })
      .catch((err) => {
        console.error('❌ Order submission error:', err);
        setError(err instanceof Error ? err.message : 'Failed to submit order');
      });

    // Clear form immediately without waiting
    setAmount('');
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-gray-200 p-6 h-full overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Market Order</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <select
              value={tokenIn}
              onChange={(e) => setTokenIn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <select
              value={tokenOut}
              onChange={(e) => setTokenOut(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.000001"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="0.0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slippage (%)
          </label>
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            step="0.1"
            min="0.1"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!amount}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Execute Order
        </button>
      </form>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-900">Bulk Upload (CSV)</h3>
          <button
            type="button"
            onClick={() => {
              const sampleData = [
                'tokenIn,tokenOut,amount',
                'SOL,USDC,0.1',
                'USDC,SOL,10',
                'SOL,USDT,0.5',
                'USDT,SOL,20',
                'SOL,USDC,1.0',
                'USDC,SOL,50',
                'SOL,USDT,2.0',
                'USDT,SOL,100',
                'SOL,USDC,0.05',
                'USDC,SOL,5'
              ].join('\n');

              const blob = new Blob([sampleData], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'sample_orders.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Download Sample CSV
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Format: tokenIn,tokenOut,amount (e.g., SOL,USDC,1.5)
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const text = await file.text();
            const lines = text.split('\n');

            let successCount = 0;
            let failCount = 0;

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;

              const parts = trimmedLine.split(',');
              if (parts.length < 3) continue;

              // Simple header detection/skipping if first row looks like header
              if (parts[0].toLowerCase() === 'tokenin' && parts[2].toLowerCase() === 'amount') continue;

              const [csvTokenIn, csvTokenOut, csvAmount] = parts.map(p => p.trim());
              const parsedAmount = parseFloat(csvAmount);

              if (isNaN(parsedAmount) || parsedAmount <= 0) {
                console.warn('Skipping invalid row:', line);
                failCount++;
                continue;
              }

              // Reuse the submission logic (simplified version of handleSubmit)
              try {
                const response = await fetch('/api/orders/execute', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    tokenIn: csvTokenIn,
                    tokenOut: csvTokenOut,
                    amount: parsedAmount,
                    slippage: 0.01, // Default 1% for bulk
                  }),
                });

                if (response.ok) {
                  const data = await response.json();
                  console.log('✅ Bulk order created:', data.orderId);
                  onOrderSubmit(data.orderId, csvTokenIn, csvTokenOut, parsedAmount);
                  successCount++;
                } else {
                  failCount++;
                }
              } catch (err) {
                console.error('Bulk submit error:', err);
                failCount++;
              }
            }

            alert(`Bulk upload complete.\nSuccess: ${successCount}\nFailed: ${failCount}`);
            // Reset input
            e.target.value = '';
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
    </div>
  );
}
