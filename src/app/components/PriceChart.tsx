'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

import { Order } from '@/types/order';

interface PricePoint {
    time: string;
    price: number;
}

interface PriceChartProps {
    tokenIn: string;
    tokenOut: string;
    orders: Order[];
}

export default function PriceChart({ tokenIn, tokenOut, orders }: PriceChartProps) {
    const [data, setData] = useState<PricePoint[]>([]);

    useEffect(() => {
        if (!orders || orders.length === 0) {
            setData([]);
            return;
        }

        // Filter orders for the selected pair and confirmed status
        const relevantOrders = orders.filter(
            (o) =>
                o.status === 'confirmed' &&
                o.tokenIn === tokenIn &&
                o.tokenOut === tokenOut
        );

        // Map to chart data
        const chartData = relevantOrders
            .map((o) => {
                let price = 0;
                // Try to get execution price first
                // Note: executionPrice is not on the Order type yet, but we can calculate it
                // or use amountOut/amountIn
                if (o.amountOut && o.amountIn) {
                    price = parseFloat(o.amountOut) / parseFloat(o.amountIn);
                }

                return {
                    time: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    price: price,
                    timestamp: new Date(o.createdAt).getTime(), // For sorting
                };
            })
            .filter((p) => p.price > 0)
            .sort((a, b) => a.timestamp - b.timestamp);

        setData(chartData);
    }, [tokenIn, tokenOut, orders]);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-96 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {tokenIn}/{tokenOut} Price Chart
            </h2>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            domain={['auto', 'auto']}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => value.toFixed(2)}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#2563eb' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="price"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
