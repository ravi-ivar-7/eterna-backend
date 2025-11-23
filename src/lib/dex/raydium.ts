import { Raydium, TxVersion, parseTokenAccountResp } from '@raydium-io/raydium-sdk-v2';
import { connection } from '@/lib/solana/connection';
import { getWallet } from '@/lib/solana/wallet';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { DexQuote } from '@/types/order';
import Decimal from 'decimal.js';

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
    blockhashCommitment: 'finalized',
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

    const inputAmount = new Decimal(amountIn).mul(1e9).toFixed(0);

    const { allPoolKeys } = await raydium.liquidity.getPoolInfoFromRpc({
      programId: raydium.program.AmmV4.programId,
    });

    const targetPool = allPoolKeys.find(
      (pool) =>
        (pool.baseMint.toString() === tokenInAddress &&
          pool.quoteMint.toString() === tokenOutAddress) ||
        (pool.baseMint.toString() === tokenOutAddress &&
          pool.quoteMint.toString() === tokenInAddress)
    );

    if (!targetPool) {
      throw new Error('No Raydium pool found for this token pair');
    }

    const { execute, extInfo } = await raydium.liquidity.swap({
      poolInfo: targetPool,
      amountIn: inputAmount,
      amountOut: '0',
      fixedSide: 'in',
      inputMint: tokenInAddress,
      txVersion: TxVersion.V0,
      config: {
        bypassAssociatedCheck: false,
      },
    });

    const outputAmount = Number(extInfo.amountOut) / 1e9;
    const priceImpact = Number(extInfo.priceImpact || 0);
    const fee = Number(extInfo.fee || 0) / 1e9;

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
    const wallet = getWallet();

    const inputAmount = new Decimal(amountIn).mul(1e9).toFixed(0);

    const { allPoolKeys } = await raydium.liquidity.getPoolInfoFromRpc({
      programId: raydium.program.AmmV4.programId,
    });

    const targetPool = allPoolKeys.find(
      (pool) =>
        (pool.baseMint.toString() === tokenInAddress &&
          pool.quoteMint.toString() === tokenOutAddress) ||
        (pool.baseMint.toString() === tokenOutAddress &&
          pool.quoteMint.toString() === tokenInAddress)
    );

    if (!targetPool) {
      throw new Error('No Raydium pool found for this token pair');
    }

    const { execute } = await raydium.liquidity.swap({
      poolInfo: targetPool,
      amountIn: inputAmount,
      amountOut: '0',
      fixedSide: 'in',
      inputMint: tokenInAddress,
      txVersion: TxVersion.V0,
      config: {
        bypassAssociatedCheck: false,
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
