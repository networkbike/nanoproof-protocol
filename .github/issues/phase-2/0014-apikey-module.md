---
id: P2-014
title: "[Phase 2] Implement ApiKey module — issue / list / revoke"
labels:
  - phase:phase-2
  - area:api
  - area:apikeys
  - priority:high
  - type:auth
priority: high
depends_on:
  - P2-002
  - P2-004
estimate: M
---

# [Phase 2] Implement ApiKey module — issue / list / revoke

## Summary

Implement API-key issuance. Plaintext returned exactly once at creation; only SHA-256 hash stored.

## Files to create

- `apps/api/src/apikeys/apikeys.module.ts`
- `apps/api/src/apikeys/apikeys.controller.ts`
- `apps/api/src/apikeys/apikeys.service.ts`
- `apps/api/src/apikeys/apikeys.repository.ts`
- `apps/api/src/apikeys/token.ts`
- `apps/api/src/apikeys/dto/*`

## Acceptance criteria

- [ ] `POST /v1/apikeys` issues a key. Plaintext returned ONLY in this response.
- [ ] Plaintext format: `np_live_<32 url-safe base64 chars>`.
- [ ] Only the SHA-256 hash + 12-char prefix are persisted.
- [ ] `GET /v1/apikeys` lists keys with `id`, `prefix`, `name`, `scope`, `active`, `lastUsedAt`, `createdAt` (never `keyHash`, never `plaintext`).
- [ ] `DELETE /v1/apikeys/:id` revokes (sets `active = false`, `revokedAt`, optional `revokedReason`).
- [ ] Emits `apikey.issued`, `apikey.revoked` events.
- [ ] Unit + integration tests.

## Notes

- `crypto.randomBytes(32).toString('base64url')` for token generation.
- Define the `ApiKeyScope` enforcement in the guard (P2-004).

## Dependencies

- P2-002 (Prisma)
- P2-004 (ApiKey auth)