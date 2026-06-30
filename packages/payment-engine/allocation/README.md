# `allocation/` — Revenue Allocation

> Applies the deterministic algorithm from [`docs/revenue-allocation.md`](../../../docs/revenue-allocation.md). Pure functions; no I/O.

## Files

| File | Responsibility |
|------|----------------|
| `allocator.ts` | Top-level: PaymentIntent + vault/splits/org config → Payout[]. |
| `direct-owner.ts` | Source → Creator 1:1 default. |
| `org-splitter.ts` | Apply Organization role-based policy. |
| `recursive-royalties.ts` | Sub-Source attribution splits. |
| `protocol-fee.ts` | Compute + deduct protocol fee. |
| `splits-engine.ts` | basisPoints → per-wallet atomic amounts. |
| `rounding.ts` | Floor rounding + remainder accounting. |
| `policy.ts` | Loads allocation policy version from env. |

## Public API

```typescript
export interface Allocator {
  allocate(req: AllocateRequest): Promise<AllocationResult>;
}

export type AllocateRequest = {
  paymentIntent: PaymentIntent;
  source: Source;
  creator: Creator;
  vaults: Vault[];
  organization?: Organization;
  orgMemberships?: OrganizationMembership[];
  recursiveSubSources?: Array<{ source: Source; attributionFraction: string }>;
};

export type AllocationResult = {
  payouts: PayoutAllocation[];
  feeAtomic: string;
  netAtomic: string;
  splitsHash: string;
  warnings: string[];
};

export type PayoutAllocation = {
  vaultId: string;
  walletAddress: string;
  amountAtomic: string;
  basisPoints: number;
  splitsHash: string;
};
```

## Allocation order

```
totalAtomic
   │
   ├── protocol fee
   │
   ├── recursive royalties (sub-sources)
   │
   ├── organization policy
   │
   ├── source-level splits
   │
   └── remainder → Creator's primary vault
```

Every step is deterministic and **zero-loss**: Σ outputs == input ± rounding.

## See also

- [`docs/revenue-allocation.md`](../../../docs/revenue-allocation.md)
- [`docs/fee-structure.md`](../../../docs/fee-structure.md)
- [`../core/`](../core/README.md)