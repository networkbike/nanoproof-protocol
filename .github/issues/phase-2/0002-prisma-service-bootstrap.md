---
id: P2-002
title: "[Phase 2] Bootstrap NestJS PrismaService + PrismaModule"
labels:
  - phase:phase-2
  - area:api
  - priority:high
  - type:infrastructure
priority: high
depends_on:
  - P2-001
estimate: S
---

# [Phase 2] Bootstrap NestJS PrismaService + PrismaModule

## Summary

Wire the Prisma client into NestJS via a global `PrismaModule` + `PrismaService` that handles connect/disconnect lifecycle and exposes a typed `prisma` instance to every module.

## Files to create

- `apps/api/src/infra/prisma/prisma.module.ts`
- `apps/api/src/infra/prisma/prisma.service.ts`

## Acceptance criteria

- [ ] `PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy`.
- [ ] Connects on module init, disconnects on module destroy.
- [ ] Logs connection state to Axiom (`prisma.connected`, `prisma.disconnected`).
- [ ] Exposes a typed `Prisma` namespace via `export type Prisma = PrismaClient;`.
- [ ] `app.module.ts` imports `PrismaModule.forRoot()` as global.
- [ ] Smoke test: `pnpm dev` boots and connects to local Postgres.

## Notes

- Use `@prisma/client@^6` per the workspace catalog.
- Binary targets are already configured for `linux-musl-openssl-3.0.x` (Railway).
- Add a `WithTransaction` helper for compound ops in services.

## Dependencies

- P2-001 (schema)