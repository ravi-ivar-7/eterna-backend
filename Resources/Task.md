# Backend Task 2: Order Execution Engine

## Problem Statement

Build an order execution engine that processes **Market Orders** with DEX routing and WebSocket status updates using **real devnet execution**.

## Implementation Choice

### Order Type: Market Order
**Immediate execution at current best price**

### Execution Mode: Real Devnet Execution
- Use actual Raydium/Meteora SDKs
- Execute real trades on Solana devnet
- Handle network latency and failures
- Provide transaction proof via Solana Explorer

### Why Market Order?
Market orders represent 80%+ of real DEX trading volume and allow focus on the core challenge: building a production-grade routing engine that compares live prices across multiple DEXs and executes optimally within milliseconds. See [OrderType.md](OrderType.md) for detailed rationale.

## How It Works - Order Execution Flow

### 1. Order Submission
- User submits order via `POST /api/orders/execute`
- API validates order and returns `orderId`
- Client establishes WebSocket connection for live updates
- User must be authenticated (session token required)

### 2. DEX Routing
- System fetches quotes from both Raydium and Meteora pools
- Compares prices and selects best execution venue
- Routes order to DEX with better price/liquidity
- Logs routing decision for transparency

### 3. Execution Progress (via WebSocket)
Order status updates streamed in real-time:
- **pending** - Order received and queued
- **routing** - Comparing DEX prices
- **building** - Creating transaction
- **submitted** - Transaction sent to network
- **confirmed** - Transaction successful (includes txHash)
- **failed** - If any step fails (includes error)

### 4. Transaction Settlement
- Executes swap on chosen DEX (Raydium/Meteora)
- Handles slippage protection (1% default)
- Returns final execution price and transaction hash
- Stores order history in PostgreSQL

## Core Requirements

### 1. User Authentication
- Simple username/password authentication
- Session management with Redis
- Protected API endpoints with Bearer token

### 2. DEX Router Implementation
- Query both Raydium and Meteora for quotes
- Route to best price automatically
- Handle wrapped SOL for native token swaps
- Log routing decisions for transparency

### 3. HTTP + WebSocket Pattern
- REST endpoint for order submission
- WebSocket connection for status streaming
- Real-time updates < 100ms latency

### 4. Concurrent Processing
- Queue system managing up to 10 concurrent orders
- Process 100 orders/minute
- Exponential back-off retry (<=3 attempts)
- If unsuccessful, emit "failed" status and persist failure reason

## Tech Stack

### Core
- **Next.js 14** + **TypeScript** - Full-stack framework
- **Node.js 18+** - Runtime environment

### Database
- **PostgreSQL** - Order history, user accounts
- **Drizzle ORM** - Type-safe database operations
- **Redis** - Session management, active orders cache

### Queue & Jobs
- **BullMQ** + **Redis** - Distributed order queue

### Blockchain
- **@solana/web3.js** - Solana devnet interaction
- **@solana/spl-token** - Token operations
- **@raydium-io/raydium-sdk-v2** - Raydium DEX
- **@meteora-ag/dynamic-amm-sdk** - Meteora DEX

### Real-time
- **Socket.io** - WebSocket server/client

### Deployment
- **Render** - Hosting (Next.js, PostgreSQL, Redis, Worker)
- **Docker** - Local development environment

## Resources & References

### Solana
- Devnet Faucet: https://faucet.solana.com
- Explorer: https://explorer.solana.com/?cluster=devnet

### DEX Documentation
- Raydium SDK: https://github.com/raydium-io/raydium-sdk-V2-demo
- Meteora Docs: https://docs.meteora.ag/

### Libraries
- @solana/web3.js - Solana blockchain interaction
- @solana/spl-token - Token operations
- @raydium-io/raydium-sdk-v2 - Raydium integration
- @meteora-ag/dynamic-amm-sdk - Meteora integration

## Evaluation Criteria

1. **DEX Router** - Price comparison and routing logic
2. **WebSocket Streaming** - Real-time order lifecycle updates
3. **Queue Management** - Concurrent order processing
4. **Error Handling** - Retry logic and failure management
5. **Code Organization** - Clean architecture and documentation
6. **Authentication** - Secure user account management
7. **Testing** - Comprehensive test coverage (>=10 tests)

## Deliverables

### Required (All Must Be Completed)

1. **GitHub Repository**
   - Clean commit history
   - API with order execution and routing
   - WebSocket status updates
   - Real execution with transaction proofs (Solana Explorer links)

2. **Documentation**
   - README with setup instructions
   - Design decisions explained (Market Order choice)
   - Architecture overview
   - API documentation

3. **Deployment**
   - Deploy to Render (free tier)
   - Public URL included in README
   - Keep-alive cron job configured (every 10 min)

4. **Demo Video** (1-2 minutes on YouTube)
   Must show:
   - Order flow through system
   - Design decisions explanation
   - 3-5 orders submitted simultaneously
   - WebSocket showing all status updates (pending -> routing -> confirmed)
   - DEX routing decisions in logs/console
   - Queue processing multiple orders

5. **Testing & API Collection**
   - Postman/Insomnia collection for all endpoints
   - >=10 unit/integration tests covering:
     - Routing logic
     - Queue behavior
     - WebSocket lifecycle
     - Authentication flows

**Note:** All deliverables are **required**. Application will be considered incomplete if any deliverable is missing.

## Focus Areas

- Demonstrate solid architecture and routing logic
- Real-time updates with low latency
- Robust error handling and retry mechanisms
- Production-ready code quality
- Clear documentation and design rationale

## Raydium Swap Pattern (Reference)

```typescript
// Initialize SDK
const raydium = await Raydium.load({
  owner: wallet,
  connection,
  cluster: 'devnet',
  blockhashCommitment: 'finalized'
});

// Get pool info and calculate swap
const { poolInfo, poolKeys, rpcData } = await raydium.cpmm.getPoolInfoFromRpc(poolId);
const swapResult = CurveCalculator.swap(
  inputAmount,
  baseReserve,
  quoteReserve,
  tradeFeeRate
);

// Execute swap
const { execute } = await raydium.cpmm.swap({
  poolInfo,
  inputAmount,
  swapResult,
  slippage: 0.01
});

const { txId } = await execute({ sendAndConfirm: true });
```

## Meteora Swap Pattern (Reference)

```typescript
// Initialize SDK
const dynamicAmmSdk = await AmmImpl.create(connection, poolPubkey);

// Get quote
const quote = dynamicAmmSdk.getSwapQuote(
  tokenMint,
  amountIn,
  slippageTolerance
);

// For native SOL, wrap first
const wrapSolTx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: wrappedSolAccount,
    lamports
  }),
  createSyncNativeInstruction(wrappedSolAccount)
);

// Execute swap
const swapTx = await dynamicAmmSdk.swap(
  wallet.publicKey,
  tokenAccount,
  amountIn,
  minAmountOut
);
```
