import { Raydium } from '@raydium-io/raydium-sdk-v2';
import { connection } from '@/lib/solana/connection';
import { DexQuote } from '@/types/order';
import Decimal from 'decimal.js';
import BN from 'bn.js';
import { PublicKey, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getTokenDecimals } from '@/lib/solana/tokens';

let raydiumInstance: Raydium | null = null;

async function getRaydiumInstance(userWallet: PublicKey): Promise<Raydium> {
  if (raydiumInstance) {
    return raydiumInstance;
  }

  raydiumInstance = await Raydium.load({
    owner: userWallet,
    connection,
    cluster: 'mainnet',
    disableFeatureCheck: true,
    disableLoadToken: true,
  });

  return raydiumInstance;
}

export async function getRaydiumQuote(
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: number
): Promise<DexQuote> {
  try {
    const systemWallet = Keypair.generate().publicKey;
    const raydium = await getRaydiumInstance(systemWallet);

    const tokenInDecimals = getTokenDecimals(tokenInAddress);
    const tokenOutDecimals = getTokenDecimals(tokenOutAddress);

    const poolInfo = await raydium.api.fetchPoolByMints({
      mint1: tokenInAddress,
      mint2: tokenOutAddress,
    });

    if (!poolInfo || !poolInfo.data || poolInfo.data.length === 0) {
      throw new Error('No Raydium pool found for this token pair');
    }

    // Find Standard AMM pool with highest liquidity (skip CPMM for now)
    const pools = poolInfo.data;
    const standardPools = pools.filter((p: any) => p.type === 'Standard');

    if (standardPools.length === 0) {
      throw new Error('No Standard AMM pool found for this token pair');
    }

    const pool = standardPools.reduce((best: any, current: any) => {
      const bestTvl = parseFloat(best.tvl || '0');
      const currentTvl = parseFloat(current.tvl || '0');
      return currentTvl > bestTvl ? current : best;
    }, standardPools[0]);

    // Pool price is quote/base ratio (e.g., USDC per SOL)
    // pool.mintA is base, pool.mintB is quote
    const price = parseFloat(pool.price || '0');
    const isTokenInBase = pool.mintA?.address === tokenInAddress;

    let outputAmount: number;
    if (isTokenInBase) {
      // Selling base token (e.g., SOL) for quote token (e.g., USDC)
      // price = quote per base, so output = input * price
      outputAmount = amountIn * price;
    } else {
      // Selling quote token (e.g., USDC) for base token (e.g., SOL)
      // price = quote per base, so output = input / price
      outputAmount = amountIn / price;
    }

    // Apply 0.25% fee
    outputAmount = outputAmount * 0.9975;

    console.log('Raydium quote details:', {
      pool: pool.id,
      price,
      isTokenInBase,
      tokenInDecimals,
      tokenOutDecimals,
      amountIn,
      outputAmount,
      mintA: pool.mintA?.address,
      mintB: pool.mintB?.address,
    });

    return {
      dex: 'raydium',
      outputAmount,
      priceImpact: 0,
      fee: 0.0025,
    };
  } catch (error) {
    console.error('Failed to get Raydium quote:', error);
    throw new Error(`Raydium quote failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function buildRaydiumSwapTransaction(
  userWalletAddress: string,
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: number,
  slippage: number
): Promise<string> {
  try {
    const userWallet = new PublicKey(userWalletAddress);
    const raydium = await getRaydiumInstance(userWallet);

    const tokenInDecimals = getTokenDecimals(tokenInAddress);
    const tokenOutDecimals = getTokenDecimals(tokenOutAddress);

    // Convert input to smallest units based on token decimals
    const inputAmount = new BN(new Decimal(amountIn).mul(10 ** tokenInDecimals).toFixed(0));

    const poolInfo = await raydium.api.fetchPoolByMints({
      mint1: tokenInAddress,
      mint2: tokenOutAddress,
    });

    if (!poolInfo || !poolInfo.data || poolInfo.data.length === 0) {
      throw new Error('No Raydium pool found for this token pair');
    }

    // Find Standard AMM pool only (CPMM has config fetch issues)
    const pools = poolInfo.data;
    const standardPools = pools.filter((p: any) => p.type === 'Standard');

    if (standardPools.length === 0) {
      throw new Error('No Standard AMM pool found for this token pair');
    }

    const pool = standardPools.reduce((best: any, current: any) => {
      const bestTvl = parseFloat(best.tvl || '0');
      const currentTvl = parseFloat(current.tvl || '0');
      return currentTvl > bestTvl ? current : best;
    }, standardPools[0]);

    const poolId = pool.id;

    // Standard AMM pool
    const poolKeys = await raydium.liquidity.getAmmPoolKeys(poolId);
    const rpcData = await raydium.liquidity.getRpcPoolInfo(poolId);

    const baseIn = tokenInAddress === poolKeys.mintA.address;

    // Calculate min amount out based on price and slippage
    const price = parseFloat(pool.price || '0');
    let expectedOut = baseIn ? amountIn * price : amountIn / price;
    expectedOut = expectedOut * (1 - slippage);

    // Convert to smallest units using output token decimals
    const minAmountOut = new BN(new Decimal(expectedOut).mul(10 ** tokenOutDecimals).toFixed(0));

    // Get recent blockhash for the transaction
    const { blockhash } = await connection.getLatestBlockhash();

    const { transaction } = await raydium.liquidity.swap({
      poolInfo: {
        ...pool,
        ...poolKeys,
        ...rpcData,
      } as any,
      amountIn: inputAmount,
      amountOut: minAmountOut,
      inputMint: tokenInAddress,
      fixedSide: 'in',
      config: {
        associatedOnly: false,
      },
    });

    // Handle both legacy Transaction and VersionedTransaction
    let serializedTx: Uint8Array;

    if (transaction instanceof VersionedTransaction) {
      // VersionedTransaction already has blockhash set
      serializedTx = transaction.serialize();
    } else {
      // Legacy Transaction needs blockhash and feePayer
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userWallet;
      serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
    }

    return Buffer.from(serializedTx).toString('base64');
  } catch (error) {
    console.error('Failed to execute Raydium swap:', error);
    throw new Error(`Raydium swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
