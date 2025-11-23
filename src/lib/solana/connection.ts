import { Connection, ConnectionConfig, Commitment } from '@solana/web3.js';

if (!process.env.SOLANA_RPC_URL) {
  throw new Error('SOLANA_RPC_URL environment variable is not set');
}

const COMMITMENT_LEVEL: Commitment = 'confirmed';

const connectionConfig: ConnectionConfig = {
  commitment: COMMITMENT_LEVEL,
  confirmTransactionInitialTimeout: 60000,
};

export const connection = new Connection(
  process.env.SOLANA_RPC_URL,
  connectionConfig
);

export async function getConnectionHealth(): Promise<{
  isHealthy: boolean;
  blockHeight?: number;
  error?: string;
}> {
  try {
    const blockHeight = await connection.getBlockHeight();
    return {
      isHealthy: true,
      blockHeight,
    };
  } catch (error) {
    return {
      isHealthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getSolanaBalance(publicKey: string): Promise<number> {
  try {
    const balance = await connection.getBalance(
      new (await import('@solana/web3.js')).PublicKey(publicKey)
    );
    return balance / 1e9;
  } catch (error) {
    console.error('Failed to fetch Solana balance:', error);
    throw new Error('Failed to fetch balance');
  }
}
