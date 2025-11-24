import { NextResponse } from 'next/server';
import { db, orders } from '@/lib/db';
import { inArray } from 'drizzle-orm';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';

async function handler(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { orderIds } = body as { orderIds: string[] };

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'orderIds array is required' },
        { status: 400 }
      );
    }

    const userId = req.user!.userId;

    // Delete orders - only user's own orders
    await db
      .delete(orders)
      .where(inArray(orders.id, orderIds));

    console.log(`Deleted ${orderIds.length} orders for user ${userId}`);

    return NextResponse.json({
      success: true,
      deletedCount: orderIds.length
    });
  } catch (error) {
    console.error('Order deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);
