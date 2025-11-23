export type OrderStatus = 'pending' | 'routing' | 'building' | 'submitted' | 'confirmed' | 'failed';

export interface OrderJobData {
  orderId: string;
  userId: number;
  userWalletAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  slippage: number;
}

export interface OrderExecuteRequest {
  tokenIn: string;
  tokenOut: string;
  amount: number;
  slippage?: number;
}

export interface OrderExecuteResponse {
  orderId: string;
  status: OrderStatus;
  socketUrl: string;
}

export interface OrderUpdate {
  orderId: string;
  status: OrderStatus;
  dexQuotes?: {
    raydium?: number;
    meteora?: number;
  };
  selectedDex?: string;
  unsignedTransaction?: string;
  txHash?: string;
  executionPrice?: number;
  error?: string;
}

export interface DexQuote {
  dex: 'raydium' | 'meteora';
  outputAmount: number;
  priceImpact: number;
  fee: number;
}
