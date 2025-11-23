import { AmmImpl } from '@meteora-ag/dynamic-amm-sdk';
import { connection } from '@/lib/solana/connection';
import { getWallet } from '@/lib/solana/wallet';
import { PublicKey, Transaction } from '@solana/web3.js';
import { DexQuote } from '@/types/order';
import Decimal from 'decimal.js';

const METEORA_POOL_ADDRESSES: Record<string, string> = {
  'SOL-USDC': '5CX2qVqPbBZuiDQHJKjqp4KBdkHzJYNHNjjNrKKzQaVs',
  'USDC-USDT': 'EjfvJeP3f4XErYMAxs8BAeB8trE1KLy6YbxZQN4i6aRB',
};

function getMeteoraPoolAddress(tokenIn: string, tokenOut: string): string | null {
  const key1 = `${tokenIn}-${tokenOut}`;
  const key2 = `${tokenOut}-${tokenIn}`;
  return METEORA_POOL_ADDRESSES[key1] || METEORA_POOL_ADDRESSES[key2] || null;
}

export async function getMeteoraQuote(
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: number
): Promise<DexQuote> {
  try {
    const poolAddress = getMeteoraPoolAddress(tokenInAddress, tokenOutAddress);

    if (!poolAddress) {
      throw new Error('No Meteora pool found for this token pair');
    }

    const poolPubkey = new PublicKey(poolAddress);
    const ammPool = await AmmImpl.create(connection, poolPubkey);

    const inputAmount = new Decimal(amountIn).mul(1e9).toNumber();
    const slippage = 1;

    const quote = ammPool.getSwapQuote(
      new PublicKey(tokenInAddress),
      BigInt(Math.floor(inputAmount)),
      slippage
    );

    const outputAmount = Number(quote.outAmount) / 1e9;
    const priceImpact = quote.priceImpact || 0;
    const fee = Number(quote.fee || 0) / 1e9;

    return {
      dex: 'meteora',
      outputAmount,
      priceImpact,
      fee,
    };
  } catch (error) {
    console.error('Failed to get Meteora quote:', error);
    throw new Error(`Meteora quote failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function executeMeteoraSwap(
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: number,
  slippage: number
): Promise<string> {
  try {
    const wallet = getWallet();
    const poolAddress = getMeteoraPoolAddress(tokenInAddress, tokenOutAddress);

    if (!poolAddress) {
      throw new Error('No Meteora pool found for this token pair');
    }

    const poolPubkey = new PublicKey(poolAddress);
    const ammPool = await AmmImpl.create(connection, poolPubkey);

    const inputAmount = new Decimal(amountIn).mul(1e9).toNumber();
    const slippageBps = slippage * 10000;

    const swapTx = await ammPool.swap(
      wallet.publicKey,
      new PublicKey(tokenInAddress),
      BigInt(Math.floor(inputAmount)),
      BigInt(0),
      slippageBps
    );

    const transaction = new Transaction().add(swapTx);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    transaction.sign(wallet);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    console.log('Meteora swap executed:', signature);
    return signature;
  } catch (error) {
    console.error('Failed to execute Meteora swap:', error);
    throw new Error(`Meteora swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
