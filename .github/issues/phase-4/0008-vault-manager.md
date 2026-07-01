---
id: P4-008
title: "[Phase 4] Implement VaultManager (CRUD + splits + migration)"
labels:
  - phase:phase-4
  - area:payment-engine
  - area:vaults
  - priority:high
  - type:feature
priority: high
depends_on: []
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement VaultManager

## Summary

`packages/payment-engine/vaults/vault-manager.ts`. Per [`docs/creator-vaults.md`](../../../docs/creator-vaults.md).

## Acceptance criteria

- [ ] `create`, `update`, `pause`, `resume`, `migrate`, `get`, `list`, `balance`.
- [ ] Splits validation: Σ basisPoints == 10000; max 5 splits.
- [ ] Per-Creator primary vault enforcement (1 per network).
- [ ] Migration creates a NEW vault; old marked for retirement.
- [ ] Smart contract vault screening (denylist).
- [ ] Multisig verification (`owners()` includes Creator).
- [ ] Unit + integration tests.

## Dependencies

None.