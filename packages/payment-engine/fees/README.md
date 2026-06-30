# `fees/` — Fee Schedule + Tier Evaluation

> Per-agent fee tiers, quoting, and monthly rebate evaluation.

## Files

| File | Responsibility |
|------|----------------|
| `fee-calculator.ts` | Compute protocol fees for a given PaymentIntent. |
| `tier-evaluator.ts` | Evaluate tier based on rolling 30d volume. |
| `rebate-engine.ts` | Monthly rebate calculation + execution. |
| `gas-amortizer.ts` | Compute per-payout gas share from batch gas cost. |
| `volume-tracker.ts` | Track rolling 30d volume per agent. |
| `policy.ts` | Loads fee policy version from env. |

## Public API

```typescript
export interface FeeCalculator {
  compute(req: ComputeFeeRequest): Promise<FeeQuote>;
}

export interface TierEvaluator {
  evaluate(agentId: string): Promise<{ tier: FeeTier; effectiveAt: Date }>;
}

export interface RebateEngine {
  evaluateForPeriod(periodYear: number, periodMonth: number): Promise<RebatePaymentIntent[]>;
  execute(rebateId: string): Promise<PaymentIntent>;
}

export interface GasAmortizer {
  amortize(batchGasCostAtomic: bigint, payoutCount: number): bigint;
}
```

## Fee calculation

```
feeAtomic = totalAtomic × feeBps / 10000
gasAmortizationAtomic = ceil(batchGasCostAtomic / payoutCount)
netAtomic = totalAtomic - feeAtomic
```

The `feeBps` is determined by the agent's current tier (default 50 = 0.5%).

## Tier evaluation

| Tier | Volume threshold (atomic) | Fee (bps) |
|------|--------------------------|-----------|
| FREE | 0 | 50 |
| GROWTH | 1,000,000,000 ($1k) | 40 |
| SCALE | 10,000,000,000 ($10k) | 30 |
| ENTERPRISE | 100,000,000,000 ($100k) | 20 |

Evaluated hourly by `TierEvaluator`.

## Rebate logic

```
At month-end:
  for each agent:
    actualAvgBps = average bps applied this month
    currentTierBps = tier at month-end
    if currentTierBps < actualAvgBps:
      rebateAtomic = totalVolume × (actualAvgBps - currentTierBps) / 10000
      create RebatePaymentIntent(agent, rebateAtomic)
      execute as standard PaymentIntent (sends to agent hot wallet)
```

## See also

- [`docs/fee-structure.md`](../../../docs/fee-structure.md)
- [`../treasury/`](../treasury/README.md)
- [`../core/`](../core/README.md)