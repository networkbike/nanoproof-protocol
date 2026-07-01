---
id: P4-017
title: "[Phase 4] Implement periodic Reconciler (local DB vs Arc L1)"
labels:
  - phase:phase-4
  - area:payment-engine
  - priority:high
  - type:reliability
priority: high
depends_on: [P4-006, P4-011]
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement periodic Reconciler

## Summary

`packages/payment-engine/core/reconciler.ts`. Hourly + daily reconciliation between local DB and Arc L1.

## Acceptance criteria

- [ ] Hourly: check vaults with activity in last 24h.
- [ ] Daily (03:00 UTC): full reconciliation of all Receipts.
- [ ] Drift > $0.01 → page on-call + create Incident.
- [ ] Manual trigger via `POST /v1/reconciliation/run`.
- [ ] `ReconciliationReport` row persisted.
- [ ] Unit + integration tests.

## Dependencies

- P4-006 (Arc client), P4-011 (ReceiptWriter)