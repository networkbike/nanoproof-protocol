---
milestone: phase-2-creator-registry
title: Phase 2 — Creator Registry
state: open
description: |
  Public API surface for creators to register, verify their handle,
  attach Arc wallets (EIP-191 verified), register Sources (URL/DNS/file
  verified), and mint ApiKeys. Closes the gap between anonymous agents
  and identified humans.
due_on: 2026-07-22
---

## Acceptance

- [ ] `POST /v1/creators` creates a Creator with username + email uniqueness + reserved-name blocklist
- [ ] `POST /v1/wallets/verify` performs EIP-191 signature challenge and flips `verificationStatus` to VERIFIED
- [ ] `POST /v1/sources` creates a Source, derives `domain`, runs the verification worker (DNS / HTML / file)
- [ ] `POST /v1/api-keys` mints a key shown once + prefix-stored hash
- [ ] Cursor pagination on all list endpoints
- [ ] Idempotency keys on every POST (24h cache, replay-safe)
- [ ] Clerk JWT auth middleware
- [ ] OpenAPI spec matches the live API
- [ ] Vitest suite at ≥80% coverage on services

## Linked issues

22 tickets under `.github/issues/phase-2/` (P2-001 .. P2-022).