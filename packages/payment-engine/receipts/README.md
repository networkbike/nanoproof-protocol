# `receipts/` — ArcScan-Verifiable Receipts

> Persists onchain settlement receipts with hash-chained tamper evidence. Publicly queryable.

## Files

| File | Responsibility |
|------|----------------|
| `receipt-writer.ts` | Persist Receipt row from onchain data. |
| `hash-chain.ts` | Compute + verify `prevHash → hash` chain. |
| `arcscan-client.ts` | Wrapper for ArcScan API. |
| `verifier.ts` | Independent verification: onchain + local hash chain. |
| `indexer.ts` | Mirror to AnalyticsRollup + public dashboard. |
| `policy.ts` | Loads receipt policy version from env. |

## Public API

```typescript
export interface ReceiptWriter {
  write(input: WriteReceiptInput): Promise<Receipt>;
}

export interface HashChain {
  compute(receipt: Receipt, prev: Receipt | null): string;
  verify(receipts: Receipt[]): { ok: true } | { ok: false; brokenAt: string };
}

export interface ArcScanClient {
  getTransactionStatus(txHash: string): Promise<{ ok: boolean; status?: 'success' | 'reverted' }>;
  getTokenBalance(token: Address, holder: Address): Promise<bigint>;
  getTransactionReceipt(txHash: string): Promise<OnchainReceipt>;
}

export interface Verifier {
  verify(receiptId: string): Promise<ReceiptVerification>;
}

export interface Indexer {
  onReceiptSettled(receipt: Receipt): Promise<void>;
}
```

## Receipt lifecycle

```
1. Onchain settlement confirmed → writeReceiptInput
2. Compute hash chain link
3. Persist Receipt row
4. Emit payment.settled event
5. Indexer consumes event → update AnalyticsRollup + Creator.totalEarned
6. Webhook dispatcher notifies subscribers
7. Public dashboard renders
```

## Verification

```
For each Receipt:
  1. localExists        → DB lookup
  2. onchainExists      → ArcScan.getTransactionStatus
  3. txHashMatches      → compare DB txHash vs ArcScan txHash
  4. blockTimestampMatches → ±10s tolerance
  5. transferEventsMatch → parse Transfer events, sum = totalAtomic
  6. hashChainValid     → prevHash == prior.hash
```

A Receipt passes verification iff all six checks pass.

## See also

- [`docs/arcscan-verification.md`](../../../docs/arcscan-verification.md)
- [`docs/payment-audit.md`](../../../docs/payment-audit.md)
- [`../core/`](../core/README.md)