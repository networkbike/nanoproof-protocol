# `settlement/` — Arc Settlement + Circle Gateway + x402

> Owns the onchain half of the Payment Engine: signing, batching, Arc RPC, x402 envelopes.

## Files

| File | Responsibility |
|------|----------------|
| `arc-client.ts` | viem-based Arc RPC client. Read + write + finality polling. |
| `gateway-client.ts` | Circle Gateway HTTP client. Submit batches + poll status. |
| `x402/signer.ts` | Wrap PaymentQuote in x402 envelope. |
| `x402/validator.ts` | Validate inbound x402 envelopes. |
| `tx-builder.ts` | Build USDC.transfer calldata + estimate gas. |
| `finality.ts` | Wait for Arc finality + parse onchain receipt. |
| `events-parser.ts` | Extract USDC.Transfer events from Arc receipt logs. |
| `rpc-failover.ts` | Primary → backup RPC failover. |
| `policy.ts` | Loads settlement policy version from env. |

## Public API

```typescript
export interface ArcClient {
  sendTransaction(tx: TransactionRequest): Promise<TxHash>;
  waitForFinality(hash: TxHash, confirmations?: number): Promise<OnchainReceipt>;
  balanceOf(token: Address, holder: Address): Promise<bigint>;
  call(view: ViewCall): Promise<unknown>;
}

export interface GatewayClient {
  submitBatch(batch: GatewayBatch): Promise<{ batchId: string }>;
  getBatchStatus(batchId: string): Promise<BatchStatus>;
  cancelBatch(batchId: string): Promise<void>;
}

export interface X402Signer {
  sign(quote: PaymentQuote): Promise<X402Envelope>;
  verify(envelope: X402Envelope): Promise<{ ok: boolean; recovered?: Address }>;
}
```

## Settlement flow

```
1. Build GatewayBatch from Payout[]
2. Sign x402 envelope
3. Submit via GatewayClient.submitBatch
4. Gateway returns batchId
5. Poll Gateway for batch status (PENDING → SUBMITTED → SETTLED)
6. On SETTLED: parse returned Arc txHash
7. Call ArcClient.waitForFinality(txHash)
8. Parse OnchainReceipt → USDC.Transfer events
9. Hand off to Receipts for persistence
```

## See also

- [`docs/settlement-arc.md`](../../../docs/settlement-arc.md)
- [`../core/`](../core/README.md)
- [`../x402/`](../x402/README.md)