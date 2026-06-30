# @nanoproof/shared

> Zod schemas, types, constants, and error catalogs shared across every package.

[![Status: Pre-Alpha](https://img.shields.io/badge/status-pre--alpha-orange.svg)]()

`@nanoproof/shared` is the single source of truth for the protocol's data contracts. Every other package depends on it. If a type or schema lives here, it's because it has to be identical across the API, SDK, engines, and contracts.

---

## What lives here

```
@nanoproof/shared
├── src/
│   ├── schemas/              # Zod schemas for every request/response
│   │   ├── creator.ts
│   │   ├── source.ts
│   │   ├── citation.ts
│   │   ├── payment.ts
│   │   ├── agent.ts
│   │   └── index.ts
│   ├── types/                # TypeScript types derived from Zod
│   ├── constants/            # protocol-wide constants
│   │   ├── networks.ts
│   │   ├── pricing.ts
│   │   └── errors.ts
│   ├── errors/               # typed error catalog
│   ├── utils/                # pure helpers (no I/O)
│   └── config/               # environment-scoped feature flags
└── README.md
```

---

## Design rules

1. **Zod is the source of truth.** TypeScript types are inferred from `z.infer<typeof schema>`. We never hand-write a type that has a Zod twin.
2. **Schemas are exhaustive.** Every request and response shape in the public API has a schema here. Anything not here is internal.
3. **Versions are explicit.** Breaking schema changes bump the schema's `version` field, not just the package version.
4. **No I/O.** This package is pure. No HTTP, no DB, no env reads.

---

## Example

```typescript
import { CitationEventSchema, type CitationEvent } from "@nanoproof/shared";

const raw = await response.json();

const event: CitationEvent = CitationEventSchema.parse(raw);
//   ^ if this doesn't throw, the response is contract-compliant
```

---

## Error catalog

Every error emitted anywhere in the protocol has a stable code in `@nanoproof/shared/errors`:

| Code | Meaning |
|------|---------|
| `NP_INSUFFICIENT_BALANCE` | Agent wallet below required amount |
| `NP_SOURCE_NOT_FOUND` | Cited source is not registered |
| `NP_CITATION_THRESHOLD` | Citation confidence below resolver threshold |
| `NP_GATEWAY_TIMEOUT` | Circle Gateway did not respond within SLA |
| `NP_ARC_RPC_ERROR` | Arc L1 RPC error |
| `NP_DUPLICATE_INTENT` | Idempotent retry detected |
| `NP_RATE_LIMITED` | Agent quota exceeded |
| `NP_AUTH_FAILED` | Invalid API key / signature |

Errors are exported as both string constants and a Zod-validated error schema.

---

## Versioning

This package follows **SemVer** strictly. Any breaking change to a public schema bumps the major version and ships with a migration note in [`docs/migrations/`](../../docs/migrations/).

---

## See also

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — every cross-package boundary uses `@nanoproof/shared`
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md#style-guide) — how to write a good schema

---

## License

MIT — see [`LICENSE`](../../LICENSE).