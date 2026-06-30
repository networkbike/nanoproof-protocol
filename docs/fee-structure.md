# Fee Structure

> How NanoProof charges for the service, who pays what, where the money goes, and how we keep fees fair and predictable.

---

## Table of contents

- [Purpose](#purpose)
- [Fee components](#fee-components)
- [Default fee schedule](#default-fee-schedule)
- [Who pays](#who-pays)
- [Batching tier fees](#batching-tier-fees)
- [Volume discounts](#volume-discounts)
- [Gas economics](#gas-economics)
- [Treasury accrual](#treasury-accrual)
- [Fee transparency](#fee-transparency)
- [Refund / clawback accounting](#refund--clawback-accounting)
- [Future: dynamic fees](#future-dynamic-fees)
- [Configuration](#configuration)
- [See also](#see-also)

---

## Purpose

Fees must:

1. **Cover costs** — gas, hosting, audits, treasury reserves.
2. **Be predictable** — agents know the cost before submitting a Citation.
3. **Be fair** — volume discounts reward high-throughput agents.
4. **Be transparent** — every fee is itemized on every Receipt.
5. **Not gouge creators** — creators receive the bulk of every payout.

This document is the canonical fee schedule.

---

## Fee components

Every settled Receipt carries three line items:

```
┌────────────────────────────────────────────────────┐
│  PaymentIntent: $0.50 USDC                         │
│  ┌──────────────────────────────────────────┐     │
│  │  Protocol fee:    $0.0025  (0.5%)        │     │
│  │  Gas (amortized):  $0.0001                │     │
│  │  Creator payout:   $0.4974                │     │
│  └──────────────────────────────────────────┘     │
└────────────────────────────────────────────────────┘
```

| Component | Default | Description |
|-----------|---------|-------------|
| **Protocol fee** | 0.5% (50 bps) | Funds treasury + ops |
| **Gas fee (amortized)** | variable | Per-payout share of Arc tx gas |
| **Creator payout** | remainder | Goes to Creator's vault |

Total Creator share: **~99.5%** at default settings.

---

## Default fee schedule

| Tier | Monthly volume | Protocol fee (bps) | Gas amortization | Notes |
|------|---------------|--------------------|------------------|-------|
| **Free** | < $1,000 USDC | 50 | included | Default for new agents |
| **Growth** | $1k - $10k USDC | 40 | included | 20% protocol fee discount |
| **Scale** | $10k - $100k USDC | 30 | included | 40% discount |
| **Enterprise** | > $100k USDC | 20 | included | 60% discount, custom contract |

Tier eligibility is auto-assessed monthly based on prior 30-day volume. Volume is measured in `totalAtomic` of settled Receipts.

### Fee-in-advance vs. fee-in-arrears

We charge **fee-in-arrears**:
- Deduct fee from each PaymentIntent as it settles.
- Track each agent's monthly cumulative fee.
- Apply tier discount retroactively at month-end (rebate).

This minimizes friction for new agents while rewarding loyalty.

---

## Who pays

The **agent** pays all fees, deducted from the total before creator allocation:

```
totalAtomic    = Σ (Citation × basePrice)
feeAtomic      = totalAtomic × fee_bps / 10000
netAtomic      = totalAtomic - feeAtomic
treasuryPayout = feeAtomic
creatorPayout  = netAtomic
```

Creators receive `netAtomic`. Agents effectively pay `totalAtomic`, but only `netAtomic` is split among creators.

---

## Batching tier fees

Creators can opt into faster or slower batching windows:

| Window | Fee modifier | Trade-off |
|--------|--------------|-----------|
| **5 min** | + 0.1% (10 bps) | Fastest; most tx overhead |
| **1 h** | ± 0% (default) | Balanced |
| **24 h** | − 0.1% (10 bps discount) | Slowest; cheapest gas |

The fee modifier is applied per-Source via `Source.pricing.batchingTier`. Default = `1h`.

---

## Volume discounts

### Calculation

```
prior30dVolume = sum(settled Receipts for agent in last 30 days)
tier = lookupTier(prior30dVolume)
feeBps = tier.protocolFeeBps
```

Tiers are recomputed hourly. The agent's current tier is visible at `GET /v1/agents/me/tier`.

### Rebate logic

```
At month-end:
  for each agent:
    actualFeeBps = average bps applied over the month
    tierFeeBps   = tier at month-end
    if tierFeeBps < actualFeeBps:
      rebateAtomic = totalVolume × (actualFeeBps - tierFeeBps) / 10000
      creditRebateToAgent(agent, rebateAtomic)
```

Rebates are settled on the first day of the next month via a dedicated `RebatePaymentIntent`.

---

## Gas economics

### Per-payout gas cost

Arc native USDC gas for a `USDC.transfer` call:

```
gas_per_transfer = ~65,000 gas units
gas_price        = ~$0.00001 per gas unit (Arc native USDC)
cost_per_payout   = ~$0.00065 USDC
```

When batched via Circle Gateway:

```
gas_per_batch     = 65,000 × N + 21,000  (overhead)
gas_price         = ~$0.00001
cost_per_batch    = ~0.00065 × N + 0.00021 USDC
cost_per_payout   = ~0.00066 USDC (for N=1000)
```

### Who pays gas

The agent's hot wallet pays gas. The gas cost is amortized into the per-payout fee:

```
gasAmortizationAtomic = ceil(totalGasCostAtomic / payoutCount)
```

For a 1000-payout batch: `gasAmortizationAtomic ≈ 660` ($0.00066 USDC per payout).

### When batching fails

If Gateway batching fails and we fall back to direct settlement, each payout is its own tx:

```
gas_per_payout_individual = ~0.00065 USDC
```

Amortization doesn't help in fallback mode. We surface this in the dashboard and recommend retrying.

---

## Treasury accrual

Every PaymentIntent's `feeAtomic` flows to the treasury vault on Arc:

```
USDC.transfer(agentHotWallet, treasuryVault, feeAtomic)
```

This is part of the same Gateway batch as the creator payouts — atomic with them.

### Treasury log

Every fee accrual writes a `TreasuryTransaction` row:

```typescript
type TreasuryTransaction = {
  id: string;                     // "tt_<ulid>"
  paymentIntentId: string;        // source
  agentId: string;
  type: "FEE_ACCRUAL" | "REFUND" | "REBATE" | "TOPUP" | "WITHDRAWAL" | "CLAWBACK";
  amountAtomic: string;           // signed: positive = inflow, negative = outflow
  balanceAfterAtomic: string;     // treasury balance after this tx
  txHash: string;                 // onchain reference
  arcScanUrl: string;
  reason?: string;
  createdAt: Date;
};
```

The full ledger is public via `GET /v1/treasury/transactions`.

---

## Fee transparency

Every Receipt includes a fee breakdown:

```json
{
  "totalAtomic": "500000",
  "feeAtomic": "2500",
  "netAtomic": "497500",
  "feeBreakdown": {
    "protocolFeeBps": 50,
    "protocolFeeAtomic": "2500",
    "gasAmortizationAtomic": "660",
    "tier": "Growth",
    "rebateEligible": true
  },
  "creatorPayouts": [
    { "vaultId": "vlt_...", "amountAtomic": "348250" },  // 70%
    { "vaultId": "vlt_...", "amountAtomic": "149250" }   // 30%
  ]
}
```

Agents see the exact breakdown on every Receipt. Creators see the net amount + the gas share they indirectly cover (for transparency).

---

## Refund / clawback accounting

When a dispute resolves in PAYOUT_REVERSE:

```
1. The original fee is NOT refunded (treasury kept the work).
2. The original payout is clawed back from the Creator.
3. The clawback is recorded as a TreasuryTransaction of type CLAWBACK.
4. The Creator's net earnings decrease accordingly.
5. The Source's earnedAtomic is recomputed.
```

When a dispute resolves in PAYOUT_RELEASE:

```
1. The original payout remains.
2. No treasury transaction (treasury didn't act).
3. Source's earnedAtomic is unchanged.
```

When an agent receives a rebate:

```
1. A RebatePaymentIntent is created.
2. feeAtomic from the rebate flows back to the agent's hot wallet.
3. Recorded as TreasuryTransaction of type REBATE.
```

---

## Future: dynamic fees

Phase 9+ may introduce:

| Feature | Description |
|---------|-------------|
| **Stablecoin-pair fees** | Lower fees for agents paying in EURC vs. USDC |
| **Quality-based fees** | Lower fees for high-reputation agents |
| **Network-aware fees** | Higher fees on congested chains (v2.0+) |
| **Subscription plans** | Flat monthly fee + zero per-payout fees |

For now, v1.0 ships the simple tier schedule.

---

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `PE_PROTOCOL_FEE_BPS` | `50` | Default fee in basis points |
| `PE_GAS_PRICE_OVERRIDE` | (none) | Override Arc gas price (for testing) |
| `PE_TIER_THRESHOLDS` | `1000000000,10000000000,100000000000` | Volume thresholds (atomic) for tier transitions |
| `PE_BATCHING_TIER_5MIN_BPS` | `10` | Fee modifier for 5min batching |
| `PE_BATCHING_TIER_24H_BPS` | `-10` | Fee modifier for 24h batching |
| `PE_REBATE_ENABLED` | `true` | Whether to issue monthly rebates |
| `PE_MIN_FEE_ATOMIC` | `1` | Floor on fee (1 atomic unit = $0.000001) |

---

## Fee schedule history

| Version | Date | Change |
|---------|------|--------|
| v1.0 | 2026-07 | Initial 0.5% flat fee + tier discounts |
| (future) | — | Dynamic fees per agent reputation |

---

## See also

- [`payment-engine.md`](./payment-engine.md)
- [`treasury-management.md`](./treasury-management.md)
- [`revenue-allocation.md`](./revenue-allocation.md)
- [`creator-vaults.md`](./creator-vaults.md)
- [`payout-workflows.md`](./payout-workflows.md)