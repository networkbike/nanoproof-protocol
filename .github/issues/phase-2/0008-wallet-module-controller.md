---
id: P2-008
title: "[Phase 2] Implement Wallet module — controller + service + repository"
labels:
  - phase:phase-2
  - area:api
  - area:wallets
  - priority:high
  - type:feature
priority: high
depends_on:
  - P2-002
  - P2-007
estimate: M
---

# [Phase 2] Implement Wallet module — controller + service + repository

## Summary

Implement Wallet CRUD endpoints (POST, GET list, PATCH :id). Verification endpoints (`POST :id/challenge`, `POST :id/verify`) are split into a separate issue (P2-009).

## Files to create

- `apps/api/src/wallets/wallets.module.ts`
- `apps/api/src/wallets/wallets.controller.ts`
- `apps/api/src/wallets/wallets.service.ts`
- `apps/api/src/wallets/wallets.repository.ts`
- `apps/api/src/wallets/dto/attach-wallet.dto.ts`
- `apps/api/src/wallets/dto/update-wallet.dto.ts`
- `apps/api/src/wallets/dto/index.ts`

## Acceptance criteria

- [ ] `POST /v1/wallets` attaches a wallet to the authenticated Creator.
- [ ] `(address, network)` uniqueness enforced.
- [ ] Address stored lowercase; checksummed returned to clients.
- [ ] `isPrimary` toggle enforces at-most-one primary per network per Creator.
- [ ] Setting `isPrimary: true` demotes other primary wallets on the same network in a transaction.
- [ ] `PATCH /v1/wallets/:id` only allows `label` and `isPrimary` updates.
- [ ] Emits `wallet.added`, `wallet.updated` events.
- [ ] Unit + integration tests for every endpoint and error path.

## Notes

- Reference [`docs/wallet-verification.md`](../../../docs/wallet-verification.md) for the full data model.

## Dependencies

- P2-002 (Prisma)
- P2-007 (Wallet schemas)