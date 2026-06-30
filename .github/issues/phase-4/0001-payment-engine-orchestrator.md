---
id: P4-001
title: "[Phase 4] Implement PaymentEngine top-level orchestrator"
labels:
  - phase:phase-4
  - area:payment-engine
  - priority:high
  - type:feature
priority: high
depends_on: []
milestone: Phase 4 — Payment Engine
estimate: L
---

# [Phase 4] Implement PaymentEngine top-level orchestrator

## Summary

`packages/payment-engine/core/engine.ts`. Wires the 8-stage payout pipeline (Aggregate → Allocate → Quote → Sign x402 → Batch → Settle → Anchor → Mirror) into `createIntent()`, `execute()`, `pause()`, `retry()`, `replay()`.

## Acceptance criteria

- [ ] `PaymentEngine` constructor accepts all sub-component deps.
- [ ] `createIntent()` is idempotent on `idempotencyKey`.
- [ ] `execute()` runs the full pipeline; cached on replay.
- [ ] `pause()` and `retry()` are operator-only.
- [ ] `replay()` returns a `ReplayReport` with diff vs original.
- [ ] Latency budget: <1.3 s p99 from batch-start to settled Receipt.
- [ ] Unit + integration tests for every code path.

## Dependencies

None.