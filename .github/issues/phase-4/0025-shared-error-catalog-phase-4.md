---
id: P4-025
title: "[Phase 4] Extend shared NP_* error catalog with Phase 4 codes"
labels:
  - phase:phase-4
  - area:shared
  - priority:high
  - type:validation
priority: high
depends_on: []
milestone: Phase 4 — Payment Engine
estimate: S
---

# [Phase 4] Extend shared NP_* error catalog with Phase 4 codes

## Summary

Add every `NP_*` error code referenced in `apps/api/openapi/payment-engine.yaml` to `@nanoproof/shared/errors`.

## Codes to add

```typescript
NP_VAULT_NOT_FOUND,
NP_VAULT_PAUSED,
NP_VAULT_ADDRESS_INVALID,
NP_VAULT_ALREADY_EXISTS,
NP_VAULT_DENYLISTED,
NP_VAULT_MIGRATION_FAILED,
NP_SPLITS_INVALID,
NP_SPLITS_BASISPOINTS_INVALID,
NP_PAYMENT_INTENT_NOT_FOUND,
NP_PAYMENT_INTENT_INVALID_STATE,
NP_PAYMENT_INTENT_PAUSED,
NP_PAYMENT_INTENT_ESCALATED,
NP_PAYOUT_NOT_FOUND,
NP_PAYOUT_FAILED,
NP_PAYOUT_CLAWBACK_FAILED,
NP_RECEIPT_NOT_FOUND,
NP_RECEIPT_VERIFICATION_FAILED,
NP_RECEIPT_HASH_CHAIN_BROKEN,
NP_TREASURY_BALANCE_INSUFFICIENT,
NP_TREASURY_WITHDRAWAL_PENDING,
NP_TREASURY_WITHDRAWAL_EXPIRED,
NP_TREASURY_THRESHOLD_NOT_MET,
NP_HOT_WALLET_DAILY_CAP_EXCEEDED,
NP_HOT_WALLET_BALANCE_INSUFFICIENT,
NP_FEE_QUOTE_FAILED,
NP_REBATE_NOT_FOUND,
NP_RECONCILIATION_DRIFT,
NP_ARC_RPC_ERROR,
NP_GATEWAY_ERROR,
NP_X402_INVALID_ENVELOPE,
NP_X402_INVALID_SIGNATURE,
```

## Acceptance criteria

- [ ] Every code has stable HTTP status + default message.
- [ ] Exported as string constants and a Zod schema.
- [ ] Unit test ensures no collisions.

## Dependencies

None.