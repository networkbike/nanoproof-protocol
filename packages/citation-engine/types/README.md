# `types/` — Canonical TypeScript Types

> Every shared type lives here. Other subpackages import from `@nanoproof/citation-engine/types` rather than redefining. Mirrors the Zod schemas in `@nanoproof/shared/schemas/citation.ts` (Phase 3+).

## Files

| File | Purpose |
|------|---------|
| `citation.ts` | `Citation`, `CitationKind`, `CitationPayoutStatus`, etc. |
| `attribution.ts` | `Attribution`, `AttributionResult`, `AttributionFraction`. |
| `evidence.ts` | `Evidence`, `MatchSignals`, `ClassifierOutput`. |
| `fingerprint.ts` | `Fingerprint`, `FingerprintMetadata`, `PerceptualHash`. |
| `contribution.ts` | `Contribution`, `CreatorMatch`, `RoyaltySplit`. |
| `pipeline.ts` | `CandidateReference`, `NormalizedReference`, `CitationCandidate`. |
| `dispute.ts` | `Dispute`, `DisputeReason`, `DisputeStatus`. |
| `fraud.ts` | `FraudSignal`, `FraudSignalKind`, `FraudRiskScore`. |
| `analytics.ts` | `ProtocolAnalytics`, `CreatorAnalytics`, `SourceAnalytics`, etc. |
| `errors.ts` | Engine-specific error types. |
| `common.ts` | ULID, timestamp, atomic-USDC-string helpers. |
| `index.ts` | Re-exports. |

## Conventions

- All IDs are branded: `type CreatorId = string & { readonly __brand: "CreatorId" }`.
- Money is always `string` of atomic USDC units (never `number`).
- Timestamps are ISO 8601 strings in UTC.
- Match scores are `string` of decimal numbers (e.g. `"0.91"`), never `number`, to avoid float drift.
- Every type has a Zod twin in `@nanoproof/shared` that produces the type via `z.infer`.

## See also

- [`@nanoproof/shared`](../../../packages/shared/README.md) — canonical Zod schemas