export type OrderStatus = 'pending' | 'waiting_for_price' | 'confirmed' | 'failed';

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
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: number;
  dexQuotes?: {
    raydium?: number;
    meteora?: number;
    jupiter?: number;
  };
  selectedDex?: string;
  unsignedTransaction?: string;
  txHash?: string;
  executionPrice?: number;
  amountOut?: string;
  error?: string;
}

export interface DexQuote {
  dex: 'raydium' | 'meteora' | 'jupiter';
  outputAmount: number;
  priceImpact: number;
  fee?: number;
}

export interface Order {
  id: string;
  userId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string | null;
  status: string;
  selectedDex: string | null;
  txHash: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
