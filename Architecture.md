# Order Execution Engine - Architecture

## Tech Stack

### Core Framework
- **Next.js 15** - Full-stack framework (API routes + frontend)
- **TypeScript** - Type safety and better DX
- **Node.js 20+** - Runtime environment

### Database & Caching
- **PostgreSQL** - Order history, transaction records, user accounts
- **Redis** - Queue backend, active orders cache
- **Drizzle ORM** - Type-safe ORM for database operations

### Queue & Background Jobs
- **BullMQ** - Distributed job queue for order processing
- **Redis** - Queue backend storage

### Blockchain Integration
- **@solana/web3.js** - Solana blockchain interaction
- **@solana/spl-token** - Token operations
- **@raydium-io/raydium-sdk-v2** - Raydium DEX integration
- **@meteora-ag/dynamic-amm-sdk** - Meteora DEX integration

### Real-time Communication
- **Socket.io** - WebSocket server for order status updates
- **Socket.io-client** - Client-side WebSocket connection

### Authentication
- **jsonwebtoken** - JWT token generation and verification

### Testing & Quality
- **Jest** - Unit and integration testing
- **Supertest** - API endpoint testing
- **@testing-library/react** - Frontend component testing

### Deployment
- **Render** - Hosting (Next.js app, PostgreSQL, Redis, Worker)
- **Docker** - Containerization for consistent environments
- **GitHub Actions** - CI/CD pipeline

## System Design

### High-Level Architecture

```
+-----------------------------------------------------------+
|                    Client (Browser)                       |
|                                                           |
|  +----------------+         +------------------+          |
|  |  Next.js UI    |<--------|  Socket.io Client|          |
|  +----------------+         +------------------+          |
+---------------+----------------------+--------------------+
                | HTTP POST            | WebSocket
                |                      |
+---------------v----------------------v--------------------+
|              Next.js Server (Render)                      |
|                                                           |
|  +---------------------+    +------------------+          |
|  |  API Routes         |    |  Socket.io Server|          |
|  |  /api/orders/execute|    |  (Status Updates)|          |
|  +---------+-----------+    +---------^--------+          |
|            |                          |                   |
|            | Create Job               | Emit Events       |
|            |                          |                   |
|  +---------v--------------------------+-----------+       |
|  |           BullMQ Queue (Redis)                 |       |
|  |  - Job: { orderId, tokenIn, tokenOut, ... }    |       |
|  +---------+--------------------------------------+       |
+------------+----------------------------------------------+
             |
             | Consume Jobs
             |
+------------v----------------------------------------------+
|         BullMQ Worker Service (Render)                    |
|                                                           |
|  +------------------------------------------+             |
|  |  Order Processor                        |             |
|  |  1. Fetch quotes (Raydium + Meteora)    |             |
|  |  2. Compare prices & select best DEX    |             |
|  |  3. Build swap transaction              |             |
|  |  4. Submit to Solana devnet             |             |
|  |  5. Confirm transaction                 |             |
|  |  6. Update order status -> Socket.io    |             |
|  +---------+--------------------------------+             |
|            |                                              |
|  +---------v-----------+  +-----------------+             |
|  |  DEX Router         |  |  Solana RPC     |             |
|  |  - Raydium SDK      |  |  (Devnet)       |             |
|  |  - Meteora SDK      |  +-----------------+             |
|  +---------------------+                                  |
+-----------------------------------------------------------+
                |                          |
                |                          |
    +-----------v-----------+    +---------v----------+
    |  PostgreSQL           |    |  Redis             |
    |  - orders             |    |  - Active orders   |
    |  - transactions       |    |  - Queue jobs      |
    +-----------------------+    +--------------------+
```

### Order Execution Flow

```
1. Client submits order
   --> POST /api/orders/execute { tokenIn, tokenOut, amount }

2. API validates & creates order
   --> Generate orderId
   --> Save to PostgreSQL (status: 'pending')
   --> Add job to BullMQ queue
   --> Return { orderId, socketUrl }

3. Client upgrades to WebSocket
   --> Connect to Socket.io with orderId
   --> Listen for status updates

4. Worker picks up job from queue
   --> Status: 'routing'
   --> Fetch Raydium quote (200ms delay)
   --> Fetch Meteora quote (200ms delay)
   --> Compare prices & fees
   --> Select best DEX
   --> Log routing decision

5. Worker builds transaction
   --> Status: 'building'
   --> Create swap instruction
   --> Handle wrapped SOL if needed
   --> Add slippage protection (1%)

6. Worker submits to blockchain
   --> Status: 'submitted'
   --> Send transaction to Solana devnet
   --> Get transaction signature

7. Worker confirms transaction
   --> Status: 'confirmed'
   --> Wait for finalization
   --> Extract execution price
   --> Update PostgreSQL with txHash
   --> Emit final status to Socket.io

8. Client receives confirmation
   --> Display txHash, execution price
   --> Link to Solana Explorer
```

### Retry Logic (Exponential Backoff)

```
Attempt 1: Execute immediately
   | (fail)
Attempt 2: Wait 2 seconds, retry
   | (fail)
Attempt 3: Wait 4 seconds, retry
   | (fail)
Status: 'failed' -> Save error to DB -> Notify client
```

## Project Structure

