import { NextRequest, NextResponse } from 'next/server';
import { db, orders } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { addOrderToQueue } from '@/lib/queue/bullmq';
import { validateTokenPair, getTokenAddress } from '@/lib/solana/tokens';
import { OrderExecuteRequest, OrderExecuteResponse } from '@/types/order';

async function handler(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const body: OrderExecuteRequest = await req.json();
    const { tokenIn, tokenOut, amount, slippage = 0.01 } = body;

    if (!tokenIn || !tokenOut || !amount) {
      return NextResponse.json(
        { error: 'tokenIn, tokenOut, and amount are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (slippage < 0 || slippage > 1) {
      return NextResponse.json(
        { error: 'Slippage must be between 0 and 1' },
        { status: 400 }
      );
    }

    try {
      validateTokenPair(tokenIn, tokenOut);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid token pair' },
        { status: 400 }
      );
    }

    const userId = req.user!.userId;

    const [order] = await db
      .insert(orders)
      .values({
        userId,
        tokenIn: tokenIn.toUpperCase(),
        tokenOut: tokenOut.toUpperCase(),
        amountIn: amount.toString(),
        status: 'pending',
      })
      .returning();

    await addOrderToQueue({
      orderId: order.id,
      userId,
      tokenIn: tokenIn.toUpperCase(),
      tokenOut: tokenOut.toUpperCase(),
      amountIn: amount,
      slippage,
    });

    const socketUrl =
      process.env.NEXT_PUBLIC_WS_URL || `ws://localhost:${process.env.PORT || 3000}`;

    const response: OrderExecuteResponse = {
      orderId: order.id,
      status: order.status as any,
      socketUrl,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Order execution error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);
