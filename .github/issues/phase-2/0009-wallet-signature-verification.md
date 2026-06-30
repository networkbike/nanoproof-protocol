---
id: P2-009
title: "[Phase 2] Implement EIP-191 wallet signature verification"
labels:
  - phase:phase-2
  - area:api
  - area:wallets
  - area:auth
  - priority:high
  - type:security
priority: high
depends_on:
  - P2-008
estimate: M
---

# [Phase 2] Implement EIP-191 wallet signature verification

## Summary

Implement the canonical challenge → sign → verify flow for wallet ownership proof. Uses `viem.verifyMessage` and the message format documented in [`docs/wallet-verification.md`](../../../docs/wallet-verification.md).

## Files to create

- `apps/api/src/wallets/verification/challenge.service.ts`
- `apps/api/src/wallets/verification/signature.service.ts`
- `apps/api/src/wallets/verification/wallets-verification.controller.ts`
- `apps/api/src/wallets/dto/verify-wallet.dto.ts`

## Acceptance criteria

- [ ] `POST /v1/wallets/:id/challenge` issues a VerificationChallenge (15min TTL).
- [ ] Challenge is stored in `verification_challenges` table with `kind = 'wallet'`.
- [ ] Canonical message format matches the spec exactly.
- [ ] `POST /v1/wallets/:id/verify` consumes the challenge, recovers the signer via `viem.verifyMessage`, marks `VERIFIED` on match.
- [ ] Replay protection: consumed challenges cannot be re-verified.
- [ ] Rate limit: 5 challenges / wallet / hour, 20 verifies / IP / hour.
- [ ] Emits `wallet.verified` event on success.
- [ ] Unit tests + integration test against a known private key → recovered address.
- [ ] E2E test: full challenge → sign → verify flow.

## Notes

- Reference implementation contract in [`docs/wallet-verification.md`](../../../docs/wallet-verification.md).
- Use a deterministic test signer (well-known private key) for integration tests.

## Dependencies

- P2-008 (Wallet CRUD)