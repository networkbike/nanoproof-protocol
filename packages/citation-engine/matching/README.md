# `matching/` — Source Matching + Fraud Detection

> Resolves a normalized candidate reference to one or more Source records in the registry. Multi-signal. Documented in [`docs/citation-engine.md`](../../../docs/citation-engine.md#stage-3--source-matching) and [`docs/fraud-prevention.md`](../../../docs/fraud-prevention.md).

## Purpose

Given a `NormalizedReference`, find the best Source match in the registry. Multi-signal:
- URL exact match (1.0)
- DOI exact match (1.0)
- Embedding similarity (0..1 cosine)
- Title similarity (Jaccard or embedding)
- Metadata similarity (author, year)
- Fraud penalty (0..1 subtracted from combined)

## Files

| File | Responsibility |
|------|----------------|
| `matcher.ts` | `SourceMatcher` top-level. Combines all signals. |
| `url-matcher.ts` | URL canonicalization + exact / prefix / domain match. |
| `doi-matcher.ts` | DOI lookup via `https://doi.org/<doi>`. |
| `embedding-matcher.ts` | pgvector nearest-neighbor lookup. |
| `title-matcher.ts` | Title similarity (Jaccard on tokenized form). |
| `metadata-matcher.ts` | Author + year + journal matching. |
| `weights.ts` | The α/β/γ/δ/ε weights for combining signals. |
| `threshold.ts` | The match threshold τ (default 0.78) + high-precision signal floor. |
| `fraud.ts` | Fraud scoring per Citation request. |
| `signals/` | Individual fraud-signal implementations. |
| `novelty.ts` | Per-agent recent-citation cosine check (defense against paraphrased repetition). |

## Public API

```typescript
export interface SourceMatcher {
  match(req: MatchRequest): Promise<MatchResult>;
}

export type MatchRequest = {
  normalized: NormalizedReference;
  spanEmbedding: number[];
  agentId: string;
  agentReputation: number;
};

export type MatchResult = {
  candidates: MatchCandidate[];   // sorted by combined score, descending
  accepted: MatchCandidate | null; // null if below threshold
  fraudRiskScore: number;          // 0..1
};
```

## Match algorithm

```
score = α * urlExact      (1 if exact, 0 if not)
      + β * embeddingSim  (cosine, 0..1)
      + γ * titleSim      (0..1)
      + δ * metadataSim   (0..1)
      + ε * doiExact      (1 if exact, 0 if not)
      - λ * fraudPenalty  (0..1)

where α + β + γ + δ + ε = 1.0
```

A candidate is **accepted** if `score ≥ τ` AND at least one of `urlExact`, `doiExact`, `embeddingSim ≥ 0.92` contributes ≥ 0.3 to the combined score.

## Fraud signals

Implemented in `signals/`:

| Signal | File |
|--------|------|
| IP reputation | `signals/ip.ts` |
| Agent reputation | `signals/agent.ts` |
| Novelty (paraphrase repetition) | `signals/novelty.ts` |
| Candidate diversity | `signals/diversity.ts` |
| Fingerprint age | `signals/fingerprint-age.ts` |
| Authorship conflict | `signals/authorship.ts` |
| Burst rate | `signals/burst-rate.ts` |
| Period-cap proximity | `signals/period-cap.ts` |

The composite `fraudRiskScore` is a weighted sum of all signals. Thresholds for auto-quarantine live in `fraud.ts`.

## See also

- [`docs/citation-engine.md`](../../../docs/citation-engine.md#stage-3--source-matching)
- [`docs/fraud-prevention.md`](../../../docs/fraud-prevention.md)
- [`../registry/`](../registry/README.md)
- [`../scoring/`](../scoring/README.md)