# Setup Guide

Get the NanoProof monorepo running locally in under 5 minutes.

## Prerequisites

| Tool  | Version           | Check           |
| ----- | ----------------- | --------------- |
| Node  | >= 20.18.2        | `node --version` |
| pnpm  | 9.x               | `pnpm --version` |
| Docker | 24+ (optional)   | `docker --version` |

Don't have pnpm? `corepack enable && corepack prepare pnpm@9 --activate`.

## 1. Clone

```bash
git clone https://github.com/networkbike/nanoproof-protocol.git
cd nanoproof-protocol
```

## 2. Install dependencies

```bash
pnpm install
```

This installs all workspaces via the workspace catalog.

## 3. Bring up Postgres + Redis

Either via Docker (recommended):

```bash
docker compose up -d
```

Or natively — any Postgres 16 instance and Redis 7 instance work. Update `apps/api/.env` accordingly.

## 4. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Defaults assume `localhost:5432` Postgres and `localhost:6379` Redis. Override `DATABASE_URL` if needed.

## 5. Migrate the database

```bash
pnpm --filter @nanoproof/api db:migrate
```

For production / Neon: use `pnpm --filter @nanoproof/api db:migrate:deploy` instead.

## 6. Seed demo data (optional)

```bash
pnpm --filter @nanoproof/api db:seed
```

This creates a demo creator + wallet + source so the simulator has something to use.

## 7. Run

```bash
pnpm dev
```

| App | URL                          |
| --- | ---------------------------- |
| api | <http://localhost:4000>      |
| web | <http://localhost:3000>      |
| api docs | <http://localhost:4000/docs> |

## 8. Try the simulator

Open <http://localhost:3000/simulate> and click **Run simulation**. Then check <http://localhost:3000/dashboard> to see the recorded citation + settled payment.

## Next steps

- Read [`DEVELOPMENT.md`](./DEVELOPMENT.md) for the day-to-day workflow.
- Browse issues under [`.github/issues/phase-2/`](./.github/issues/phase-2/) to find a ticket.
- Skim [`docs/`](./docs/) for the architecture behind the surface you're touching.