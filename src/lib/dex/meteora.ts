import { AmmImpl, MAINNET_POOL } from '@meteora-ag/dynamic-amm-sdk';
import { connection } from '@/lib/solana/connection';
import { PublicKey } from '@solana/web3.js';
import { DexQuote } from '@/types/order';
import Decimal from 'decimal.js';
import { BN } from '@coral-xyz/anchor';
import { getTokenSymbol, getTokenDecimals } from '@/lib/solana/tokens';

// Mainnet Meteora pool addresses from SDK constants
const METEORA_POOL_ADDRESSES: Record<string, string> = {
  'USDT-USDC': MAINNET_POOL.USDT_USDC.toBase58(),
  'USDC-SOL': MAINNET_POOL.USDC_SOL.toBase58(),
  'SOL-MSOL': MAINNET_POOL.SOL_MSOL.toBase58(),
};

function getMeteoraPoolAddress(tokenInAddress: string, tokenOutAddress: string): string | null {
  const tokenIn = getTokenSymbol(tokenInAddress);
  const tokenOut = getTokenSymbol(tokenOutAddress);

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

    const tokenInDecimals = getTokenDecimals(tokenInAddress);
    const tokenOutDecimals = getTokenDecimals(tokenOutAddress);

    const poolPubkey = new PublicKey(poolAddress);
    const ammPool = await AmmImpl.create(connection as any, poolPubkey);

    // Convert input amount to smallest units based on token decimals
    const inputAmount = new BN(new Decimal(amountIn).mul(10 ** tokenInDecimals).toFixed(0));
    const slippageBps = 100;

    const quote = ammPool.getSwapQuote(
      new PublicKey(tokenInAddress),
      inputAmount,
      slippageBps
    );

    // Convert output to human-readable based on output token decimals
    const outputAmount = quote.swapOutAmount.toNumber() / (10 ** tokenOutDecimals);
    const priceImpact = quote.priceImpact.toNumber();
    const fee = quote.fee.toNumber() / (10 ** tokenInDecimals);

    console.log('Meteora quote details:', {
      pool: poolAddress,
      tokenInDecimals,
      tokenOutDecimals,
      amountIn,
      inputAmountRaw: inputAmount.toString(),
      outputAmountRaw: quote.swapOutAmount.toString(),
      outputAmount,
    });

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

export async function buildMeteoraSwapTransaction(
  userWalletAddress: string,
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: number,
  slippage: number
): Promise<string> {
  try {
    const userWallet = new PublicKey(userWalletAddress);
    const poolAddress = getMeteoraPoolAddress(tokenInAddress, tokenOutAddress);

    if (!poolAddress) {
      throw new Error('No Meteora pool found for this token pair');
    }

    const tokenInDecimals = getTokenDecimals(tokenInAddress);

    const poolPubkey = new PublicKey(poolAddress);
    const ammPool = await AmmImpl.create(connection as any, poolPubkey);

    // Use correct decimals for input token
    const inputAmount = new BN(new Decimal(amountIn).mul(10 ** tokenInDecimals).toFixed(0));

    const quote = ammPool.getSwapQuote(
      new PublicKey(tokenInAddress),
      inputAmount,
      slippage * 100
    );

    const swapTx = await ammPool.swap(
      userWallet,
      new PublicKey(tokenInAddress),
      inputAmount,
      quote.minSwapOutAmount
    );

    const { blockhash } = await connection.getLatestBlockhash();
    swapTx.recentBlockhash = blockhash;
    swapTx.feePayer = userWallet;

    const serializedTx = swapTx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return Buffer.from(serializedTx).toString('base64');
  } catch (error) {
    console.error('Failed to execute Meteora swap:', error);
    throw new Error(`Meteora swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
