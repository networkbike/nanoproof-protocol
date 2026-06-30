# `docs/` — Subpackage Documentation

> Per-subpackage design notes that don't belong in the top-level `docs/` folder. Anything in this folder is **implementation reference**; the protocol-level specs live at the repo root.

## Files

| File | Purpose |
|------|---------|
| `algorithm-decisions.md` | Why we chose HNSW over IVF, Jaccard over Levenshtein, etc. |
| `embedding-model-choice.md` | Why OpenAI `text-embedding-3-small` is the default; how to swap. |
| `matcher-threshold-tuning.md` | How τ is set, how it interacts with fraud signals. |
| `scoring-versioning.md` | How we bump policy versions and replay Citations. |
| `append-only-enforcement.md` | Postgres triggers + application-level guards. |
| `embedding-cache-warming.md` | Pre-warming strategies + cache key derivation. |
| `latency-budgets.md` | Per-stage latency targets + SLOs. |
| `known-limitations.md` | Honest list of what the engine can't do. |

## When to add to this folder

- When a subpackage needs a design decision that affects > 1 file in this package.
- When a tradeoff is non-obvious and you want the next maintainer to understand the choice.
- When a future Phase depends on a specific decision made here.

## When **not** to add to this folder

- Protocol-level decisions belong at the repo root in `docs/`.
- One-off implementation notes belong in code comments or commit messages.

## See also

- [`../../../docs/citation-engine.md`](../../../docs/citation-engine.md)
- [`../../../docs/attribution-model.md`](../../../docs/attribution-model.md)
- [`../../../docs/source-fingerprinting.md`](../../../docs/source-fingerprinting.md)