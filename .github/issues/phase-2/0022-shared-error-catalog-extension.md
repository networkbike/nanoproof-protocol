---
id: P2-022
title: "[Phase 2] Extend shared NP_* error catalog with Phase 2 codes"
labels:
  - phase:phase-2
  - area:shared
  - priority:high
  - type:validation
priority: high
depends_on: []
estimate: S
---

# [Phase 2] Extend shared NP_* error catalog with Phase 2 codes

## Summary

Add every `NP_*` error code referenced in the Phase 2 OpenAPI spec and docs into `@nanoproof/shared/errors`.

## Files to create

- `packages/shared/src/errors/index.ts` updates

## Codes to add

```typescript
export const Errors = {
  // Generic
  NP_VALIDATION_FAILED,
  NP_AUTH_FAILED,
  NP_FORBIDDEN,
  NP_RATE_LIMITED,
  NP_NOT_FOUND,

  // Creator
  NP_CREATOR_NOT_FOUND,
  NP_USERNAME_TAKEN,
  NP_EMAIL_TAKEN,
  NP_USERNAME_RESERVED,
  NP_INVALID_AVATAR_URL,

  // Wallet
  NP_WALLET_NOT_FOUND,
  NP_WALLET_ALREADY_VERIFIED,
  NP_WALLET_ALREADY_ADDED,
  NP_INVALID_ADDRESS,
  NP_INVALID_SIGNATURE,

  // Source
  NP_SOURCE_NOT_FOUND,
  NP_SOURCE_ALREADY_VERIFIED,
  NP_INVALID_VERIFICATION_METHOD,
  NP_DENIED_HOST,
  NP_PROBE_TIMEOUT,
  NP_PROBE_FAILED,

  // Shared verification
  NP_CHALLENGE_NOT_FOUND,
  NP_CHALLENGE_EXPIRED,
  NP_CHALLENGE_CONSUMED,

  // Organization
  NP_ORGANIZATION_NOT_FOUND,
  NP_ORGANIZATION_FORBIDDEN,

  // ApiKey
  NP_APIKEY_NOT_FOUND,
  NP_APIKEY_REVOKED,
};
```

## Acceptance criteria

- [ ] Every code has a stable HTTP status mapping.
- [ ] Every code has a default human message.
- [ ] Exported as both string constants and a Zod-validated error schema.
- [ ] Unit test ensures no two codes collide.

## Dependencies

None.