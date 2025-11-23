import { Raydium } from '@raydium-io/raydium-sdk-v2';
import { connection } from '@/lib/solana/connection';
import { getWallet } from '@/lib/solana/wallet';
import { DexQuote } from '@/types/order';
import Decimal from 'decimal.js';
import BN from 'bn.js';

let raydiumInstance: Raydium | null = null;

async function getRaydiumInstance(): Promise<Raydium> {
  if (raydiumInstance) {
    return raydiumInstance;
  }

  const wallet = getWallet();

  raydiumInstance = await Raydium.load({
    owner: wallet,
    connection,
    cluster: 'devnet',
    disableFeatureCheck: true,
    disableLoadToken: false,
  });

  console.log('Raydium SDK initialized');
  return raydiumInstance;
}

export async function getRaydiumQuote(
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: number
): Promise<DexQuote> {
  try {
    const raydium = await getRaydiumInstance();

    const inputAmount = new BN(new Decimal(amountIn).mul(1e9).toFixed(0));

    const poolInfo = await raydium.api.fetchPoolByMints({
      mint1: tokenInAddress,
      mint2: tokenOutAddress,
    });

    if (!poolInfo || !poolInfo.data || poolInfo.data.length === 0) {
      throw new Error('No Raydium pool found for this token pair');
    }

    const pool = poolInfo.data[0];

    if (pool.type !== 'Standard') {
      throw new Error('Only standard AMM pools are supported');
    }

    const { amountOut } = raydium.liquidity.computeAmountOut({
      poolInfo: pool as any,
      amountIn: inputAmount,
      mintIn: tokenInAddress,
      mintOut: tokenOutAddress,
      slippage: 1,
    });

    const outputAmount = amountOut.toNumber() / 1e9;
    const priceImpact = 0;
    const fee = 0;

    return {
      dex: 'raydium',
      outputAmount,
      priceImpact,
      fee,
    };
  } catch (error) {
    console.error('Failed to get Raydium quote:', error);
    throw new Error(`Raydium quote failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function executeRaydiumSwap(
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: number,
  slippage: number
): Promise<string> {
  try {
    const raydium = await getRaydiumInstance();

    const inputAmount = new BN(new Decimal(amountIn).mul(1e9).toFixed(0));

    const poolInfo = await raydium.api.fetchPoolByMints({
      mint1: tokenInAddress,
      mint2: tokenOutAddress,
    });

    if (!poolInfo || !poolInfo.data || poolInfo.data.length === 0) {
      throw new Error('No Raydium pool found for this token pair');
    }

    const pool = poolInfo.data[0];

    if (pool.type !== 'Standard') {
      throw new Error('Only standard AMM pools are supported');
    }

    const { amountOut, minAmountOut } = raydium.liquidity.computeAmountOut({
      poolInfo: pool as any,
      amountIn: inputAmount,
      mintIn: tokenInAddress,
      mintOut: tokenOutAddress,
      slippage: slippage,
    });

    const { execute } = await raydium.liquidity.swap({
      poolInfo: pool as any,
      amountIn: new BN(inputAmount),
      amountOut: new BN(minAmountOut),
      inputMint: tokenInAddress,
      fixedSide: 'in',
      config: {
        associatedOnly: false,
      },
    });

    const { txId } = await execute({ sendAndConfirm: true });

    console.log('Raydium swap executed:', txId);
    return txId;
  } catch (error) {
    console.error('Failed to execute Raydium swap:', error);
    throw new Error(`Raydium swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
