---
id: P4-020
title: "[Phase 4] Implement FraudGate pre-execution check (re-uses Phase 3 signals)"
labels:
  - phase:phase-4
  - area:payment-engine
  - area:fraud
  - priority:high
  - type:security
priority: high
depends_on: [P4-001]
milestone: Phase 4 — Payment Engine
estimate: S
---

# [Phase 4] Implement FraudGate pre-execution check

## Summary

`packages/payment-engine/core/fraud-gate.ts`. Re-checks fraud signals before each execution. Holds auto-quarantined Citations.

## Acceptance criteria

- [ ] Re-evaluates fraud score per Citation at execution time.
- [ ] Quarantined (fraud > 0.7) Citations held; surface to ops.
- [ ] Disputed Citations held.
- [ ] Per-Creator + per-Agent period caps enforced.
- [ ] Unit tests + integration test.

## Dependencies

- P4-001