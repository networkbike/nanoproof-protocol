---
id: P4-018
title: "[Phase 4] Implement Receipt + Allocation replay tooling (CLI)"
labels:
  - phase:phase-4
  - area:payment-engine
  - priority:medium
  - type:tooling
priority: medium
depends_on: [P4-011]
milestone: Phase 4 — Payment Engine
estimate: S
---

# [Phase 4] Implement Receipt + Allocation replay tooling

## Summary

CLI tools: `scripts/replay-receipt.ts`, `scripts/replay-allocation.ts`, `scripts/verify-hash-chain.ts`.

## Acceptance criteria

- [ ] `replay-receipt.ts`: re-derive Receipt from PaymentIntent + Payout[]; verify against onchain.
- [ ] `replay-allocation.ts`: re-derive allocation from frozen splits hash; diff vs persisted.
- [ ] `verify-hash-chain.ts`: walk the Receipt chain; verify each link.
- [ ] Idempotent + safe to run repeatedly.
- [ ] Documentation in `docs/payment-audit.md`.

## Dependencies

- P4-011 (ReceiptWriter)