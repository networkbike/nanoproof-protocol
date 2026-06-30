# ADR 0001: Protocol Portability Across Chains

- **Status:** Proposed
- **Date:** 2026-06-30
- **Authors:** @networkbike

## Context and Problem Statement

NanoProof settles USDC nanopayments on Arc L1 today. Arc meets the per-payment cost bar (~$0.01 USDC fees, <500ms finality). But other chains — Tempo, Base, and any future stablecoin-native L1 — also meet the bar in principle.

**Question:** Should the v1.0 protocol spec be Arc-only, or should it describe a portable shape that any sufficiently fast + cheap chain can implement?

## Decision Drivers

- **Time to market** — Lepton submission deadline is Jul 6, 2026.
- **Hackathon partner alignment** — Canteen + Circle are running Lepton; Arc is the host chain.
- **Adoption potential** — creators and agents exist on every chain.
- **Engineering surface** — every chain adapter is code to maintain, test, and audit.

## Considered Options

1. **Arc-only at v1.0, portable at v2.0.**
2. **Portable from day one (Arc + Base at v1.0).**
3. **Chain-agnostic spec, no reference implementation.**

## Decision Outcome

**Chosen option:** **1. Arc-only at v1.0, portable at v2.0.**

Rationale: shipping a Lepton-quality demo on Arc in 3 weeks is the priority. Adding Base or Tempo as a v1.0 settlement target would roughly double the implementation, testing, and audit surface. v2.0 (post-public-beta) introduces portability once we have at least one second partner chain with production-grade testnet support.

### Positive Consequences

- Ships on schedule for Lepton.
- Single chain = simpler smart contracts, simpler payment engine, simpler audit story.
- Leans into the Canteen + Circle partnership.

### Negative Consequences

- Limits adoption from creators and agents who prefer other chains.
- Migration to v2.0 will be a non-trivial protocol upgrade.

## Pros and Cons of the Options

### Option 1 — Arc-only at v1.0

- ✅ Ships on time.
- ✅ Simpler implementation, audit, and ops story.
- ✅ Strong alignment with Lepton partners.
- ❌ Limits early adoption from other chains.

### Option 2 — Portable from day one

- ✅ Maximum addressable audience from v1.0.
- ❌ ~2× engineering surface for v1.0.
- ❌ Higher risk of missing Lepton deadline.
- ❌ More contracts to audit.

### Option 3 — Chain-agnostic spec, no reference impl

- ✅ Maximum theoretical portability.
- ❌ No working demo = bad hackathon signal.
- ❌ Spec divergence from any real implementation.

## References

- [`architecture.md`](../architecture.md#protocol-portability)
- [ARC L1 docs](https://arc.io)
- Lepton Hackathon announcement (Jun 15, 2026)