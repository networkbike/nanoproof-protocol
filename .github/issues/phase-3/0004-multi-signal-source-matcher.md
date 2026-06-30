---
id: P3-004
title: "[Phase 3] Implement multi-signal Source Matcher (URL + DOI + embedding + title + metadata)"
labels:
  - phase:phase-3
  - area:citation-engine
  - area:matching
  - priority:high
  - type:feature
priority: high
depends_on: [P3-003]
milestone: Phase 3 — Citation Engine
estimate: L
---

# [Phase 3] Implement multi-signal Source Matcher

## Summary

`packages/citation-engine/matching/matcher.ts`. Resolves normalized references to registered Sources. Multi-signal combination per [`docs/citation-engine.md` §Stage 3](../../../docs/citation-engine.md#stage-3--source-matching).

## Acceptance criteria

- [ ] `score = α·urlExact + β·embeddingSim + γ·titleSim + δ·metadataSim + ε·doiExact − λ·fraudPenalty`.
- [ ] Threshold τ (default 0.78) enforced.
- [ ] High-precision signal floor: at least one of `urlExact`, `doiExact`, `embeddingSim ≥ 0.92` must contribute ≥ 0.3.
- [ ] pgvector HNSW query for embedding similarity.
- [ ] Returns `MatchCandidate[]` ranked by combined score.
- [ ] Unit tests with golden fixtures; integration test against seeded registry.
- [ ] Weights configurable via env: `CE_MATCHER_W_ALPHA`, `CE_MATCHER_W_BETA`, etc.

## Dependencies

- P3-003 (normalizer)
- P3-005 (embedders)