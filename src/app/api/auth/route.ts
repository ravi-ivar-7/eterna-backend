import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import { AuthRequest, AuthResponse } from '@/types/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: AuthRequest = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 50 characters' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUser) {
      const isValidPassword = await verifyPassword(password, existingUser.passwordHash);

      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const token = generateToken({
        userId: existingUser.id,
        username: existingUser.username,
      });

      const response: AuthResponse = {
        success: true,
        userId: existingUser.id,
        username: existingUser.username,
        token,
      };

      return NextResponse.json(response, { status: 200 });
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        passwordHash,
      })
      .returning();

    const token = generateToken({
      userId: newUser.id,
      username: newUser.username,
    });

    const response: AuthResponse = {
      success: true,
      userId: newUser.id,
      username: newUser.username,
      token,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
