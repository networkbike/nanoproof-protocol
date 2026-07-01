---
id: P3-014
title: "[Phase 3] Implement Dispute queue — Creator-raised disputes with escrow freeze"
labels:
  - phase:phase-3
  - area:citation-engine
  - area:fraud
  - priority:medium
  - type:feature
priority: medium
depends_on: [P3-012]
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Implement Dispute queue

## Summary

`POST /v1/citations/:id/dispute`. Creators can flag any Citation for review. Disputes freeze the escrow until resolved.

## Acceptance criteria

- [ ] `Dispute` rows with reasons: WRONG_ATTRIBUTION, NOT_MY_WORK, QUALITY_MISMATCH, DUPLICATE_CITATION, SUSPECTED_ABUSE, OTHER.
- [ ] Disputed Citation → `payoutStatus = DISPUTED`, escrow frozen.
- [ ] OpenAPI spec includes dispute endpoint.
- [ ] Unit tests for status transitions.
- [ ] Integration test: dispute → escrow freeze → resolution → release.

## Dependencies

- P3-012 (recorder)