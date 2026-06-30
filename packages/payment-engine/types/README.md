# `types/` — Canonical TypeScript Types

> Every shared type lives here. Other subpackages import from `@nanoproof/payment-engine/types`. Mirrors the Zod schemas in `@nanoproof/shared/schemas/payment.ts` (Phase 4+).

## Files

| File | Purpose |
|------|---------|
| `vault.ts` | `Vault`, `VaultMode`, `VaultContractType`. |
| `payment-intent.ts` | `PaymentIntent`, `PaymentIntentStatus`, `BatchingTier`. |
| `payout.ts` | `Payout`, `PayoutStatus`. |
| `payment-quote.ts` | `PaymentQuote`. |
| `receipt.ts` | `Receipt`, `ReceiptStatus`, `ReceiptPayout`. |
| `treasury.ts` | `Treasury`, `TreasuryBalance`, `TreasuryTransaction`, `TreasuryWithdrawal`, `TreasuryTxType`, `WithdrawalStatus`. |
| `fees.ts` | `FeeTier`, `FeeSchedule`, `FeeQuote`, `FeeTierInfo`. |
| `rebate.ts` | `RebatePaymentIntent`. |
| `reconciliation.ts` | `ReconciliationReport`. |
| `x402.ts` | `X402Envelope`. |
| `settlement.ts` | `GatewayBatch`, `OnchainReceipt`. |
| `errors.ts` | Engine-specific error types. |
| `common.ts` | ULID, atomic-USDC helpers, idempotency key derivation. |
| `index.ts` | Re-exports. |

## Conventions

- All IDs are branded: `type VaultId = string & { readonly __brand: "VaultId" }`.
- Money is always `string` of atomic USDC units.
- Timestamps are ISO 8601 strings in UTC.
- Hashes are `0x` prefixed hex strings.
- Every type has a Zod twin in `@nanoproof/shared` that produces the type via `z.infer`.

## See also

- [`@nanoproof/shared`](../../../packages/shared/README.md)