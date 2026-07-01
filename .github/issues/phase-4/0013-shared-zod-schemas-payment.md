---
id: P4-013
title: "[Phase 4] Add Payment Zod schemas to @nanoproof/shared"
labels:
  - phase:phase-4
  - area:shared
  - priority:high
  - type:validation
priority: high
depends_on: []
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Add Payment Zod schemas to @nanoproof/shared

## Summary

`packages/shared/src/schemas/payment.ts`. Canonical Zod schemas for Vault, PaymentIntent, Payout, PaymentQuote, Receipt, Treasury.

## Acceptance criteria

- [ ] All schemas from `apps/api/openapi/payment-engine.yaml`.
- [ ] Type inferences exported.
- [ ] Unit tests.

## Dependencies

None.