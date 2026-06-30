---
id: P3-025
title: "[Phase 3] Extend shared NP_* error catalog with Phase 3 codes"
labels:
  - phase:phase-3
  - area:shared
  - priority:high
  - type:validation
priority: high
depends_on: []
milestone: Phase 3 — Citation Engine
estimate: S
---

# [Phase 3] Extend shared NP_* error catalog with Phase 3 codes

## Summary

Add every `NP_*` error code referenced in `apps/api/openapi/citation-engine.yaml` to `@nanoproof/shared/errors`.

## Codes to add

```typescript
NP_CITATION_NOT_FOUND,
NP_CITATION_ALREADY_DISPUTED,
NP_ATTRIBUTION_NOT_FOUND,
NP_FINGERPRINT_NOT_FOUND,
NP_FINGERPRINT_DUPLICATE,
NP_MATCH_THRESHOLD_NOT_MET,
NP_PROBER_DENIED_HOST,
NP_PROBER_TIMEOUT,
NP_EMBEDDING_FAILED,
NP_INVALID_CANDIDATE_REFERENCE,
NP_INVALID_NORMALIZED_REFERENCE,
NP_PERIOD_CAP_EXCEEDED,
NP_FRAUD_QUARANTINED,
NP_FRAUD_SIGNAL_MISSING,
NP_DISPUTE_NOT_FOUND,
NP_DISPUTE_ALREADY_OPEN,
NP_SSRF_BLOCKED,
```

## Acceptance criteria

- [ ] Every code has stable HTTP status + default message.
- [ ] Exported as string constants and a Zod schema.
- [ ] Unit test ensures no collisions.
- [ ] Documented in `docs/citation-engine.md` §Errors.

## Dependencies

None.