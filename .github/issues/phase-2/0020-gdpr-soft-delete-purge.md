---
id: P2-020
title: "[Phase 2] Implement GDPR erasure job (purge soft-deleted Creators after 30d)"
labels:
  - phase:phase-2
  - area:api
  - priority:low
  - type:compliance
priority: low
depends_on:
  - P2-006
  - P2-016
estimate: S
---

# [Phase 2] Implement GDPR erasure job (purge soft-deleted Creators after 30d)

## Summary

A daily BullMQ job that hard-deletes Creators whose `deletedAt` is older than 30 days, along with all related Wallets, Sources, ApiKeys, OrganizationMemberships, and VerificationChallenges.

## Files to create

- `apps/api/src/common/compliance/gdpr-purge.worker.ts`

## Acceptance criteria

- [ ] Daily cron job.
- [ ] Hard-deletes in a single transaction per Creator.
- [ ] Logs each erasure to the audit log with the Creator ID + original email.
- [ ] Skips Creators with active Wallet balances (defensive — none in Phase 2).
- [ ] Unit test for the deletion query.

## Dependencies

- P2-006 (Creators)
- P2-016 (BullMQ)