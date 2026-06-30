# Revenue Allocation

> How Citation payouts are split across Creator, co-authors, Organization, and protocol fee. Atomic USDC accounting with zero-loss guarantees.

---

## Table of contents

- [Purpose](#purpose)
- [Allocation hierarchy](#allocation-hierarchy)
- [Default allocation](#default-allocation)
- [Co-author splits](#co-author-splits)
- [Organization splits](#organization-splits)
- [Recursive royalty splits](#recursive-royalty-splits)
- [Protocol fee](#protocol-fee)
- [Allocation math](#allocation-math)
- [Edge cases](#edge-cases)
- [Time-of-intent vs time-of-settlement](#time-of-intent-vs-time-of-settlement)
- [Multi-currency (future)](#multi-currency-future)
- [See also](#see-also)

---

## Purpose

A single Citation payout may need to flow to multiple destinations:

- **The Creator** who registered the Source.
- **Co-authors** who contributed to the work (declared as splits on the Source).
- **An Organization** that owns the Source (with role-based rules).
- **Recursive sub-Sources** whose work was itself cited (parent-citation splits).
- **The protocol treasury** (for fee).

This document defines the deterministic algorithm that computes the exact atomic-USDC amount per destination for every PaymentIntent.

---

## Allocation hierarchy

Allocation is computed in this order:

```
PaymentIntent.totalAtomic
   │
   ├── 1. Subtract protocol fee (basis points × totalAtomic)
   │      → feeAtomic → treasury vault
   │
   ├── 2. NetAtomic = totalAtomic - feeAtomic
   │
   ├── 3. Apply recursive royalty splits (if Source has sub-Sources)
   │      → subAllocation (sum of sub-Source contributions)
   │      → creatorAllocation = netAtomic - subAllocation
   │
   ├── 4. Apply Organization rule (if Source is org-owned)
   │      → orgAllocation (sum of membership splits)
   │      → directAllocation = creatorAllocation - orgAllocation
   │
   ├── 5. Apply Source-level co-author splits
   │      → split[] per wallet (basis points)
   │
   └── 6. Final per-vault Payout[] rows
```

Every step is **deterministic** and **zero-loss**: at each level, `Σ outputs == input ± rounding ≤ 1 atomic unit`.

---

## Default allocation

If none of the modifiers apply:

```
NetAtomic   = totalAtomic - feeAtomic
Allocation  = [ { walletId: creator.primaryWalletId, amount: netAtomic } ]
```

100% of `netAtomic` lands in the Creator's primary wallet.

---

## Co-author splits

A Source can declare co-authors via `pricing.splits[]`:

```typescript
Source.pricing.splits = [
  { walletId: "wl_main",      basisPoints: 6000 },  // 60%
  { walletId: "wl_coauthor1", basisPoints: 2500 },  // 25%
  { walletId: "wl_coauthor2", basisPoints: 1500 }   // 15%
]
```

For each Citation payout to this Source:

```
For each split in pricing.splits:
  payoutAmount = (netAtomic × split.basisPoints) / 10000
```

Validation:
- Σ basisPoints == 10000
- Each wallet must be verified
- No duplicates within one split set
- Max 5 splits per Source (configurable)

### Per-Source override vs. Creator default

The Source's `pricing.splits` **overrides** the Creator's default vault routing for this Source's payouts. A Creator with multiple Sources can have different splits per Source.

---

## Organization splits

When `Source.organizationId` is set, the Source is org-owned. Org payouts flow per the role matrix:

| Role | Default share | Configurable per Org |
|------|---------------|----------------------|
| `OWNER` | 100% | ✅ |
| `ADMIN` | 100% | ✅ |
| `MEMBER` | 0% (must claim explicitly via Source) | ✅ |
| `VIEWER` | 0% | n/a |

The Org's default split policy is set at `Organization.settings.defaultSplitPolicy`. Sources can override per-Source.

### Example

Org "Open Research Lab" with 3 members:
- Alice (OWNER)
- Bob (ADMIN)
- Carol (MEMBER)

Org's default policy: OWNER gets 60%, ADMIN gets 40%, MEMBER gets 0%.

A Source registered to Alice with `organizationId = "org_orl"`:
- Citation payout flows to Alice (60%) + Bob (40%).

Carol (MEMBER) can claim a Source explicitly:
- Source.pricing.splits = `{ walletId: wl_carol, basisPoints: 10000 }`
- That Source's payouts flow 100% to Carol.

---

## Recursive royalty splits

When a Source is composed of sub-Sources (e.g. an article quotes from 3 papers), Citations to the parent Source trigger payments to both the parent Source's Creators AND the sub-Source Creators.

### Example

```
Article (Creator = Alice)
  ├── quotes Paper 1 (Creator = Bob)
  ├── quotes Paper 2 (Creator = Carol)
  └── quotes Paper 3 (Creator = Dan)

Citation to Article triggers:
  - 50% × basePrice → Alice (composition fee)
  - 50% × basePrice × 0.6 → Bob (Paper 1 attribution)
  - 50% × basePrice × 0.3 → Carol (Paper 2 attribution)
  - 50% × basePrice × 0.1 → Dan (Paper 3 attribution)
```

The `50% × basePrice` parent allocation is configurable per Source via `pricing.compositionFeeBps` (default 5000 = 50%).

### Limits

- Recursion depth: max 3 levels (configurable).
- Each level's allocations must sum to the input (zero-loss).

---

## Protocol fee

The protocol fee is deducted **first**, before any Creator allocation.

```
feeAtomic      = (totalAtomic × PE_PROTOCOL_FEE_BPS) / 10000
netAtomic      = totalAtomic - feeAtomic
treasuryPayout = { vaultId: treasuryVault.id, amountAtomic: feeAtomic }
```

See [`fee-structure.md`](./fee-structure.md) for the full fee schedule.

---

## Allocation math

### Formal definition

For a Citation `c` to Source `s` for Creator `C` with vault `V`:

```
P_c = c.contributionFraction × c.basePriceUsdc    // Citation's payment quote (atomic)
fee = P_c × fee_bps / 10000
N   = P_c - fee                                    // Net

If s.recursiveSubSources.length > 0:
   subTotal = 0
   For each sub in s.recursiveSubSources:
      subAmount = N × composition_fee_bps / 10000 × sub.attributionFraction
      subTotal += subAmount
      allocateTo(sub.creator, subAmount)
   N = N - subTotal

If s.organizationId:
   orgPayouts = applyOrgPolicy(N, s.organizationId, C.role)
   N = N - sum(orgPayouts)
   // orgPayouts queued for distribution

For each split in s.pricing.splits:
   splitAmount = N × split.basisPoints / 10000
   queuePayout(split.walletId, splitAmount)

Σ(all queued payouts) ≤ N (any remainder < 1 atomic unit is rounding)
```

### Rounding

We round **down** at each split. The total payout may be up to `N × splits × (10000 - 1) / 10000^2` smaller than N. The remainder (<1 atomic unit per split) accumulates as protocol credit and is reported in the dashboard.

---

## Edge cases

| Case | Behavior |
|------|----------|
| Source has no splits + no org + no recursive subs | 100% to Creator's primary vault |
| Source has splits summing to < 10000 | Remainder (N - sum) goes to Creator's primary vault |
| Source has splits summing to > 10000 | Reject at registration time |
| Sub-Source is paused | Sub-allocation skipped; remainder rolls up to parent |
| Sub-Source is rejected/archived | Same — skipped |
| Creator's primary wallet unverified | Payout queued until verified |
| Co-author wallet unverified | Payout queued; alert Creator |
| Treasury vault paused | Fall back to alternate treasury vault (config) |
| Composition fee > 50% | Reject at registration (sanity check) |

---

## Time-of-intent vs time-of-settlement

Splits and Org policies are **frozen at PaymentIntent creation**, not at settlement. This means:

- A Creator changes their Source's splits mid-batch → only future Citations get the new splits.
- The current PaymentIntent uses the splits that were active when each Citation was created.

This guarantees that:
- Auditors can replay any Citation and reproduce the same allocation.
- Splits are deterministic per (Citation, policyVersion) pair.

Every PaymentIntent row stamps `splitsHash` (sha256 of the canonical splits JSON). The allocation uses this frozen hash.

---

## Multi-currency (future)

v1.0 is USDC-only. v2.0 introduces chain-portability, which may bring other stablecoins (EURC, etc.). When that lands:

- Each Source declares `pricing.currency`.
- Allocations are computed per currency.
- Treasury vaults are per-currency.

For now, every allocation is in atomic USDC.

---

## See also

- [`payment-engine.md`](./payment-engine.md)
- [`creator-vaults.md`](./creator-vaults.md)
- [`fee-structure.md`](./fee-structure.md)
- [`protocol-spec.md`](./protocol-spec.md#4-economic-rules)