# ADR 0005: Wallet Key Management

- **Status:** Proposed
- **Date:** 2026-06-30
- **Authors:** @networkbike

## Context and Problem Statement

The agent hot wallet signs every PaymentIntent execution. In production, this private key must be HSM-backed or MPC-distributed. For the Lepton hackathon, simpler options are acceptable.

## Decision Drivers

- **Funds safety.**
- **Operational simplicity.**
- **Cost.**

## Considered Options

1. **Env vars on Vercel/Railway.**
2. **AWS KMS / GCP KMS.**
3. **Fireblocks / Turnkey.**
4. **Self-hosted Lit Protocol.**

## Decision Outcome

**Chosen option:** **1 for Lepton, 2 or 3 for public beta (Phase 9).**

- **Lepton (now):** Agent hot wallet private key is stored as a Railway env var. Acceptable for testnet USDC and a hackathon window.
- **Public Beta (Phase 9):** Migrate to AWS KMS or a managed MPC provider before any real funds are accepted.

### Positive Consequences

- Ships fast.
- Path to production hardening is clear.

### Negative Consequences

- Env vars are a known weak spot. Anyone with Railway console access can drain the hot wallet.

## References

- [`architecture.md`](../architecture.md#wallet-key-management)
- [`SECURITY.md`](../../SECURITY.md)