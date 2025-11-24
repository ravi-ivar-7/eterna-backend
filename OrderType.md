# Order Type Selection: Market Orders

## Decision

We're implementing **Market Orders** for this execution engine.

## Rationale

### 1. Real-World Usage

Market orders make up the vast majority of DEX transactions. When you use Uniswap, Raydium, or Jupiter, you're executing market orders - immediate swaps at the current best price.

AMM-based DEXs like Raydium and Meteora don't have native order books. They use liquidity pools with algorithmic pricing. Limit orders on these platforms require external infrastructure to monitor prices and trigger execution - that's a separate system on top of the core swap mechanism.

### 2. Core Infrastructure Focus

The challenge here is building a robust execution engine with:
- Real-time price discovery across multiple DEXs
- Smart routing to get the best execution
- Concurrent order processing at scale
- Reliable transaction submission and confirmation

Market orders let us focus on perfecting these fundamentals. The DEX routing logic, slippage handling, and concurrent execution don't change whether we're doing market, limit, or sniper orders.

### 3. Better Demo Experience

For the video demonstration:
- Submit 5 orders → see instant routing decisions
- Watch WebSocket updates flow in real-time
- See actual transaction confirmations within seconds
- Show the system handling concurrent load

With limit orders, we'd spend time waiting for price conditions. With sniper orders, we'd need to set up token launches. Market orders showcase the system immediately.

### 4. Clean Architecture Extension

Market orders are the primitive. Other order types build on top:

**Limit Orders**: Add a price monitoring service that checks pool prices every block. When the target price is hit, trigger a market order execution through our existing engine.

**Sniper Orders**: Add an event listener for new pool creation on Raydium/Meteora. When a target token launches, trigger a market order execution through our existing engine.

Both extensions use the same DEX routing, transaction building, and execution logic we're implementing now.

### 5. Production Relevance

Looking at actual DEX aggregators like Jupiter:
- Market swaps are the primary use case
- The hard engineering problems are routing optimization and execution reliability
- Advanced order types are premium features built on top of solid swap infrastructure

We're building the foundation that matters most.

## Implementation Benefits

With real devnet execution:
- We get actual transaction hashes to show
- We can demonstrate real price differences between Raydium and Meteora
- We can prove the routing logic works with live blockchain data
- The demo is more impressive to technical evaluators

## Summary

Market orders represent the core challenge: building production-grade DEX routing that compares live prices, selects optimal execution venues, and handles transactions reliably at scale. This choice demonstrates engineering maturity - solving the hard problem well rather than adding complexity that obscures the fundamentals.
