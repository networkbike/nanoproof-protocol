---
id: P4-014
title: "[Phase 4] Implement REST controllers for /v1/vaults + /v1/payments"
labels:
  - phase:phase-4
  - area:api
  - area:payment-engine
  - priority:high
  - type:feature
priority: high
depends_on: [P4-008, P4-012, P4-013]
milestone: Phase 4 — Payment Engine
estimate: L
---

# [Phase 4] Implement REST controllers for /v1/vaults + /v1/payments

## Summary

NestJS controllers for Vault and PaymentIntent endpoints.

## Acceptance criteria

- [ ] `VaultsController` (create, list, get, update, pause, resume, migrate, receipts, balance).
- [ ] `PaymentsController` (create-intent, list, get, execute, pause, quote).
- [ ] All Zod-validated via the global pipe.
- [ ] Idempotency honored on POST.
- [ ] Cursor pagination.
- [ ] Unit + integration tests.

## Dependencies

- P4-008, P4-012, P4-013