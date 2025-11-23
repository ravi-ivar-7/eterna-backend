import { Worker, Job } from 'bullmq';
import { db, orders } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { OrderJobData, OrderStatus } from '@/types/order';
import { getBestQuote, executeSwap } from '@/lib/dex/router';
import { getTokenAddress } from '@/lib/solana/tokens';
import { emitOrderUpdate } from '@/lib/websocket/server';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

const connection = {
  host: new URL(process.env.REDIS_URL).hostname,
  port: parseInt(new URL(process.env.REDIS_URL).port) || 6379,
  password: new URL(process.env.REDIS_URL).password || undefined,
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
  const { orderId, userId, tokenIn, tokenOut, amountIn, slippage } = job.data;

  console.log(`Processing order ${orderId}`);

  try {
    await updateOrderStatus(orderId, 'routing');
    emitOrderUpdate(orderId, {
      orderId,
      status: 'routing',
    });

    const tokenInAddress = getTokenAddress(tokenIn);
    const tokenOutAddress = getTokenAddress(tokenOut);

    const bestQuote = await getBestQuote(tokenInAddress, tokenOutAddress, amountIn);

    emitOrderUpdate(orderId, {
      orderId,
      status: 'routing',
      dexQuotes: {
        raydium: bestQuote.raydiumQuote?.outputAmount,
        meteora: bestQuote.meteoraQuote?.outputAmount,
      },
      selectedDex: bestQuote.selectedDex,
    });

    await updateOrderStatus(orderId, 'building', {
      selectedDex: bestQuote.selectedDex,
      amountOut: bestQuote.outputAmount.toString(),
    });

    emitOrderUpdate(orderId, {
      orderId,
      status: 'building',
      selectedDex: bestQuote.selectedDex,
    });

    const txHash = await executeSwap(
      bestQuote.selectedDex,
      tokenInAddress,
      tokenOutAddress,
      amountIn,
      slippage
    );

    await updateOrderStatus(orderId, 'submitted', {
      txHash,
    });

    emitOrderUpdate(orderId, {
      orderId,
      status: 'submitted',
      txHash,
    });

    await updateOrderStatus(orderId, 'confirmed', {
      txHash,
    });

    emitOrderUpdate(orderId, {
      orderId,
      status: 'confirmed',
      txHash,
      executionPrice: bestQuote.outputAmount / amountIn,
      selectedDex: bestQuote.selectedDex,
    });

    console.log(`Order ${orderId} completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Order ${orderId} failed:`, errorMessage);

    await updateOrderStatus(orderId, 'failed', {
      error: errorMessage,
    });

    emitOrderUpdate(orderId, {
      orderId,
      status: 'failed',
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
