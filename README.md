# Eterna DEX Order Execution Engine

This project is a real-time order execution engine for Solana DEXs, specifically Raydium and Meteora, running on Devnet. It is built using Next.js, Node.js, BullMQ, and Redis.

## Architecture

The system follows a decoupled architecture:

1.  **Frontend (Next.js)**
    Provides the user interface for order submission and tracking. It connects to Solana wallets (Phantom/Solflare) and listens for real-time updates via Socket.IO.

2.  **API Layer (Next.js API Routes)**
    Handles authentication and order submission. It pushes orders to a Redis-backed queue (BullMQ).

3.  **Worker Service (Node.js)**
    Consumes jobs from the queue.
    *   **Routing Engine**: Queries Raydium and Meteora SDKs for quotes.
    *   **Execution Engine**: Builds and submits transactions to Solana Devnet.
    *   **Status Publisher**: Publishes updates to Redis Pub/Sub.

4.  **Real-time Service (Socket.IO)**
    Subscribes to Redis Pub/Sub and broadcasts updates to connected frontend clients.

## Design Decisions

### Why Market Orders?
We focused on Market Orders to prioritize immediate execution and routing efficiency. Limit orders require an order book or complex monitoring infrastructure, whereas market orders allow us to focus on the core challenge of live price comparison and atomic execution across multiple liquidity sources.

### Queue-Based Processing (BullMQ)
Directly executing orders in the API route would lead to timeouts and poor user experience during network congestion. We used BullMQ to offload heavy lifting (SDK initialization, quoting, signing) to a background worker. This also allows us to handle concurrency limits and implement automatic retries for failed transactions.

### Optimistic UI & Real-time Updates
To ensure a responsive experience, the UI optimistically updates status based on user actions. WebSockets push the source-of-truth updates from the worker, ensuring the user always sees the actual state of their trade on the blockchain.

### Dual-DEX Routing
We integrated both Raydium and Meteora to demonstrate true aggregation. The worker queries both SDKs in parallel and selects the route with the highest output amount, ensuring best execution for the user.

## Tech Stack

*   **Frontend**: Next.js 14, Tailwind CSS, Recharts
*   **Backend**: Node.js, Express (for WebSocket server)
*   **Database**: PostgreSQL (Drizzle ORM), Redis (Queue & Pub/Sub)
*   **Blockchain**: @solana/web3.js, @raydium-io/raydium-sdk-v2, @meteora-ag/dynamic-amm-sdk

## Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/ravi-ivar-7/eterna-backend
    cd eterna-backend
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file with the following:
    ```env
    DATABASE_URL=postgresql://...
    REDIS_URL=redis://...
    SOLANA_RPC_URL=https://api.devnet.solana.com
    ```

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```

5.  **Start the Worker** (in a separate terminal)
    ```bash
    npm run worker
    ```

## Testing

Run the test suite to verify routing and queue logic:
```bash
npm test
```
