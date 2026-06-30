---
id: P3-016
title: "[Phase 3] Add Citation Zod schemas to @nanoproof/shared"
labels:
  - phase:phase-3
  - area:shared
  - priority:high
  - type:validation
priority: high
depends_on: []
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Add Citation Zod schemas to @nanoproof/shared

## Summary

`packages/shared/src/schemas/citation.ts`. Canonical Zod schemas for Citation + Attribution + Evidence + Fingerprint + Dispute + Analytics.

## Acceptance criteria

- [ ] `CandidateReferenceSchema`, `NormalizedReferenceSchema`.
- [ ] `CitationSchema`, `CitationKindSchema`, `CitationPayoutStatusSchema`.
- [ ] `AttributionSchema`, `AttributionDetailSchema`.
- [ ] `EvidenceSchema` with nested `MatchSignalsSchema`.
- [ ] `FingerprintSchema` with discriminated union (CURRENT | SUPERSEDED).
- [ ] `DisputeSchema`, `DisputeReasonSchema`, `DisputeStatusSchema`.
- [ ] `AnalyzeCitationsRequestSchema` + `AnalyzeCitationsResponseSchema`.
- [ ] Inferred types exported (`type Citation`, etc.).
- [ ] Unit tests.

## Dependencies

None.