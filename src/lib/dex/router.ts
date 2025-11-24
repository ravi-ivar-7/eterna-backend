import { getRaydiumQuote, buildRaydiumSwapTransaction } from './raydium';
import { getMeteoraQuote, buildMeteoraSwapTransaction } from './meteora';
import { DexQuote } from '@/types/order';

export interface BestQuote {
  selectedDex: 'raydium' | 'meteora';
  outputAmount: number;
  raydiumQuote: DexQuote | null;
  meteoraQuote: DexQuote | null;
}

export async function getBestQuote(
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: number
): Promise<BestQuote> {
  const [raydiumResult, meteoraResult] = await Promise.allSettled([
    getRaydiumQuote(tokenInAddress, tokenOutAddress, amountIn),
    getMeteoraQuote(tokenInAddress, tokenOutAddress, amountIn),
  ]);

  const raydiumQuote =
    raydiumResult.status === 'fulfilled' ? raydiumResult.value : null;
  const meteoraQuote =
    meteoraResult.status === 'fulfilled' ? meteoraResult.value : null;

  if (raydiumResult.status === 'rejected') {
    console.log('Raydium quote failed:', (raydiumResult.reason as Error)?.message);
  }
  if (meteoraResult.status === 'rejected') {
    console.log('Meteora quote failed:', (meteoraResult.reason as Error)?.message);
  }

  if (!raydiumQuote && !meteoraQuote) {
    throw new Error('No valid quotes available from any DEX');
  }

  const quotes: { dex: 'raydium' | 'meteora'; quote: DexQuote }[] = [];
  if (raydiumQuote) quotes.push({ dex: 'raydium', quote: raydiumQuote });
  if (meteoraQuote) quotes.push({ dex: 'meteora', quote: meteoraQuote });

  quotes.sort((a, b) => b.quote.outputAmount - a.quote.outputAmount);
  const best = quotes[0];

  console.log('DEX Routing Decision:', {
    raydiumOutput: raydiumQuote?.outputAmount ?? 'N/A',
    meteoraOutput: meteoraQuote?.outputAmount ?? 'N/A',
    selected: best.dex,
  });

  return {
    selectedDex: best.dex,
    outputAmount: best.quote.outputAmount,
    raydiumQuote,
    meteoraQuote,
  };
}

export async function buildSwapTransaction(
  userWalletAddress: string,
  dex: 'raydium' | 'meteora',
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: number,
  slippage: number
): Promise<string> {
  if (dex === 'raydium') {
    return buildRaydiumSwapTransaction(userWalletAddress, tokenInAddress, tokenOutAddress, amountIn, slippage);
  }
  return buildMeteoraSwapTransaction(userWalletAddress, tokenInAddress, tokenOutAddress, amountIn, slippage);
}
