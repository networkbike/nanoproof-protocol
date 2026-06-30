# `tests/` — Test Suite

> Unit + integration + property-based + replay tests for the Citation Engine. Lives in this package, not at the repo root, because the engine is shipped as a standalone library.

## Structure

```
tests/
├── unit/                    # pure-function tests, no I/O
│   ├── discovery/
│   ├── normalizer/
│   ├── classifier/
│   ├── scoring/
│   ├── fingerprinting/
│   ├── matching/
│   └── registry/
├── integration/             # uses real Postgres + Redis
│   ├── matcher.int.test.ts
│   ├── recorder.int.test.ts
│   └── resolver.int.test.ts
├── property/                # fast-check + replay
│   ├── scoring.property.test.ts
│   ├── sum-to-one.property.test.ts
│   └── fingerprint.property.test.ts
├── replay/                  # golden-file replay tests
│   └── fixtures/
│       ├── citation-v1.json
│       └── expected-attribution.json
├── e2e/                     # full-pipeline against docker-compose stack
│   └── citation.e2e.test.ts
└── fixtures/
    ├── responses/           # anonymized AI response corpora
    ├── sources/             # anonymized Source content
    └── policies/            # policy version snapshots
```

## Conventions

- **Unit tests** live next to the file they test (`scoring/foo.ts` → `tests/unit/scoring/foo.test.ts`). This folder is for **integration / e2e / replay** only.
- **Fixtures** are versioned under `fixtures/`. New fixture = new folder + `manifest.json`.
- **Replay tests** ensure backward compatibility: a Citation persisted under policy version X must produce the same Attribution when re-run with policy version X.

## Running

```bash
pnpm --filter @nanoproof/citation-engine test           # unit only
pnpm --filter @nanoproof/citation-engine test:int       # integration (needs Postgres + Redis)
pnpm --filter @nanoproof/citation-engine test:e2e       # full stack
pnpm --filter @nanoproof/citation-engine test:replay    # policy version replay
```

## See also

- [`../core/`](../core/README.md)
- [`../scoring/`](../scoring/README.md)
- [`../../../CONTRIBUTING.md`](../../../CONTRIBUTING.md#testing-requirements)