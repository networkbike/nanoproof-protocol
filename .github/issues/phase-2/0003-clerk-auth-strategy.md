---
id: P2-003
title: "[Phase 2] Implement Clerk JWT authentication strategy + guard"
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
status: in-progress
milestone: phase-2-creator-registry
---

# [Phase 2] Implement Clerk JWT authentication strategy + guard

## Summary

Implement Clerk-based JWT verification for human users (creators, org admins). The strategy resolves a `req.user = { creatorId, clerkUserId, email }` and is exposed via `ClerkAuthGuard` + `@CurrentCreator()` decorator.

## Files to create

- `apps/api/src/auth/clerk.strategy.ts`
- `apps/api/src/auth/guards/clerk-auth.guard.ts`
- `apps/api/src/auth/decorators/current-creator.decorator.ts`

## Acceptance criteria

- [ ] `ClerkAuthGuard` extends `AuthGuard('clerk')` (or a NestJS-native equivalent) and verifies JWT via `@clerk/backend`.
- [ ] On success, attaches `req.auth = { clerkUserId, email }`.
- [ ] On failure, throws `UnauthorizedException` with `NP_AUTH_FAILED`.
- [ ] `@CurrentCreator()` decorator extracts the resolved Creator from `req.auth`.
- [ ] `/v1/healthz` is exempted via `@Public()` decorator.
- [ ] Unit test: signed JWT → success; expired JWT → 401; wrong audience → 401.

## Notes

- Clerk's `verifyToken({ token, secretKey, jwtKey })` is the canonical call.
- Map Clerk userId → Creator via `Creator.email` lookup (one Creator per Clerk user).
- Use `AppJwtTemplate` from Clerk's dashboard for the issuer/audience.

## Dependencies

- P2-002 (Prisma bootstrap)
