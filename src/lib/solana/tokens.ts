import { PublicKey } from '@solana/web3.js';
import { connection } from './connection';

export const TOKEN_ADDRESSES: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
};

export function getTokenAddress(symbol: string): string {
  const address = TOKEN_ADDRESSES[symbol.toUpperCase()];
  if (!address) {
    throw new Error(`Token ${symbol} not supported`);
  }
  return address;
}

export function isNativeSOL(tokenAddress: string): boolean {
  return tokenAddress === TOKEN_ADDRESSES.SOL;
}

export async function getTokenBalance(
  walletAddress: string,
  tokenMint: string
): Promise<number> {
  try {
    if (isNativeSOL(tokenMint)) {
      const balance = await connection.getBalance(new PublicKey(walletAddress));
      return balance / 1e9;
    }

    const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');

    const tokenAccount = await getAssociatedTokenAddress(
      new PublicKey(tokenMint),
      new PublicKey(walletAddress)
    );

    const account = await getAccount(connection, tokenAccount);
    return Number(account.amount) / 1e6;
  } catch (error) {
    console.error('Failed to fetch token balance:', error);
    return 0;
  }
}

export function validateTokenPair(tokenIn: string, tokenOut: string): void {
  if (tokenIn === tokenOut) {
    throw new Error('Token input and output must be different');
  }

  const tokenInAddress = getTokenAddress(tokenIn);
  const tokenOutAddress = getTokenAddress(tokenOut);

  if (!tokenInAddress || !tokenOutAddress) {
    throw new Error('Invalid token pair');
  }
}
