---
id: P4-016
title: "[Phase 4] Implement REST controllers for /v1/treasury + /v1/fees + /v1/rebates"
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

# [Phase 4] Implement REST controllers for /v1/treasury + /v1/fees + /v1/rebates

## Summary

NestJS controllers for Treasury + Fee + Rebate endpoints.

## Acceptance criteria

- [ ] TreasuryController (state, balance, transactions, withdrawals, sign-withdrawal, hot-wallet, refills).
- [ ] FeesController (agent schedule, quote, tiers).
- [ ] RebatesController (list).
- [ ] Operator-only endpoints guarded.
- [ ] Unit + integration tests.

## Dependencies

- P4-014