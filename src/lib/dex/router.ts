import { getRaydiumQuote, executeRaydiumSwap } from './raydium';
import { getMeteoraQuote, executeMeteoraSwap } from './meteora';
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

  if (!raydiumQuote && !meteoraQuote) {
    throw new Error('No valid quotes available from any DEX');
  }

  if (!raydiumQuote) {
    console.log('Raydium quote failed, using Meteora');
    return {
      selectedDex: 'meteora',
      outputAmount: meteoraQuote!.outputAmount,
      raydiumQuote: null,
      meteoraQuote,
    };
  }

  if (!meteoraQuote) {
    console.log('Meteora quote failed, using Raydium');
    return {
      selectedDex: 'raydium',
      outputAmount: raydiumQuote.outputAmount,
      raydiumQuote,
      meteoraQuote: null,
    };
  }

  const selectedDex =
    raydiumQuote.outputAmount > meteoraQuote.outputAmount ? 'raydium' : 'meteora';

  console.log('DEX Routing Decision:', {
    raydiumOutput: raydiumQuote.outputAmount,
    meteoraOutput: meteoraQuote.outputAmount,
    selected: selectedDex,
  });

  return {
    selectedDex,
    outputAmount:
      selectedDex === 'raydium'
        ? raydiumQuote.outputAmount
        : meteoraQuote.outputAmount,
    raydiumQuote,
    meteoraQuote,
  };
}

export async function executeSwap(
  dex: 'raydium' | 'meteora',
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: number,
  slippage: number
): Promise<string> {
  if (dex === 'raydium') {
    return executeRaydiumSwap(tokenInAddress, tokenOutAddress, amountIn, slippage);
  } else {
    return executeMeteoraSwap(tokenInAddress, tokenOutAddress, amountIn, slippage);
  }
}
