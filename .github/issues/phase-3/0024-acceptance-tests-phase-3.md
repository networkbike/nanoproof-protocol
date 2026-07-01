---
id: P3-024
title: "[Phase 3] Phase 3 acceptance — full end-to-end pipeline test"
labels:
  - phase:phase-3
  - area:api
  - area:citation-engine
  - priority:high
  - type:testing
priority: high
depends_on: [P3-001, P3-009, P3-010, P3-012, P3-013]
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Phase 3 acceptance — full pipeline test

## Summary

Single e2e test exercising the entire Citation Engine against a seeded registry and real Postgres + Redis.

## Acceptance criteria

The test:

1. Registers 3 Creators + 5 Sources + 3 Wallets (Phase 2 fixtures).
2. Generates Fingerprints for all 5 Sources.
3. Runs the engine on a known response citing 3 Sources.
4. Verifies exactly 3 Citations emitted with correct `kind`, `matchScore`, and `contributionFraction` summing to 1.0.
5. Verifies the Contributions resolve to the correct Creators.
6. Submits a fraud-crafted response that cites everything → expects auto-quarantine.
7. Files a dispute on one Citation → verifies escrow freeze.
8. Recomputes under a new policy version → verifies delta is reported correctly.
9. All NP_* error paths exercised for one failure of each type.

## Dependencies

- P3-001, P3-009, P3-010, P3-012, P3-013 closed.