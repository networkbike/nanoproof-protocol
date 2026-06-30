---
id: P2-016
title: "[Phase 2] Set up BullMQ + Redis for verification retries"
labels:
  - phase:phase-2
  - area:api
  - priority:medium
  - type:infrastructure
priority: medium
depends_on:
  - P2-002
estimate: M
---

# [Phase 2] Set up BullMQ + Redis for verification retries

## Summary

Provision BullMQ on Railway Redis for verification retry scheduling, webhook fanout, and future payment batching.

## Files to create

- `apps/api/src/infra/queue/queue.module.ts`
- `apps/api/src/infra/queue/queue.service.ts`
- `apps/api/src/infra/queue/queue.config.ts`

## Acceptance criteria

- [ ] `QueueModule` exports `QueueService` with typed methods: `enqueueVerificationRetry`, `enqueueWebhook`, `enqueuePayout` (stub).
- [ ] Queues: `verification`, `webhooks`, `payments`.
- [ ] Backoff: exponential with jitter; max 5 retries; permanent-failure handler logs + emits a structured event.
- [ ] Connection from `REDIS_URL` env var.
- [ ] Workers run in the same Node process for now (Phase 9 moves them to separate Railway services).
- [ ] Health check includes Redis ping.

## Dependencies

- P2-002 (Prisma)