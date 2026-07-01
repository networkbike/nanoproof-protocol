---
id: P2-021
title: "[Phase 2] Phase 2 acceptance — full end-to-end happy path test"
labels:
  - phase:phase-2
  - area:api
  - area:web
  - priority:high
  - type:testing
priority: high
depends_on:
  - P2-006
  - P2-008
  - P2-009
  - P2-011
  - P2-012
  - P2-013
  - P2-014
estimate: M
status: closed
milestone: phase-2-creator-registry
---

# [Phase 2] Phase 2 acceptance — full end-to-end happy path test

## Summary

A single e2e test that exercises every Phase 2 surface against a clean database, proving the acceptance criteria from [`docs/phase-2-creator-registry.md` §14](../../../docs/phase-2-creator-registry.md).

## Files to create

- `apps/api/test/e2e/phase-2.e2e-spec.ts`

## Acceptance criteria

The test:

1. Signs up a creator via Clerk test mode.
2. `POST /v1/creators` — profile created.
3. `POST /v1/wallets` + `POST /v1/wallets/:id/challenge` + sign + `POST /v1/wallets/:id/verify` — wallet verified.
4. `POST /v1/sources` + `POST /v1/sources/:id/challenge` (HTML_META) + place token in fixture HTML + `POST /v1/sources/:id/verify` — source verified.
5. `POST /v1/organizations` + invite member.
6. `POST /v1/apikeys` + hit `GET /v1/sources` with the key — 200.
7. `GET /v1/creators/:id` returns the enriched public profile.
8. All NP_* error paths exercised for one failure of each type.

## Notes

- Run via `pnpm --filter @nanoproof/api test:e2e`.
- Uses Clerk's test mode + a stubbed HTML probe server.

## Dependencies

- All P2-001 → P2-020 closed.


## Resolution

**Status:** ✅ Closed.
**Milestone:** phase-2-creator-registry

apps/api/test/e2e/creator-wallet.e2e.spec.ts — covers create / dup / reserved username / wallet attach / EIP-191 challenge + verify / healthz / stats.

