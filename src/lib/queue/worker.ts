import { Worker, Job } from 'bullmq';
import { db, orders } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { OrderJobData, OrderStatus } from '@/types/order';
import { getBestQuote, buildSwapTransaction } from '@/lib/dex/router';
import { getTokenAddress } from '@/lib/solana/tokens';
import { publishOrderUpdate } from '@/lib/redis/pubsub';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

const redisUrl = new URL(process.env.REDIS_URL);
const username = redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined;
const password = redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined;

const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  username,
  password,
  ...(process.env.REDIS_URL.startsWith('rediss://') && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
};

async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  updates: Partial<{
    selectedDex: string;
    amountOut: string;
    txHash: string;
    error: string;
  }> = {}
): Promise<void> {
  await db
    .update(orders)
    .set({
      status,
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
}

async function processOrder(job: Job<OrderJobData>): Promise<void> {
  const { orderId, userId, userWalletAddress, tokenIn, tokenOut, amountIn, slippage } = job.data;

  console.log(`Processing order ${orderId} for user wallet ${userWalletAddress}`);

  // Small delay to ensure client has time to subscribe to Socket.IO room
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // Publish waiting_for_price status
    publishOrderUpdate(orderId, {
      orderId,
      status: 'waiting_for_price',
      tokenIn,
      tokenOut,
      amountIn,
    });

    // Get quotes from all DEXes
    console.log(`Order ${orderId} - Getting quotes...`);
    const tokenInAddress = getTokenAddress(tokenIn);
    const tokenOutAddress = getTokenAddress(tokenOut);
    const bestQuote = await getBestQuote(tokenInAddress, tokenOutAddress, amountIn);

    console.log(`Order ${orderId} - Best quote: ${bestQuote.selectedDex} at ${bestQuote.outputAmount}`);

    // Build transaction
    await buildSwapTransaction(
      userWalletAddress,
      bestQuote.selectedDex,
      tokenInAddress,
      tokenOutAddress,
      amountIn,
      slippage
    );

    // Execute
    console.log(`Order ${orderId} - Executing at best price...`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Store result
    const fakeTxHash = `${orderId.slice(0, 8)}tx${Date.now()}`;

    await updateOrderStatus(orderId, 'confirmed', {
      selectedDex: bestQuote.selectedDex,
      amountOut: bestQuote.outputAmount.toString(),
      txHash: fakeTxHash,
    });

    // Publish confirmed
    publishOrderUpdate(orderId, {
      orderId,
      status: 'confirmed',
      tokenIn,
      tokenOut,
      amountIn,
      dexQuotes: {
        raydium: bestQuote.raydiumQuote?.outputAmount,
        meteora: bestQuote.meteoraQuote?.outputAmount,
      },
      selectedDex: bestQuote.selectedDex,
      executionPrice: bestQuote.outputAmount,
      txHash: fakeTxHash,
    });

    console.log(`Order ${orderId} - COMPLETED. TX: ${fakeTxHash}, DEX: ${bestQuote.selectedDex}, Amount: ${bestQuote.outputAmount}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Order ${orderId} FAILED:`, errorMessage);

    await updateOrderStatus(orderId, 'failed', {
      error: errorMessage,
    });

    publishOrderUpdate(orderId, {
      orderId,
      status: 'failed',
      tokenIn,
      tokenOut,
      amountIn,
      error: errorMessage,
    });

    throw error;
  }
}

export const orderWorker = new Worker<OrderJobData>(
  'order-queue',
  processOrder,
  {
    connection,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 60000,
    },
  }
);

orderWorker.on('completed', (job) => {
  console.log(`Worker completed job ${job.id}`);
});

orderWorker.on('failed', (job, err) => {
  console.error(`Worker failed job ${job?.id}:`, err.message);
});

orderWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('Order worker started with concurrency 10');

export default orderWorker;
