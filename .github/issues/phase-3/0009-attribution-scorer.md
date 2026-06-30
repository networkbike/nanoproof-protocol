---
id: P3-009
title: "[Phase 3] Implement AttributionScorer — 5 weight factors + sum-to-one normalization"
labels:
  - phase:phase-3
  - area:citation-engine
  - area:scoring
  - priority:high
  - type:feature
priority: high
depends_on: [P3-008]
milestone: Phase 3 — Citation Engine
estimate: L
---

# [Phase 3] Implement AttributionScorer

## Summary

`packages/citation-engine/scoring/attribution.ts`. Implements the model in [`docs/attribution-model.md`](../../../docs/attribution-model.md).

## Acceptance criteria

- [ ] Computes per-Citation raw score: `w_cite × w_rel × w_conf × w_qual × w_diversity × w_recency × basePrice`.
- [ ] Normalizes to fractions summing to **1.0 ± 1e-9** per response.
- [ ] Each weight factor in its own file (`diversity.ts`, `recency.ts`, `quality.ts`).
- [ ] Policy version stamped on every Citation.
- [ ] `recompute(citations, policyVersion)` is deterministic — same inputs → same outputs.
- [ ] Property-based test enforces sum-to-one across random inputs.
- [ ] Replay test: golden fixtures produce byte-identical outputs across policy versions.

## Dependencies

- P3-008 (extraction + classification)