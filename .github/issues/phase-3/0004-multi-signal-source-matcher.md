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
status: implemented-partial
milestone: phase-3-citation-engine
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


## Resolution (thin slice)

**Status:** Implemented (thin slice). Full pipeline (stages 5-10) lands later.
**Milestone:** phase-3-citation-engine

Detector in `apps/api/src/modules/citations/citations.detector.ts` + URL extraction in `url-extractor.ts`. Replaces the MVP `/v1/citations/simulate` stub with real `POST /v1/citations/detect`  that resolves URLs against registered `Source.domain` rows. Backwards-compat shims preserve the old shapes.

