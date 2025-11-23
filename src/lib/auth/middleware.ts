import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from './jwt';
import { JWTPayload } from '@/types/auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required. Please provide a valid token.' },
          { status: 401 }
        );
      }

      const user = verifyToken(token);

      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = user;

      return handler(authenticatedReq);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  };
}
