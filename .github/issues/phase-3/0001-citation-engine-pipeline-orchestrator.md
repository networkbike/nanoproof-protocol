---
id: P3-001
title: "[Phase 3] Implement CitationEngine top-level orchestrator"
labels:
  - phase:phase-3
  - area:citation-engine
  - priority:high
  - type:feature
priority: high
depends_on: []
milestone: Phase 3 — Citation Engine
estimate: L
status: implemented-partial
milestone: phase-3-citation-engine
---

# [Phase 3] Implement CitationEngine top-level orchestrator

## Summary

Land the `CitationEngine` class in `packages/citation-engine/core/engine.ts`. It wires the 10-stage pipeline (Discovery → Normalization → Matching → Extraction → Classification → Scoring → Resolution → Quoting → Recording → Receipt Emission) into `extract()` and `record()`.

## Acceptance criteria

- [ ] `CitationEngine` constructor accepts all sub-component dependencies.
- [ ] `extract()` runs the full pipeline but **does not write** to the database.
- [ ] `record()` runs the pipeline + persists Attribution + Citations + Evidences + Contributions + CreatorMatches + Fingerprints in a single transaction.
- [ ] Every emitted Citation stamped with `enginePolicyVersion`, `attributionPolicyVersion`, `fingerprintPolicyVersion` from env.
- [ ] Idempotency: same `Idempotency-Key` returns cached response.
- [ ] Latency budget: <500 ms p99 for typical response (<2k tokens, ≤20 citations).
- [ ] Unit tests for every pipeline stage + integration test against docker-compose stack.

## Dependencies

None.


## Resolution (thin slice)

**Status:** Implemented (thin slice). Full pipeline (stages 5-10) lands later.
**Milestone:** phase-3-citation-engine

Detector in `apps/api/src/modules/citations/citations.detector.ts` + URL extraction in `url-extractor.ts`. Replaces the MVP `/v1/citations/simulate` stub with real `POST /v1/citations/detect`  that resolves URLs against registered `Source.domain` rows. Backwards-compat shims preserve the old shapes.

