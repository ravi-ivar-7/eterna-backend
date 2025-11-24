import { NextRequest, NextResponse } from 'next/server';
import { db, orders } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';

async function handler(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const userId = req.user!.userId;

    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      orderBy: [desc(orders.createdAt)],
      limit: 50,
    });

    return NextResponse.json({ orders: userOrders }, { status: 200 });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
