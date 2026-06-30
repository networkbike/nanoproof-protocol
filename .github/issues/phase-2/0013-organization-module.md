---
id: P2-013
title: "[Phase 2] Implement Organization module + memberships"
labels:
  - phase:phase-2
  - area:api
  - area:organizations
  - priority:medium
  - type:feature
priority: medium
depends_on:
  - P2-002
  - P2-006
estimate: M
---

# [Phase 2] Implement Organization module + memberships

## Summary

Implement Organization CRUD plus membership management (invite / update role / remove).

## Files to create

- `apps/api/src/organizations/organizations.module.ts`
- `apps/api/src/organizations/organizations.controller.ts`
- `apps/api/src/organizations/organizations.service.ts`
- `apps/api/src/organizations/organizations.repository.ts`
- `apps/api/src/organizations/dto/*`

## Acceptance criteria

- [ ] All 5 endpoints functional per OpenAPI spec (`POST`, `GET list`, `GET :id`, `POST :id/members`, `PATCH :id/members/:memberId`, `DELETE :id/members/:memberId`).
- [ ] `slug` uniqueness + format enforced.
- [ ] First member is automatically `OWNER` (the creator who created the org).
- [ ] Role changes restricted to `OWNER`/`ADMIN`.
- [ ] Member removal cascades cleanly.
- [ ] Emits `organization.created`, `member.added`, `member.role_changed`, `member.removed`.
- [ ] Unit + integration tests.

## Notes

- Optional feature for Phase 2 — can be deferred if scope slips, but it's a hard prerequisite for any team-style submission to Lepton.

## Dependencies

- P2-002 (Prisma)
- P2-006 (Creators)