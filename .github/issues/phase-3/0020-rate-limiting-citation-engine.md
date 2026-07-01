---
id: P3-020
title: "[Phase 3] Implement per-agent + per-IP rate limiting on Citation Engine endpoints"
labels:
  - phase:phase-3
  - area:api
  - area:fraud
  - priority:high
  - type:security
priority: high
depends_on: [P3-017]
milestone: Phase 3 — Citation Engine
estimate: S
---

# [Phase 3] Implement rate limiting on Citation Engine endpoints

## Summary

Per-agent (ApiKey-scoped) and per-IP rate limits on every Citation Engine endpoint. Token-bucket with 100-req burst budget over 10s.

## Acceptance criteria

- [ ] `@nestjs/throttler` config: 600 req/min default per ApiKey.
- [ ] Per-IP: 100 req/min unauthenticated, 2000 req/min authenticated.
- [ ] Burst budget: 100 req in 10s (token bucket).
- [ ] `NP_RATE_LIMITED` error with `Retry-After` header.
- [ ] Unit tests for every limit.

## Dependencies

- P3-017 (controllers)