# `core/` — Payment Engine Orchestration

> Wires the 8-stage payout pipeline (Aggregate → Allocate → Quote → Sign x402 → Batch → Settle → Anchor → Mirror) into the top-level `PaymentEngine` class. Stateless orchestration.

## Files

| File | Responsibility |
|------|----------------|
| `engine.ts` | `PaymentEngine` top-level. `createIntent()`, `execute()`, `pause()`, `replay()`. |
| `aggregator.ts` | CitationEvents → PaymentIntent. |
| `allocator.ts` | Apply splits + org policy + recursive royalties. |
| `quoter.ts` | Build + sign PaymentQuote. |
| `fraud-gate.ts` | Pre-execution fraud-signal check (re-uses Phase 3 signals). |
| `retry-scheduler.ts` | BullMQ retry orchestration for failed payouts. |
| `reconciler.ts` | Periodic Arc state vs. local state diff. |
| `events.ts` | Typed event payloads. |
| `errors.ts` | Engine-specific error wrappers. |
| `policy.ts` | Loads the payment policy version from env. |

## Public API

```typescript
export class PaymentEngine {
  constructor(deps: {
    arcClient: ArcClient;
    gatewayClient: GatewayClient;
    vaultRepo: VaultRepository;
    intentRepo: PaymentIntentRepository;
    payoutRepo: PayoutRepository;
    receiptRepo: ReceiptRepository;
    quoteSigner: QuoteSigner;
    feeCalc: FeeCalculator;
    fraudGate: FraudGate;
  });

  createIntent(req: CreateIntentRequest): Promise<PaymentIntent>;
  execute(paymentIntentId: string): Promise<Receipt>;
  pause(paymentIntentId: string, reason: string): Promise<PaymentIntent>;
  retry(payoutId: string): Promise<Payout>;
  replay(paymentIntentId: string): Promise<ReplayReport>;
}
```

## Invariants

- `execute()` is idempotent: same `idempotencyKey` returns the cached Receipt.
- `execute()` never custodies creator funds beyond the batching window.
- Every emitted Receipt carries a hash-chain link to the prior Receipt.
- A failed PaymentIntent never partially settles — either all Payouts settle or the Intent is marked FAILED.

## See also

- [`docs/payment-engine.md`](../../../docs/payment-engine.md)
- [`../settlement/`](../settlement/README.md)
- [`../allocation/`](../allocation/README.md)
- [`../vaults/`](../vaults/README.md)