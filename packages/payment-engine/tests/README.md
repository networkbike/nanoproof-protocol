# `tests/` — Test Suite

> Unit + integration + property-based + replay tests for the Payment Engine. Lives in this package, not at the repo root, because the engine is shipped as a standalone library.

## Structure

```
tests/
├── unit/
│   ├── core/                  # orchestrator + aggregator + quoter
│   ├── settlement/            # arc client + gateway + x402
│   ├── allocation/            # splits + recursive + org policy
│   ├── vaults/                # vault CRUD + splits validation
│   ├── fees/                  # fee calc + tier + rebate
│   ├── treasury/              # treasury + hot wallet + withdrawals
│   ├── receipts/              # hash chain + verification
│   └── policy/                # policy versioning
├── integration/              # uses real Postgres + Redis + Arc testnet
│   ├── settlement.int.test.ts
│   ├── receipts.int.test.ts
│   └── reconciler.int.test.ts
├── property/                  # fast-check
│   ├── allocation.property.test.ts
│   └── hash-chain.property.test.ts
├── replay/                    # golden-file replay tests
│   └── fixtures/
│       ├── receipt-v1.json
│       └── expected-hash.json
├── e2e/                       # full pipeline
│   └── payout.e2e.test.ts
└── fixtures/
    ├── receipts/              # sample Receipt rows
    ├── intents/               # sample PaymentIntents
    └── policies/              # policy version snapshots
```

## Conventions

- Unit tests live next to the file they test (`vaults/foo.ts` → `tests/unit/vaults/foo.test.ts`).
- Integration tests against Arc testnet are gated by `INTEGRATION=true` env var.
- Golden fixtures are versioned; new fixture = new folder + `manifest.json`.

## Running

```bash
pnpm --filter @nanoproof/payment-engine test           # unit
pnpm --filter @nanoproof/payment-engine test:int       # integration (Arc testnet)
pnpm --filter @nanoproof/payment-engine test:e2e       # full stack
pnpm --filter @nanoproof/payment-engine test:replay    # hash-chain replay
pnpm --filter @nanoproof/payment-engine test:property  # fast-check
```

## See also

- [`../core/`](../core/README.md)
- [`../../../CONTRIBUTING.md`](../../../CONTRIBUTING.md#testing-requirements)