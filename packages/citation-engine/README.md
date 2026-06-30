# @nanoproof/citation-engine

> Detect citations in AI-generated text and resolve them to registered NanoProof Sources.

[![Status: Pre-Alpha](https://img.shields.io/badge/status-pre--alpha-orange.svg)]()

The Citation Engine is the brain of NanoProof. It takes any AI response, identifies the works being referenced, scores each reference by relevance and confidence, and resolves it to a creator in the registry — producing a structured `CitationEvent` that the Payment Engine can settle.

---

## Status

**Phase 3 — Citation Engine** (planned). The interface is sketched here as the contract. Implementation lands alongside Phase 3 of the [Roadmap](../../ROADMAP.md).

---

## The problem

LLM responses cite sources inconsistently. A response might:
- Paraphrase an article without naming it.
- Mention a paper by author only.
- Link to a GitHub repo in plain text.
- Quote a dataset by name.

We need a robust pipeline that turns messy, partial citations into structured, attributable events.

---

## The pipeline

```
Raw AI response
    │
    ▼
[1] Tokenize + segment ─────► paragraphs / sentences / code blocks
    │
    ▼
[2] Candidate detection ───► regex URLs, DOIs, ISBNs, named sources
    │
    ▼
[3] Embedding similarity ───► compare to Source fingerprints
    │
    ▼
[4] Resolve to Source ──────► hit registry; confidence ≥ τ = accepted
    │
    ▼
[5] Emit CitationEvent ────► API ingests, queues for payment
```

---

## Planned API

```typescript
import { CitationEngine, openAIEmbeddings } from "@nanoproof/citation-engine";
import { RegistryClient } from "@nanoproof/sdk";

const registry = new RegistryClient({ baseUrl: process.env.NANOPROOF_API_URL! });

const engine = new CitationEngine({
  registry,
  embedder: openAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY! }),
  threshold: 0.78,
});

const events = await engine.extract({
  responseId: "resp_01H...",
  responseText: "...the 2024 Survey of Agentic Systems outlines...",
  modelId: "gpt-4o",
  contextWindow: { before: 200, after: 200 },
});

// events: CitationEvent[]
//   [{ sourceId, confidence, snippet, url, ... }]
```

### Embedder adapter interface

```typescript
export interface Embedder {
  name: string;
  model: string;
  dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
```

Planned adapters:
- `openAIEmbeddings` — OpenAI `text-embedding-3-small/large`
- `cohereEmbeddings` — Cohere v3
- `voyageEmbeddings` — Voyage AI
- `localEmbeddings` — transformers.js / on-device

---

## Pluggable strategies

The engine is **strategy-pluggable** so different use cases can pick different detection modes.

| Strategy | Best for |
|----------|----------|
| `regex-extractor` | High-precision URL/DOI detection |
| `embedding-resolver` | Paraphrased references |
| `hybrid` | Production default — both |
| `agent-reported` | Models that emit citations natively in tool calls |

---

## Determinism + auditability

Every emitted `CitationEvent` carries:

```typescript
type CitationEvent = {
  id: string;                  // UUID
  responseId: string;
  sourceId: string | null;     // null if unresolved
  confidence: number;          // 0–1
  snippet: string;             // exact cited span
  context: { before: string; after: string };
  candidates: Array<{         // ranked detection candidates
    sourceId: string;
    score: number;
    strategy: string;
  }>;
  detectedAt: string;          // ISO timestamp
  policyVersion: string;
};
```

This structure makes every citation fully auditable — a creator can see exactly what was cited and how it was matched.

---

## Package shape (planned)

```
@nanoproof/citation-engine
├── src/
│   ├── engine.ts             # CitationEngine top-level
│   ├── extractors/           # regex, DOI, ISBN, URL, named
│   ├── embedders/            # OpenAI, Cohere, Voyage, local
│   ├── resolvers/            # registry lookup, threshold logic
│   ├── scoring/              # relevance + confidence scoring
│   ├── strategies/           # hybrid, regex, embedding, agent-reported
│   └── types.ts
├── tests/
│   ├── fixtures/             # response corpora + expected events
│   └── engine.test.ts
└── README.md
```

---

## Testing strategy

- **Unit tests** for each extractor on curated fixtures.
- **Integration tests** against a sandbox registry with seeded sources.
- **Regression tests** built from real AI responses (anonymized, consented).
- **Property-based tests** for the threshold logic.

---

## See also

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md#layer-5--citation-engine) — design overview
- [`ROADMAP.md`](../../ROADMAP.md#phase-3--citation-engine) — Phase 3 plan
- [`@nanoproof/payment-engine`](../payment-engine/README.md) — the downstream consumer

---

## License

MIT — see [`LICENSE`](../../LICENSE).