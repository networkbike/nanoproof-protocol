---
id: P4-023
title: "[Phase 4] Implement rate limiting on Payment Engine endpoints"
labels:
  - phase:phase-4
  - area:api
  - area:payment-engine
  - priority:high
  - type:security
priority: high
depends_on: [P4-014]
milestone: Phase 4 — Payment Engine
estimate: S
---

# [Phase 4] Implement rate limiting on Payment Engine endpoints

## Summary

Per-agent + per-IP rate limits on every Payment Engine endpoint.

## Acceptance criteria

- [ ] `@nestjs/throttler`: 600 req/min per ApiKey.
- [ ] Per-IP: 100 req/min unauthenticated, 2000/min authenticated.
- [ ] Per-Agent outbound settlement: 100/hour.
- [ ] `NP_RATE_LIMITED` with `Retry-After` header.
- [ ] Unit tests.

## Dependencies

- P4-014