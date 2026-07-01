---
id: P3-005
title: "[Phase 3] Implement Embedder interface + OpenAI/Cohere/Voyage/local adapters"
labels:
  - phase:phase-3
  - area:citation-engine
  - area:embedders
  - priority:high
  - type:feature
priority: high
depends_on: []
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Implement Embedder interface + adapters

## Summary

`packages/citation-engine/interfaces/embedder.ts` defines the contract. Concrete implementations in `core/embedder.ts` + `core/embedders/{openai,cohere,voyage,local}.ts`.

## Acceptance criteria

- [ ] Interface: `{ name, model, dimensions, embed(text), embedBatch(texts[]) }`.
- [ ] OpenAI adapter (`text-embedding-3-small/large`).
- [ ] Cohere adapter (`embed-english-v3.0`).
- [ ] Voyage adapter (`voyage-2`).
- [ ] Local adapter (transformers.js fallback).
- [ ] Default = OpenAI; configurable via `CE_EMBEDDING_MODEL`.
- [ ] Embedding cache backed by Redis (24h TTL) keyed by SHA-256 of canonicalized input.
- [ ] Unit tests + integration test against live API (gated by env).

## Dependencies

None.