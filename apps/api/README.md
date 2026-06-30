# `@nanoproof/api`

NestJS 11 REST API for the NanoProof Protocol.

## Quickstart

```bash
docker compose up -d                       # Postgres + Redis
cp .env.example .env                       # then edit DATABASE_URL if needed
pnpm install
pnpm db:migrate                            # apply migrations
pnpm db:seed                               # optional demo data
pnpm dev                                   # http://localhost:4000
```

Swagger UI: <http://localhost:4000/docs>

## Layout

```
apps/api/
├── prisma/
│   ├── schema.prisma            MVP schema (Creator, Wallet, Source, Citation, Payment)
│   └── seed.ts                  Idempotent demo seed
├── src/
│   ├── main.ts                  Bootstrap (helmet, cors, validation pipe, swagger)
│   ├── app.module.ts            Wires modules + ConfigModule + Throttler
│   ├── prisma/                  PrismaService (global)
│   ├── common/
│   │   ├── filters/             HttpExceptionFilter → NP_* codes
│   │   ├── interceptors/        (Phase 2: idempotency, logging)
│   │   ├── pipes/               (Phase 2: zod-validation pipe)
│   │   ├── decorators/          (Phase 2: @CurrentUser, @ApiKey)
│   │   ├── errors/              (Phase 2: typed exceptions)
│   │   └── dto/                 (Phase 2: response envelopes)
│   └── modules/
│       ├── health/              /v1/healthz
│       ├── creators/            /v1/creators (POST + GET list + GET by id)
│       ├── wallets/             /v1/wallets (POST + GET by creator)
│       ├── sources/             /v1/sources (POST + GET by creator)
│       ├── citations/           /v1/citations/simulate (POST) + GET by creator
│       └── payments/            /v1/payments/simulate (POST) + GET by creator
└── test/                        Vitest unit + e2e
```

## Scripts

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `pnpm dev`        | Nest in watch mode                            |
| `pnpm build`      | TypeScript compile → `dist/`                  |
| `pnpm start`      | Run compiled `dist/main.js`                   |
| `pnpm test`       | Vitest unit suite                             |
| `pnpm test:e2e`   | Vitest e2e (hits Postgres)                    |
| `pnpm db:generate`| Regenerate Prisma client                      |
| `pnpm db:migrate` | `prisma migrate dev`                          |
| `pnpm db:migrate:deploy` | `prisma migrate deploy` (prod)         |
| `pnpm db:reset`   | Drop + recreate + re-migrate (DESTRUCTIVE)    |
| `pnpm db:seed`    | Run `prisma/seed.ts`                          |
| `pnpm db:studio`  | Open Prisma Studio on :5555                   |
| `pnpm lint`       | ESLint                                        |
| `pnpm type-check` | `tsc --noEmit`                                |

## What is implemented (MVP scope)

- Health endpoint with DB ping
- Creator CRUD (create + list + get-by-id)
- Wallet attach + list
- Source create + list
- Citation simulate (records a row attributed to a Source)
- Payment simulate (records a SETTLED Payment row)
- Global validation pipe + helmet + cors + rate limiter + swagger

## What is **not** implemented yet

- EIP-191 wallet verification (Phase 2 P2-009)
- Source verification (DNS / HTML / file) (Phase 2 P2-012)
- ApiKey auth + quotas (Phase 2 P2-013)
- Real Citation Engine pipeline (Phase 3)
- Real Payment Engine + Arc settlement (Phase 4)
- Receipt anchoring + ArcScan mirrors (Phase 4)

These all live as issues under `.github/issues/phase-N/`.