```
/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── route.ts          # POST /api/auth (login/create)
│   │   │   ├── orders/
│   │   │   │   ├── execute/
│   │   │   │   │   └── route.ts      # POST /api/orders/execute
│   │   │   │   └── history/
│   │   │   │       └── route.ts      # GET /api/orders/history
│   │   │   └── health/
│   │   │       └── route.ts          # GET /api/health
│   │   ├── page.tsx                  # Frontend UI (dashboard with auth)
│   │   └── layout.tsx                # Root layout
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts             # Drizzle schema definitions
│   │   │   ├── index.ts              # Drizzle client singleton
│   │   │   └── redis.ts              # Redis client
│   │   │
│   │   ├── auth/
│   │   │   ├── jwt.ts                # JWT token generation/verification
│   │   │   └── middleware.ts         # Auth middleware for protected routes
│   │   │
│   │   ├── queue/
│   │   │   ├── bullmq.ts             # BullMQ queue setup
│   │   │   └── worker.ts             # Order processing worker
│   │   │
│   │   ├── dex/
│   │   │   ├── router.ts             # DEX routing logic
│   │   │   ├── raydium.ts            # Raydium SDK integration
│   │   │   └── meteora.ts            # Meteora SDK integration
│   │   │
│   │   ├── solana/
│   │   │   ├── connection.ts         # Solana RPC connection
│   │   │   └── wallet.ts             # Wallet keypair management
│   │   │
│   │   ├── websocket/
│   │   │   └── server.ts             # Socket.io server setup
│   │   │
│   │   └── utils/
│   │       ├── validation.ts         # Input validation schemas
│   │       └── logger.ts             # Winston/Pino logger
│   │
│   ├── types/
│   │   ├── order.ts                  # Order type definitions
│   │   └── dex.ts                    # DEX quote types
│   │
│   └── worker/
│       └── index.ts                  # Standalone worker entry point
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── migrations/                   # Migration files
│
├── __tests__/
│   ├── api/
│   │   └── orders.test.ts            # API endpoint tests
│   ├── dex/
│   │   └── router.test.ts            # DEX routing tests
│   ├── queue/
│   │   └── worker.test.ts            # Worker processing tests
│   └── integration/
│       └── order-flow.test.ts        # End-to-end order tests
│
├── public/                           # Static assets
├── docker-compose.yml                # Local dev environment
├── Dockerfile.worker                 # Worker service container
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── jest.config.js                    # Jest config
├── .env.example                      # Environment variables template
└── README.md                         # Setup & documentation
```

## Database Schema

### PostgreSQL (Drizzle ORM)

```typescript
// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Orders table
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  tokenIn: varchar('token_in', { length: 50 }).notNull(),
  tokenOut: varchar('token_out', { length: 50 }).notNull(),
  amountIn: numeric('amount_in', { precision: 20, scale: 9 }).notNull(),
  amountOut: numeric('amount_out', { precision: 20, scale: 9 }),
  status: varchar('status', { length: 20 }).notNull(), // PENDING, ROUTING, BUILDING, SUBMITTED, CONFIRMED, FAILED
  selectedDex: varchar('selected_dex', { length: 20 }), // raydium or meteora
  txHash: varchar('tx_hash', { length: 100 }),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));
```

### Redis Schema

```
# Active orders (TTL: 1 hour)
order:{orderId} -> { userId, status, tokenIn, tokenOut, ... }

# BullMQ queues
bull:order-queue:wait
bull:order-queue:active
bull:order-queue:completed
bull:order-queue:failed
```

## API Endpoints

### POST /api/auth
Simple auth: creates account if username doesn't exist, logs in if it does.

**Request:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "userId": 1,
  "username": "john_doe",
  "token": "jwt-token-here"
}
```

### POST /api/orders/execute
**Headers:**
```
Authorization: Bearer jwt-token-here
```

**Request:**
```json
{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 1.5,
  "slippage": 0.01
}
```

**Response:**
```json
{
  "orderId": "uuid-here",
  "status": "pending",
  "socketUrl": "wss://your-app.onrender.com"
}
```

### GET /api/orders/history
**Headers:**
```
Authorization: Bearer jwt-token-here
```

**Response:**
```json
{
  "orders": [
    {
      "orderId": "uuid-here",
      "tokenIn": "SOL",
      "tokenOut": "USDC",
      "amountIn": 1.5,
      "amountOut": 150.0,
      "status": "confirmed",
      "selectedDex": "raydium",
      "txHash": "signature-here",
      "createdAt": "2025-11-23T14:30:00Z"
    }
  ]
}
```

### WebSocket Events

**Client -> Server:**
```javascript
socket.emit('subscribe', { orderId: 'uuid-here' })
```

**Server -> Client:**
```javascript
socket.on('order:update', {
  orderId: 'uuid-here',
  status: 'routing', // pending | routing | building | submitted | confirmed | failed
  dexQuotes: { raydium: 1.02, meteora: 1.01 },
  selectedDex: 'raydium',
  txHash: 'signature-here',
  executionPrice: 1.02,
  error: null
})
```

## Deployment Strategy

### Render Services

1. **Web Service** (Next.js)
   - Build: `npm run build`
   - Start: `npm run start`
   - Auto-deploy on git push

2. **Background Worker**
   - Build: `npm run build`
   - Start: `npm run worker`
   - Separate service from web

3. **PostgreSQL**
   - Managed database instance
   - Connection pooling enabled

4. **Redis**
   - Managed Redis instance
   - Used by BullMQ and caching

### Cron Job (Keep-Alive)
```bash
# Render Cron Job (every 10 minutes)
curl https://your-app.onrender.com/api/health
```

## Performance Targets

- **Latency**: Order submission to confirmed < 5 seconds
- **Throughput**: 100 orders/minute (10 concurrent workers)
- **Uptime**: 99%+ (cron job prevents cold starts)
- **WebSocket**: Real-time updates < 100ms latency
