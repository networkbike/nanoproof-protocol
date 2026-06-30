# Citation Engine

> The Citation Engine is the brain of NanoProof. It detects, attributes, scores, and records the human contributions behind every AI-generated response.

---

## Table of contents

- [Purpose](#purpose)
- [Design principles](#design-principles)
- [Architecture at a glance](#architecture-at-a-glance)
- [The 10-stage pipeline](#the-10-stage-pipeline)
- [Components](#components)
- [Data flow](#data-flow)
- [Security](#security)
- [Scalability](#scalability)
- [Fraud prevention](#fraud-prevention)
- [Latency budget](#latency-budget)
- [Determinism + auditability](#determinism--auditability)
- [Configuration](#configuration)
- [Failure modes](#failure-modes)
- [See also](#see-also)

---

## Purpose

The Citation Engine answers one question with machine precision:

> For a given AI response, which registered human contributions are reflected in it, how strongly, and what are they worth?

A single AI response can be the product of 200+ pieces of source material. The engine's job is to:

1. **Discover** which sources were touched (URLs, paraphrases, ideas, datasets).
2. **Normalize** every reference into a canonical Source identity.
3. **Match** each reference to a registered Source in the NanoProof registry.
4. **Score** the strength of each attribution (was it a direct quote, a paraphrase, a minor influence?).
5. **Resolve** each Source back to one or more Creators.
6. **Quote** a per-Citation payout in USDC.
7. **Record** every decision into an immutable, auditable ledger.

The engine is the contract between the agent (which knows what it generated) and the protocol (which knows what humans are owed). Both sides must trust its output.

---

## Design principles

1. **Determinism first.** Given the same input, the engine must produce the same CitationEvents. Every score is reproducible from the recorded evidence.
2. **Audit by default.** Every emitted CitationEvent carries the inputs, candidates, scores, and resolutions — not just the outcome.
3. **Defense in depth.** No single signal is trusted. URL match + embedding similarity + claim metadata must all align before a Source is paid.
4. **Creators own the truth.** A Creator can override attribution on their own Source via the registry; the engine respects their edits.
5. **Pluggable strategies.** The engine is a composition of interchangeable modules. Every component (embedder, searcher, scorer, prober) has a typed interface.
6. **Sub-second target.** For a typical agent response (<2k tokens, ≤20 citations), the full pipeline runs in <500 ms end-to-end.

---

## Architecture at a glance

```
            ┌──────────────────────────────────────────────────────┐
            │                       AGENT                          │
            │   generates response via LLM, emits citations list   │
            └──────────────────────────┬───────────────────────────┘
                                       │  POST /v1/citations/analyze
                                       ▼
            ┌──────────────────────────────────────────────────────┐
            │                  CITATION ENGINE                     │
            │  ┌──────────────────────────────────────────────┐    │
            │  │  1. Source Discovery                         │    │
            │  │  2. Source Normalization                     │    │
            │  │  3. Source Matching  ◄─── Registry (pg+pgv) │    │
            │  │  4. Citation Extraction                      │    │
            │  │  5. Attribution Scoring                      │    │
            │  │  6. Creator Resolution  ◄─── Registry       │    │
            │  │  7. Payment Quote Generation                 │    │
            │  │  8. Citation Record Creation                 │    │
            │  └──────────────────────────────────────────────┘    │
            └──────────────────────────┬───────────────────────────┘
                                       │  CitationEvent[]
                                       ▼
            ┌──────────────────────────────────────────────────────┐
            │                PAYMENT ENGINE (Phase 5)              │
            │   converts CitationEvents → PaymentIntents → Arc    │
            └──────────────────────────────────────────────────────┘
```

The Citation Engine is **read-mostly** with respect to the registry. It does not mutate Sources. It writes CitationEvents, Attributions, and Contributions into its own tables.

---

## The 10-stage pipeline

The full pipeline runs every time an agent posts to `/v1/citations/analyze`. Each stage is independently observable, retryable, and versioned.

### Stage 1 — Research Agent / Source Discovery

**Inputs:**
- A user query.
- The agent's tool-calling history (URLs fetched, papers cited, code repos inspected).
- The agent's native citation output (if the model supports structured citations).

**Outputs:** A list of `CandidateReference` records.

```typescript
type CandidateReference = {
  rawCitation: string;          // as emitted by the agent or extracted from text
  kind: "URL" | "DOI" | "ISBN" | "TITLE" | "AUTHOR" | "DATASET" | "PARAPHRASE";
  context: {
    beforeText: string;         // ~200 chars before the citation
    afterText: string;          // ~200 chars after
    sectionHeading?: string;
  };
  locator?: {
    paragraphIndex?: number;
    charStart?: number;
    charEnd?: number;
    lineNumber?: number;
  };
};
```

**Strategy:** Multi-pronged discovery.
- If the agent emits structured citations (e.g. via Vercel AI SDK `tool` calls or Anthropic `citations` blocks), ingest directly.
- If not, regex + named-entity extraction over the response text:
  - URL extractor (`https?://...`)
  - DOI extractor (`10.\d{4,9}/[-._;()/:A-Z0-9]+`)
  - ISBN extractor (10/13 digit checksum-validated)
  - arXiv ID extractor (`arXiv:NNNN.NNNNN[v2]`)
  - GitHub repo extractor (`github.com/<owner>/<repo>`)
  - Author + year pattern (e.g. "Smith et al. 2024")

The discovery stage is **purposely generous** — false positives are cheap; false negatives are expensive. The matching stage filters them.

### Stage 2 — Source Normalization

**Inputs:** `CandidateReference[]` from Stage 1.

**Outputs:** `NormalizedReference[]` — every candidate expressed in a canonical form with provenance.

Normalization rules per kind:
- **URL:** resolve all redirects; lowercase host; strip tracking params (`utm_*`, `fbclid`, `gclid`, etc.); normalize `www.` prefix; resolve punycode to Unicode.
- **DOI:** resolve via `https://doi.org/<doi>` to its canonical URL.
- **arXiv:** convert `1234.5678` → `https://arxiv.org/abs/1234.5678`.
- **GitHub:** canonicalize to `https://github.com/<owner>/<repo>`.
- **TITLE:** best-effort lookup via OpenAlex / Crossref if title matches with high confidence.

Each normalized record carries a `NormalizerVersion` so future normalizer changes don't silently shift matching.

### Stage 3 — Source Matching

**Inputs:** `NormalizedReference[]`.

**Outputs:** `MatchCandidate[]` — every normalized reference paired with zero or more candidate Source records from the registry, ranked by similarity.

**Matching is multi-signal:**

```
            matchScore = α * urlExact       (1 if URL exact, 0 if not)
                       + β * embeddingSim  (0..1 cosine)
                       + γ * titleSim      (0..1 Jaccard or embedding)
                       + δ * metadataSim   (author/year match)
                       + ε * doiExact      (1 if DOI matches)
                       - λ * fraudPenalty  (see fraud-prevention.md)
```

where `α + β + γ + δ + ε = 1.0`. Weights are configurable per Creator via the Source's `pricing.overrides`.

A Source passes the match threshold (`τ`, default **0.78**) only if the combined score is ≥ τ **and** at least one of the high-precision signals (`urlExact`, `doiExact`, `embeddingSim ≥ 0.92`) contributes ≥ 0.3. This prevents low-signal embeddings from fabricating citations.

**Storage:** the registry is Postgres + pgvector. Embeddings live in `sources.embedding vector(1536)`. Match queries use pgvector's HNSW index (`<=>` cosine distance).

### Stage 4 — Citation Extraction

**Inputs:** Raw response text + `MatchCandidate[]`.

**Outputs:** `Citation[]` — one record per detected citation, classified into one of five types (see below).

For each `MatchCandidate`, the engine finds the cited span in the response text (the smallest window that mentions or paraphrases the source), tags the span with its classification, and emits a `Citation` record.

### Stage 5 — Attribution Scoring

**Inputs:** `Citation[]`.

**Outputs:** `Attribution` — for the entire response, the relative contribution of every Citation.

Uses the scoring model in [`attribution-model.md`](./attribution-model.md). Outputs are normalized so that the sum of contribution fractions across all Citations of a response equals 1.0 (modulo rounding).

### Stage 6 — Creator Resolution

**Inputs:** `Attribution` (Citations → Sources).

**Outputs:** `CreatorMatch[]` — for every Source, the resolved Creator(s) and the wallet(s) for payout.

Handles:
- Direct Creator (Source.creatorId set).
- Organization ownership (Source.organizationId set) — splits per OrganizationMembership role.
- Royalty splits configured at Source level.
- Disputes: ambiguous claims fall through to a `PendingOwnership` review queue (out of band).

### Stage 7 — Payment Quote Generation

**Inputs:** `CreatorMatch[]` + Attribution + Source policy.

**Outputs:** `PaymentQuote[]` — atomic-unit USDC amounts per Creator, with the formula documented in [`payment-engine.md`](../packages/payment-engine/README.md) (Phase 5). Citation Engine emits the **quote**; Payment Engine executes.

### Stage 8 — Citation Record Creation

**Inputs:** Pipeline state (Citations, Attributions, CreatorMatches, Quotes).

**Outputs:** Persisted records:
- `Citation` (one per detected citation, immutable).
- `Attribution` (one per response, links to Citations).
- `Evidence` (the raw inputs that produced the Citation).
- `Contribution` (one row per Creator × Citation).
- `Fingerprint` (the canonical fingerprint of the cited Source at the moment of citation).
- `CreatorMatch` (the resolved Creator + wallet).

All writes are append-only. There is no UPDATE on Citation or Attribution rows. Updates happen by writing a new row and superseding the old one.

### Stage 9 — Receipt Emission

The engine emits a structured event per Citation via NestJS EventEmitter:

```typescript
{
  type: "citation.recorded",
  citationId: "cit_01HXY...",
  responseId: "resp_...",
  sourceId: "src_...",
  creatorId: "cr_...",
  attributionFraction: "0.15",     // 15%
  confidence: "0.91",
  paymentQuote: {
    creatorId: "cr_...",
    amountAtomic: "1500",          // $0.0015
  },
  recordedAt: "2026-06-30T22:00:00Z",
}
```

The Payment Engine subscribes to these events.

### Stage 10 — Indexer Sync

A BullMQ worker mirrors every Citation + Attribution to the public analytics surface (Phase 6). The Indexer is eventually consistent; downstream dashboards tolerate up to 60 s lag.

---

## Components

| Component | File | Purpose |
|-----------|------|---------|
| **Research Agent** | outside the engine | The agent that produced the response. |
| **Discovery** | `core/discovery.ts` | Extract candidate references from raw text + agent metadata. |
| **Normalizer** | `core/normalizer.ts` | Convert references to canonical form (URL/DOI/arXiv/GitHub/Title). |
| **Embedder** | `core/embedder.ts` | Interface + adapters (OpenAI, Cohere, Voyage, local). |
| **Matcher** | `matching/matcher.ts` | Multi-signal Source matching against the registry. |
| **Extractor** | `core/extractor.ts` | Locate citation spans in the response text. |
| **Classifier** | `core/classifier.ts` | Assign each Citation to one of five types. |
| **Scorer** | `scoring/attribution.ts` | Compute contribution fractions. |
| **Resolver** | `registry/resolver.ts` | Source → Creator → Wallet resolution. |
| **Quoter** | `scoring/quoter.ts` | USDC payout quote per Creator. |
| **Recorder** | `core/recorder.ts` | Persist Citation, Attribution, Evidence, Contribution, CreatorMatch, Fingerprint. |
| **Analytics** | `analytics/metrics.ts` | Live counters for protocol dashboards. |
| **Indexer** | `analytics/indexer.ts` | Mirror to public analytics surface. |
| **Fraud Detector** | `matching/fraud.ts` | Real-time scoring of citation requests for abuse. |

Each component exposes a typed interface; all are pluggable.

---

## Data flow

### Read path (per analyze request)

```
1. AUTH    → verify Clerk JWT or ApiKey → resolve AuthContext
2. IDEMPOTENT-KEY → cache lookup; replay if seen
3. REQUEST → validate body via Zod schemas in @nanoproof/shared
4. PIPELINE:
    1. Discovery
    2. Normalization
    3. Matching (against registry; uses pgvector HNSW)
    4. Extraction
    5. Scoring
    6. Resolution
    7. Quoting
    8. Recording (atomic transaction)
    9. Receipt emission (EventEmitter)
5. RESPONSE → return Citation[] + Attribution summary
```

### Write path

All writes happen in a single Postgres transaction per `Attribution`:

```sql
BEGIN;
  INSERT INTO citations (...);
  INSERT INTO attributions (...);
  INSERT INTO evidences (...);
  INSERT INTO contributions (...);
  INSERT INTO fingerprints (...);
  INSERT INTO creator_matches (...);
  UPDATE sources SET citation_count = citation_count + 1 WHERE id IN (...);
COMMIT;
```

If any insert fails, the entire Attribution is rolled back. The agent receives a `5xx` and retries; idempotency keys prevent duplicates.

---

## Security

1. **Input validation.** Every payload is Zod-validated before any component runs.
2. **No agent-controlled resolution.** The matcher only matches against the registry. Agents cannot pass a Creator ID and force a payout.
3. **Output audit trail.** Every Citation carries the raw inputs, the candidates considered, the scores, and the resolution path. Auditors can replay the decision end-to-end.
4. **SSRF-free.** Source Discovery never fetches URLs directly. The Source must already exist in the registry (i.e. verified by the Source Verification pipeline from Phase 2).
5. **Rate limits.** Per-agent rate limits on `/v1/citations/*`; per-IP rate limits on heavy endpoints (e.g. fingerprint generation).
6. **PII minimization.** We store only the `responseId` (UUID from the agent), never the full prompt or response. The original text is referenced via content hash if at all.
7. **Tamper-evident ledger.** Citation + Attribution tables are append-only. Edits are done via supersede rows; original rows are never modified.
8. **Signed receipts.** Every emitted event is signed by the API's service key; downstream consumers verify before processing.

---

## Scalability

### Horizontal scaling

- **Stateless API.** Every request is independent. Add API pods behind a load balancer.
- **Read replicas.** Registry + analytics queries route to read replicas (Neon branching).
- **pgvector HNSW index.** Sub-linear nearest-neighbor queries at >10M Source scale.
- **Embedding cache.** Response text is hashed; identical hashes reuse cached embeddings (LRU + Redis, 24h TTL).

### Vertical optimizations

- **Batch matching.** Multiple candidates per request are matched in a single `SELECT ... ORDER BY embedding <=> $1 LIMIT 50`.
- **Async recording.** Heavy writes (Evidence, Fingerprint) are backgrounded via BullMQ for non-blocking latency.
- **Skip matching for trivially-rejected candidates.** URL on the denylist? Skip embedding computation entirely.

### Scale targets

| Volume | Throughput target | p99 latency |
|--------|-------------------|-------------|
| 1k Citations/day | 0.01/sec | <500 ms |
| 100k Citations/day | 1/sec | <500 ms |
| 1M Citations/day | 12/sec | <800 ms |
| 100M Citations/day | 1,200/sec | <1.5 s |

The 100M/day target requires:
- Sharded Postgres by `creator_id` hash.
- Per-tenant embedding cache (Redis cluster).
- A dedicated Analytics tier (Clickhouse or similar).

---

## Fraud prevention

The engine is the most attractive target for abuse on the protocol. A bad actor could:

- Submit AI responses that cite every registered Source to drain period caps.
- Submit paraphrases that pass the embedding threshold but don't actually use the Source.
- Spam-claim the same Source with multiple Creators.

The dedicated fraud surface is in [`fraud-prevention.md`](./fraud-prevention.md). Highlights:

- Per-agent per-Source daily cap (Creator-configurable).
- Per-IP rate limits on `/v1/citations/analyze`.
- Embedding-similarity "novelty" check: a candidate must add new content vs. the agent's recent citations.
- Reputation-weighted matching: low-rep agent citations pay out at reduced rate until trust builds.
- Dispute queue: Creators can flag any Citation for review; payouts to flagged Citations are held in escrow.

---

## Latency budget

| Stage | Target | Notes |
|-------|--------|-------|
| 1. Discovery | 10 ms | regex + JSON parse |
| 2. Normalization | 30 ms | DOI resolution + redirect chasing |
| 3. Matching | 150 ms | pgvector + joins |
| 4. Extraction | 50 ms | span detection |
| 5. Scoring | 30 ms | pure compute |
| 6. Resolution | 60 ms | Prisma joins |
| 7. Quoting | 10 ms | per-source pricing table |
| 8. Recording | 100 ms | tx commit |
| 9. Receipt emission | 10 ms | EventEmitter |
| 10. Indexer sync | 60 ms | backgrounded |
| **Total** | **~510 ms** | fits the 2 s end-to-end goal |

---

## Determinism + auditability

Every Citation row stores enough to reconstruct the decision:

```jsonc
{
  "id": "cit_01HXY...",
  "responseId": "resp_01...",
  "sourceId": "src_01...",
  "kind": "DIRECT",
  "score": "0.91",
  "evidence": {
    "candidateRef": { "rawCitation": "...", "kind": "URL" },
    "normalization": { "canonicalUrl": "...", "redirectChain": [...] },
    "matchSignals": {
      "urlExact": 1.0,
      "embeddingSim": 0.94,
      "titleSim": 0.85,
      "metadataSim": 0.60,
      "doiExact": 0.0,
      "fraudPenalty": 0.05
    },
    "snippet": "...",
    "contextBefore": "...",
    "contextAfter": "..."
  },
  "policyVersion": "ce.v3.2.1",
  "recordedAt": "..."
}
```

Auditors can replay any Citation by re-running the matching algorithm against the recorded evidence and verifying the same outcome.

---

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `CE_MATCH_THRESHOLD` | `0.78` | Minimum combined match score to accept a candidate. |
| `CE_EMBEDDING_DIM` | `1536` | Embedding vector dimensionality (must match pgvector column). |
| `CE_EMBEDDING_MODEL` | `text-embedding-3-small` | Default OpenAI model. |
| `CE_MAX_CANDIDATES_PER_RESPONSE` | `50` | Cap on candidates per analyze request. |
| `CE_MAX_CITATIONS_PER_RESPONSE` | `20` | Cap on Citations emitted per response. |
| `CE_RATE_LIMIT_PER_MIN` | `600` | Per-agent rate limit. |
| `CE_CACHE_TTL_S` | `86400` | Embedding cache TTL. |
| `CE_POLICY_VERSION` | `ce.v3.2.1` | Pinned policy version stamped on every Citation. |

---

## Failure modes

| Failure | Behavior |
|---------|----------|
| Embedder 5xx | Retry 3× with backoff; fall back to URL-only matching. |
| pgvector timeout | Retry once; on second failure, return 200 with `unresolvedCitations: true`. |
| Postgres write failure | Tx rollback; emit `citation.failed`; return 5xx. Agent retries with same idempotency key. |
| LLM call (for paraphrase detection) failure | Skip paraphrase detection for the request; rely on URL/DOI signals. |
| Unknown policy version | Hard fail; we never emit Citations under an unknown policy. |
| Source marked `PAUSED` after match | Emit Citation but mark `pending`; Payment Engine holds payout until Source is `ACTIVE`. |

---

## See also

- [`source-fingerprinting.md`](./source-fingerprinting.md)
- [`attribution-model.md`](./attribution-model.md)
- [`fraud-prevention.md`](./fraud-prevention.md)
- [`analytics.md`](./analytics.md)
- [`phase-2-creator-registry.md`](./phase-2-creator-registry.md)
- [`protocol-spec.md`](./protocol-spec.md#33-citationevent)