# `scoring/` — Attribution Scoring

> Computes the per-Citation raw score and the response-level attribution fractions. Pure functions; no I/O.

## Purpose

Implements the attribution model documented in [`docs/attribution-model.md`](../../../docs/attribution-model.md). Every computation is deterministic and produces values that can be replayed from the stored evidence.

## Files

| File | Responsibility |
|------|----------------|
| `attribution.ts` | `AttributionScorer` class. Computes per-Citation raw scores and normalizes to fractions. |
| `weights.ts` | The 5 weight factors (`w_cite`, `w_rel`, `w_conf`, `w_qual`, `w_diversity`, `w_recency`). Default + tunable. |
| `quoter.ts` | `PaymentQuoter`. Multiplies attribution fraction × base price to get per-Citation USDC amount. |
| `classifier-weights.ts` | Lookup table: `CitationKind → w_cite base value`. |
| `diversity.ts` | `diversityFactor(agent, sourceId)` — counts agent's recent citations to this Source. |
| `recency.ts` | `recencyFactor(sourceAgeDays)` — half-life decay. |
| `quality.ts` | `qualityFactor(creatorReputationScore)` — sigmoid-mapped reputation. |
| `numerics.ts` | Floating-point safety helpers (`sumToOne`, `clamp`, `sigmoid`). |
| `policy.ts` | Loads the policy version + weights from env / config. |

## Public API

```typescript
export interface AttributionScorer {
  scoreCitations(
    citations: CitationCandidate[],
    queryEmb: number[],
    spanEmbs: number[][],
    context: ScoringContext,
  ): AttributionResult;

  recompute(
    citations: PersistedCitation[],
    policyVersion: string,
  ): AttributionResult;
}

export interface PaymentQuoter {
  quote(
    fractions: AttributionFraction[],
    sources: SourcePolicy[],
    periodCaps: Map<string, bigint>,
  ): PaymentQuote[];
}
```

## Determinism guarantees

- All weights are read from a single `Policy` object stamped on every Citation.
- `sumToOne(fractions)` enforces Σ = 1.0 ± 1e-9.
- `recompute()` is byte-identical given identical inputs.

## Tests

- `__fixtures__/scoring/` — golden inputs + expected outputs across policy versions.
- Property-based test for `sumToOne`.
- Unit test for every weight function.
- Cross-version replay test.

## See also

- [`docs/attribution-model.md`](../../../docs/attribution-model.md)
- [`../core/`](../core/README.md)
- [`../analytics/`](../analytics/README.md)