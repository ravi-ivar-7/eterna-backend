import { NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

interface ConnectWalletRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

async function handler(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const body: ConnectWalletRequest = await req.json();
    const { walletAddress, signature, message } = body;

    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: 'walletAddress, signature, and message are required' },
        { status: 400 }
      );
    }

    try {
      const publicKey = new PublicKey(walletAddress);
      const signatureBytes = bs58.decode(signature);
      const messageBytes = new TextEncoder().encode(message);

      const verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );

      if (!verified) {
        return NextResponse.json(
          { error: 'Invalid signature. Wallet verification failed.' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid wallet address or signature format' },
        { status: 400 }
      );
    }

    const userId = req.user!.userId;

    const existingWallet = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    if (existingWallet && existingWallet.id !== userId) {
      return NextResponse.json(
        { error: 'Wallet address already connected to another account' },
        { status: 409 }
      );
    }

    await db
      .update(users)
      .set({ walletAddress })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      walletAddress,
    });
  } catch (error) {
    console.error('Wallet connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);
