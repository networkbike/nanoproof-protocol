---
milestone: mvp-scaffolding
title: MVP Scaffolding
state: closed
description: |
  Monorepo wired end-to-end: NestJS api, Next.js web, packages/shared,
  Postgres + Redis docker compose, Prisma schema v1, NP_* error catalog,
  docs. No business logic — phase 2 lands the real Creator Registry.
due_on: 2026-07-08
---

## Acceptance

- [x] `pnpm install` succeeds in a clean clone
- [x] `pnpm dev` brings up api (4000) + web (3000) in parallel
- [x] `docker compose up -d` brings up Postgres 16 + Redis 7
- [x] `prisma migrate dev` applies the v1 schema cleanly
- [x] `prisma db seed` inserts the demo creator + wallet + source
- [x] Swagger UI loads at `/docs`
- [x] `/dashboard` renders with seeded data
- [x] `/simulate` round-trips a citation + payment through the api

## Linked issues

None (foundation milestone).