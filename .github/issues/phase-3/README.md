# Phase 3 Implementation Issues

> Twenty-five issues for Phase 3 (Citation Engine). Each file is a self-contained implementation ticket that can be filed to GitHub Issues or handed to a contributor.

## Index

| ID | Title | Priority | Depends on | Estimate |
|----|-------|----------|------------|----------|
| [P3-001](./0001-citation-engine-pipeline-orchestrator.md) | CitationEngine top-level orchestrator | 🔴 High | — | L |
| [P3-002](./0002-source-discovery-regex-normalizer.md) | Source Discovery — regex + URL/DOI/arXiv/ISBN | 🔴 High | P3-001 | M |
| [P3-003](./0003-source-normalizer-canonicalization.md) | Source Normalization — canonicalization + DOI resolution | 🔴 High | P3-002 | M |
| [P3-004](./0004-multi-signal-source-matcher.md) | Multi-signal Source Matcher | 🔴 High | P3-003 | L |
| [P3-005](./0005-embedder-adapters.md) | Embedder interface + OpenAI/Cohere/Voyage/local adapters | 🔴 High | — | M |
| [P3-006](./0006-fingerprint-generator.md) | Fingerprint Generator (canonicalizer + hasher + perceptual) | 🔴 High | P3-005 | L |
| [P3-007](./0007-fingerprint-versioning-duplicate-detection.md) | Fingerprint version tracking + duplicate detection | 🟡 Med | P3-006 | M |
| [P3-008](./0008-citation-extraction-classification.md) | Citation Extraction + 5-type Classification | 🔴 High | P3-004 | L |
| [P3-009](./0009-attribution-scorer.md) | AttributionScorer — 5 weight factors + sum-to-one | 🔴 High | P3-008 | L |
| [P3-010](./0010-creator-resolver.md) | CreatorResolver — Source → Creator/Wallet | 🔴 High | P3-009 | L |
| [P3-011](./0011-payment-quoter.md) | PaymentQuoter — USDC quote with period caps | 🔴 High | P3-010 | M |
| [P3-012](./0012-citation-recorder-append-only.md) | CitationRecorder — atomic write + append-only hash chain | 🔴 High | P3-011 | M |
| [P3-013](./0013-fraud-detection-signals.md) | Fraud Detection — 8 signals + composite risk score | 🔴 High | P3-004 | L |
| [P3-014](./0014-dispute-queue.md) | Dispute queue — Creator-raised disputes with escrow freeze | 🟡 Med | P3-012 | M |
| [P3-015](./0015-prisma-migration-citation-engine.md) | Prisma migration for Citation Engine schema | 🔴 High | — | M |
| [P3-016](./0016-shared-zod-schemas-citation.md) | Citation Zod schemas to @nanoproof/shared | 🔴 High | — | M |
| [P3-017](./0017-rest-api-citations-controllers.md) | REST controllers for /v1/citations, /v1/attributions, /v1/fingerprints | 🔴 High | P3-015, P3-016 | L |
| [P3-018](./0018-analytics-indexer-worker.md) | Analytics Indexer worker (materialized views + rollups) | 🟡 Med | P3-012 | M |
| [P3-019](./0019-rest-api-analytics-controllers.md) | REST controllers for /v1/analytics/* | 🟡 Med | P3-018 | M |
| [P3-020](./0020-rate-limiting-citation-engine.md) | Per-agent + per-IP rate limiting on Citation Engine | 🔴 High | P3-017 | S |
| [P3-021](./0021-pgvector-hnsw-index.md) | Enable pgvector extension + HNSW index | 🔴 High | P3-015 | S |
| [P3-022](./0022-policy-versioning-replay.md) | Attribution policy versioning + replay tool | 🟡 Med | P3-009 | M |
| [P3-023](./0023-embedding-cache-warming.md) | Embedding cache warming + LRU eviction | 🟡 Med | P3-005 | S |
| [P3-024](./0024-acceptance-tests-phase-3.md) | Phase 3 acceptance — full end-to-end pipeline test | 🔴 High | P3-001, P3-009, P3-010, P3-012, P3-013 | M |
| [P3-025](./0025-shared-error-catalog-phase-3.md) | Extend NP_* error catalog with Phase 3 codes | 🔴 High | — | S |

## Suggested execution order

1. **Foundation trio** (parallel where possible):
   - P3-025 (errors)
   - P3-016 (Zod schemas)
   - P3-015 (Prisma migration) + P3-021 (pgvector)
2. **Core components**:
   - P3-005 (embedders) — feeds everything
   - P3-001 (orchestrator)
   - P3-002 (discovery)
   - P3-003 (normalizer)
   - P3-006 + P3-007 (fingerprints)
3. **Matching + Scoring**:
   - P3-004 (matcher)
   - P3-008 (extraction + classification)
   - P3-009 (scorer)
   - P3-010 (resolver)
   - P3-011 (quoter)
4. **Fraud + Disputes**:
   - P3-013 (fraud signals)
   - P3-014 (dispute queue)
5. **Recording + Indexing**:
   - P3-012 (recorder)
   - P3-018 (indexer)
6. **API surface**:
   - P3-017 (citation controllers)
   - P3-019 (analytics controllers)
   - P3-020 (rate limiting)
7. **Polish + Cross-cutting**:
   - P3-022 (policy replay)
   - P3-023 (cache warming)
8. **Done**: P3-024 (acceptance tests)

## Labels used

| Label | Meaning |
|-------|---------|
| `phase:phase-3` | Phase 3 issue |
| `area:api` / `area:shared` / `area:web` / `area:docs` | Affected surface |
| `area:citation-engine` / `area:matching` / `area:embedders` / `area:fingerprinting` / `area:scoring` / `area:registry` / `area:payment-engine` / `area:analytics` / `area:fraud` / `area:database` / `area:prisma` | Module |
| `priority:high` / `priority:medium` / `priority:low` | Effort priority |
| `type:feature` / `type:database` / `type:validation` / `type:security` / `type:performance` / `type:testing` | Issue type |
| `milestone:Phase 3 — Citation Engine` | All Phase 3 issues share this milestone |