# `registry/` — Creator Resolution

> Resolves a Source to one or more Creators + Wallets. Handles ownership disputes, organization splits, royalty splits. Documented in [`docs/citation-engine.md`](../../../docs/citation-engine.md#stage-6--creator-resolution) and [`docs/phase-2-creator-registry.md`](../../../docs/phase-2-creator-registry.md).

## Purpose

After a Citation is matched to a Source, we need to know **who gets paid**:
- The Creator who registered the Source.
- Or the Organization that owns it (and the role-based split).
- Or a co-author with `pricing.splits[]`.
- Or a disputed claim (held in escrow).

This subpackage owns that resolution.

## Files

| File | Responsibility |
|------|----------------|
| `resolver.ts` | `CreatorResolver` top-level. Orchestrates the resolution path. |
| `direct-owner.ts` | Source → Creator (1:1). |
| `org-owner.ts` | Source → Organization → Members (with role-based policy). |
| `splits.ts` | Royalty split application (Creator-configured basisPoints). |
| `disputes.ts` | Resolve ambiguous ownership claims to `PendingOwnership` queue. |
| `wallet-selector.ts` | Pick the wallet for payout (primary wallet, fallback rules). |
| `policies.ts` | Organization role → split policy (e.g. OWNER: 100%, MEMBER: 0% unless source-owned). |
| `audit.ts` | Build the `resolutionPath` audit object recorded on `CreatorMatch`. |

## Public API

```typescript
export interface CreatorResolver {
  resolve(req: ResolveRequest): Promise<CreatorMatchResult>;
}

export type ResolveRequest = {
  source: Source;       // the matched Source
  span: SpanLocation;
  agentId: string;
  creatorCacheHint?: Creator; // optional, for performance
};

export type CreatorMatchResult = {
  matches: CreatorMatch[];
  disputes: OwnershipDispute[];
  warnings: string[];  // e.g. "OWNERSHIP_DISPUTED", "SPLITS_MISSING"
};
```

## Resolution path

```
Source
  ├── Source.organizationId set?
  │     ├── YES → org-owner.ts → OrganizationMembership[]
  │     │         ├── role = OWNER       → single match (this Creator)
  │     │         ├── role = ADMIN       → single match (this Creator)
  │     │         ├── role = MEMBER      → no match (must claim explicitly)
  │     │         └── role = VIEWER      → no match
  │     │       └── pricing.splits[] applied if configured
  │     └── NO → direct-owner.ts → Creator (1:1)
  │              └── pricing.splits[] applied if configured
  └── ambiguous?  → disputes.ts → flag for review
```

## Warnings emitted

| Warning | Meaning |
|---------|---------|
| `OWNERSHIP_DISPUTED` | Multiple Creators claim this Source |
| `SPLITS_MISSING` | Co-author declared but no splits configured |
| `PRIMARY_WALLET_MISSING` | No verified primary wallet; payout will queue |
| `WALLET_NOT_VERIFIED` | Wallet exists but verification not complete |
| `SOURCE_PAUSED` | Source is `PAUSED`; payout will hold |
| `SOURCE_REJECTED` | Source is `REJECTED`; no payout |

## See also

- [`docs/phase-2-creator-registry.md`](../../../docs/phase-2-creator-registry.md)
- [`docs/wallet-verification.md`](../../../docs/wallet-verification.md)
- [`../core/`](../core/README.md)
- [`../scoring/`](../scoring/README.md)