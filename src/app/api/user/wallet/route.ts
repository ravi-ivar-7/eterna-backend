import { NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';

async function handler(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const userId = req.user!.userId;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        username: true,
        walletAddress: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: user.id,
      username: user.username,
      walletAddress: user.walletAddress,
    });
  } catch (error) {
    console.error('Failed to fetch user wallet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
