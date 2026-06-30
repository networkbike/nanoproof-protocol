# ADR 0004: Per-Agent Pricing

- **Status:** Proposed
- **Date:** 2026-06-30
- **Authors:** @networkbike

## Context and Problem Statement

Some agents cite more aggressively than others. Should creators be able to charge different agents different per-citation prices?

## Decision Drivers

- **Fairness.** Aggressive agents may drive more value per citation.
- **Reputation.** Per-agent pricing creates room for trust-based fee markets.
- **Simplicity.** Per-source pricing is simpler.

## Considered Options

1. **Single per-source price (no per-agent differentiation).**
2. **Optional per-agent pricing for sources that opt in.**

## Decision Outcome

**Chosen option:** **2. Optional per-agent pricing.**

- v1.0 ships with a single per-source price as the default.
- v1.1 introduces optional `pricing.overrides[]` keyed by agent ID, allowing creators to charge differently for known high-value agents.

### Positive Consequences

- Doesn't complicate the default path.
- Opens the door to reputation-based pricing once agents have history.

### Negative Consequences

- Optional features tend to be under-tested.
- Discriminatory pricing could be misused.

## References

- [`architecture.md`](../architecture.md#per-agent-pricing)