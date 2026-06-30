---
id: P4-004
title: "[Phase 4] Implement Quoter — signed PaymentQuote (EIP-712)"
labels:
  - phase:phase-4
  - area:payment-engine
  - priority:high
  - type:feature
priority: high
depends_on: [P4-003]
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement Quoter

## Summary

`packages/payment-engine/core/quoter.ts`. Build PaymentQuote + EIP-712 sign.

## Acceptance criteria

- [ ] Quote contents: totalAtomic, feeAtomic, netAtomic, payouts[], validUntil.
- [ ] EIP-712 typed-data signature.
- [ ] Signature verifies via `viem.verifyTypedData`.
- [ ] Quote TTL: 60s past period end.
- [ ] Policy version stamped.
- [ ] Unit tests + replay test.

## Dependencies

- P4-003 (allocator)