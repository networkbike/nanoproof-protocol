# `core/` — Citation Engine Pipeline

> The orchestration layer. Wires the 10-stage pipeline together. Stateless. The only place where `Discovery → Normalization → Matching → Extraction → Scoring → Resolution → Quoting → Recording → Receipt → Indexer` runs end-to-end.

## Purpose

This subpackage owns the **CitationEngine** top-level class. It composes every other subpackage (`matching/`, `scoring/`, `registry/`, etc.) into a single callable pipeline.

## Files

| File | Responsibility |
|------|----------------|
| `engine.ts` | The `CitationEngine` class. `extract()` and `record()` are the two public methods. |
| `discovery.ts` | Extracts `CandidateReference[]` from raw text + agent metadata. |
| `normalizer.ts` | Converts candidates to canonical form (URL/DOI/arXiv/GitHub/Title). |
| `extractor.ts` | Locates the cited span in the response text per candidate. |
| `classifier.ts` | Assigns each Citation a `CitationKind` (DIRECT / INDIRECT / SUPPORTING / REFERENCE / CONTEXT). |
| `recorder.ts` | Persists Attribution + Citation + Evidence + Contribution + CreatorMatch + Fingerprint in a single transaction. |
| `events.ts` | Typed event payloads emitted via NestJS EventEmitter. |
| `errors.ts` | Engine-specific error wrappers around the `NP_*` catalog. |
| `policy.ts` | Reads the policy version from env (`CE_POLICY_VERSION`) and stamps every emitted Citation. |

## Public API

```typescript
export class CitationEngine {
  constructor(deps: {
    embedder: Embedder;
    matcher: SourceMatcher;
    scorer: AttributionScorer;
    resolver: CreatorResolver;
    quoter: PaymentQuoter;
    recorder: CitationRecorder;
    indexer: Indexer;
    cache: EmbeddingCache;
  });

  async extract(req: AnalyzeCitationsRequest): Promise<AnalyzeCitationsResponse>;
  async record(req: AnalyzeCitationsRequest): Promise<Attribution>;
}
```

## Invariants

- `extract()` never writes to the database. It is safe for preview / dry-run.
- `record()` writes exactly one Attribution per call, atomically.
- Every emitted Citation is stamped with `enginePolicyVersion`, `attributionPolicyVersion`, `fingerprintPolicyVersion` from env.
- On any failure mid-pipeline, no partial Attribution is persisted. The agent retries with the same `Idempotency-Key` and gets the same response.

## Pipeline order

```
Discovery → Normalization → Matching → Extraction → Classification
   → Scoring → Resolution → Quoting → Recording → Receipt Emission
```

## See also

- [`docs/citation-engine.md`](../../../docs/citation-engine.md) — pipeline architecture
- [`../scoring/`](../scoring/README.md)
- [`../matching/`](../matching/README.md)
- [`../registry/`](../registry/README.md)