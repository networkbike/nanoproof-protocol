# `interfaces/` — Pluggable Strategy Contracts

> Every component that has more than one implementation declares its interface here. Concrete implementations live in their owning subpackage.

## Purpose

The Payment Engine composes interchangeable strategies. The interfaces in this folder are the contracts. To swap an Arc RPC provider from Canteen-hosted to public, you implement `ArcClient` from `interfaces/arc-client.ts`.

## Files

| File | Interface |
|------|-----------|
| `arc-client.ts` | `ArcClient` — Arc RPC + finality polling. |
| `gateway-client.ts` | `GatewayClient` — Circle Gateway HTTP client. |
| `vault-manager.ts` | `VaultManager` — vault CRUD. |
| `allocator.ts` | `Allocator` — splits + org + recursive royalty computation. |
| `fee-calculator.ts` | `FeeCalculator` — protocol fee + gas amortization. |
| `tier-evaluator.ts` | `TierEvaluator` — fee tier evaluation. |
| `rebate-engine.ts` | `RebateEngine` — monthly rebate execution. |
| `x402-signer.ts` | `X402Signer` — EIP-712 sign + verify. |
| `receipt-writer.ts` | `ReceiptWriter` — persist Receipt with hash chain. |
| `hash-chain.ts` | `HashChain` — compute + verify chain. |
| `verifier.ts` | `Verifier` — independent receipt verification. |
| `indexer.ts` | `Indexer` — mirror to public surface. |
| `fraud-gate.ts` | `FraudGate` — pre-execution fraud-signal check. |
| `treasury-manager.ts` | `TreasuryManager` — treasury CRUD + withdrawals. |
| `hot-wallet.ts` | `HotWallet` — refill + drain protection. |
| `logger.ts` | `Logger` — structured logging. |
| `metrics.ts` | `Metrics` — counter / gauge / histogram. |

## Example: the ArcClient interface

```typescript
export interface ArcClient {
  sendTransaction(tx: TransactionRequest): Promise<TxHash>;
  waitForFinality(hash: TxHash, confirmations?: number): Promise<OnchainReceipt>;
  balanceOf(token: Address, holder: Address): Promise<bigint>;
  call<T = unknown>(view: ViewCall): Promise<T>;
  getBlock(blockNumber: bigint): Promise<Block>;
  getLogs(filter: LogFilter): Promise<Log[]>;
}
```

Implementations: `settlement/arc-client.ts` (primary viem-based) and `settlement/arc-client-failover.ts` (with backup RPC).

## See also

- [`../core/`](../core/README.md)
- [`../settlement/`](../settlement/README.md)