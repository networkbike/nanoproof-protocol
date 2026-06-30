---
id: P2-004
title: "[Phase 2] Implement ApiKey authentication strategy + guard"
labels:
  - phase:phase-2
  - area:api
  - area:auth
  - priority:high
  - type:auth
priority: high
depends_on:
  - P2-002
estimate: M
---

# [Phase 2] Implement ApiKey authentication strategy + guard

## Summary

Implement API-key based authentication for the creator's own integrations. The strategy looks up the key by prefix, verifies the SHA-256 hash, and resolves `req.auth = { creatorId, apiKeyId, scope, rateLimit }`.

## Files to create

- `apps/api/src/auth/apikey.strategy.ts`
- `apps/api/src/auth/guards/apikey-auth.guard.ts`

## Acceptance criteria

- [ ] `ApiKeyAuthGuard` extracts `Authorization: Bearer np_live_...`.
- [ ] Looks up by prefix (first 12 chars), then `crypto.timingSafeEqual` against `keyHash`.
- [ ] On success, attaches `req.auth = { creatorId, apiKeyId, scope, rateLimit, allowedDomains }`.
- [ ] On failure, throws `UnauthorizedException` with `NP_AUTH_FAILED`.
- [ ] Updates `ApiKey.lastUsedAt`, `lastUsedIp` (debounced — at most once per minute per key).
- [ ] Returns `403` with `NP_RATE_LIMITED` when over the per-key rate limit.
- [ ] Unit test: valid key → success; expired key → 401; revoked key → 401; wrong scope → 403.

## Notes

- Use Node's `crypto.createHash('sha256').update(key).digest()` for hashing.
- Use `crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(stored))` to avoid timing attacks.
- The `allowedDomains` enforcement is applied at the request level (only applies to write operations; reads are unrestricted).

## Dependencies

- P2-002 (Prisma bootstrap)