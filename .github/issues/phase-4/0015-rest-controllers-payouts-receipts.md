---
id: P4-015
title: "[Phase 4] Implement REST controllers for /v1/payouts + /v1/receipts"
labels:
  - phase:phase-4
  - area:api
  - area:payment-engine
  - priority:high
  - type:feature
priority: high
depends_on: [P4-014]
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement REST controllers for /v1/payouts + /v1/receipts

## Summary

NestJS controllers for Payout + Receipt endpoints (publicly cacheable where appropriate).

## Acceptance criteria

- [ ] `PayoutsController` (list, get, retry).
- [ ] `ReceiptsController` (list, get, by-tx-hash, verify).
- [ ] Receipts read endpoints are public (cacheable).
- [ ] Unit + integration tests.

## Dependencies

- P4-014