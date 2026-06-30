# `interfaces/` — Pluggable Strategy Contracts

> Every component that has more than one implementation declares its interface here. Concrete implementations live in their owning subpackage; consumers depend on these interfaces.

## Purpose

The Citation Engine is a composition of interchangeable strategies. The interfaces in this folder are the contracts. To swap an embedder from OpenAI to Cohere, you implement `Embedder` from `interfaces/embedder.ts` and inject it.

## Files

| File | Interface |
|------|-----------|
| `embedder.ts` | `Embedder` — text → vector |
| `matcher.ts` | `SourceMatcher` — normalized reference → MatchResult |
| `scorer.ts` | `AttributionScorer` — citations → AttributionResult |
| `resolver.ts` | `CreatorResolver` — Source → CreatorMatch[] |
| `quoter.ts` | `PaymentQuoter` — fractions → PaymentQuote[] |
| `recorder.ts` | `CitationRecorder` — Attribution → DB |
| `indexer.ts` | `Indexer` — events → materialized views |
| `cache.ts` | `EmbeddingCache` — vector cache |
| `classifier.ts` | `CitationClassifier` — span → CitationKind |
| `fingerprint-generator.ts` | `FingerprintGenerator` — Source → Fingerprint |
| `webhook.ts` | `WebhookDispatcher` — event outbound |
| `metrics.ts` | `Metrics` — counter / gauge / histogram |
| `logger.ts` | `Logger` — structured logging |

## Example: the Embedder interface

```typescript
export interface Embedder {
  readonly name: string;
  readonly model: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
```

Implementations live in `../core/` or in user-land adapters. The engine itself depends on the interface, never the implementation.

## See also

- [`../core/`](../core/README.md) — composes these interfaces
- [`../scoring/`](../scoring/README.md)
- [`../matching/`](../matching/README.md)