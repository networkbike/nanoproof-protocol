---
id: P2-007
title: "[Phase 2] Add Wallet + Address Zod schemas to @nanoproof/shared"
labels:
  - phase:phase-2
  - area:shared
  - priority:high
  - type:validation
priority: high
depends_on: []
estimate: S
status: closed
milestone: phase-2-creator-registry
---

# [Phase 2] Add Wallet + Address Zod schemas to @nanoproof/shared

## Summary

Define Zod schemas for the Wallet resource, including the EIP-55 address validator, network enum, and verification types.

## Files to create

- `packages/shared/src/schemas/wallet.ts`
- `packages/shared/src/schemas/address.ts`

## Acceptance criteria

- [ ] `WalletNetworkSchema` mirrors the Prisma enum.
- [ ] `WalletVerificationStatusSchema` mirrors the Prisma enum.
- [ ] `EthereumAddressSchema` validates `^0x[a-fA-F0-9]{40}$` and normalizes to lowercase.
- [ ] `AttachWalletSchema`, `UpdateWalletSchema`, `WalletSchema`, `WalletChallengeSchema`, `VerifyWalletSchema` exported.
- [ ] `VerifyWalletSchema.signature` matches `^0x[a-fA-F0-9]+$` and is exactly 130 hex chars + `0x` (65 bytes).
- [ ] Unit tests cover valid + invalid inputs.

## Notes

- Use `viem`'s `getAddress()` for canonical EIP-55 form (server-side only — clients send lowercase or checksummed).

## Dependencies

None.


## Resolution

**Status:** ✅ Closed.
**Milestone:** phase-2-creator-registry

packages/shared/src/schemas/wallet.ts: AttachWalletSchema, VerifyChallengeSchema, ListWalletsQuerySchema, EthereumAddressSchema (auto-lowercase).

