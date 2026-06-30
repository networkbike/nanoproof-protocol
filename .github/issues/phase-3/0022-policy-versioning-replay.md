---
id: P3-022
title: "[Phase 3] Implement attribution policy versioning + replay tool"
labels:
  - phase:phase-3
  - area:citation-engine
  - area:scoring
  - priority:medium
  - type:feature
priority: medium
depends_on: [P3-009]
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Implement attribution policy versioning + replay tool

## Summary

`AttributionScorer.recompute(citations, policyVersion)` for replaying old Citations under new policies. `POST /v1/attributions/calculate` exposes it.

## Acceptance criteria

- [ ] Each policy version is a frozen, immutable scorer config.
- [ ] `recompute()` is byte-identical to the original computation when the same policy version is passed.
- [ ] `POST /v1/attributions/calculate` returns old + new fractions + delta.
- [ ] CLI tool: `pnpm tsx scripts/replay-attributions.ts --from=am.v1.0.0 --to=am.v2.0.0`.
- [ ] Unit tests + golden fixtures for every policy version.

## Dependencies

- P3-009 (attribution scorer)