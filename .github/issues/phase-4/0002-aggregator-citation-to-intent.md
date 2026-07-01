---
id: P4-002
title: "[Phase 4] Implement Aggregator — CitationEvents to PaymentIntent"
labels:
  - phase:phase-4
  - area:payment-engine
  - priority:high
  - type:feature
priority: high
depends_on: [P4-001]
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement Aggregator

## Summary

`packages/payment-engine/core/aggregator.ts`. Consumes `citation.recorded` events; aggregates CitationEvents per (Creator, period) into PaymentIntents.

## Acceptance criteria

- [ ] BullMQ consumer of `citation.recorded`.
- [ ] Idempotency: replaying the same event yields the same PaymentIntent.
- [ ] `idempotencyKey = sha256(creatorId || periodStart || periodEnd)`.
- [ ] Batching window configurable (default 1h).
- [ ] Per-period cap enforced; over-cap citations accumulated as credit.
- [ ] Unit tests + integration test.

## Dependencies

- P4-001 (orchestrator)