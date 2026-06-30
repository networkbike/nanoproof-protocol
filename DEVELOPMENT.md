# Development Guide

The day-to-day workflow for building on NanoProof.

## Layout

```
nanoproof-protocol/
├── apps/
│   ├── api/         NestJS 11 + Prisma 6 (REST API)
│   └── web/         Next.js 15 (dashboard + simulator)
├── packages/
│   └── shared/      Zod schemas, errors, constants (workspace:*)
├── docs/            Phase 2-5 architecture docs
├── .github/
│   └── issues/      70+ issues, one per ticket, by phase
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Workspace commands

Run from the root:

| Command               | What it does                                        |
| --------------------- | --------------------------------------------------- |
| `pnpm install`        | Install all workspaces                              |
| `pnpm dev`            | Run all `dev` scripts in parallel (api + web)       |
| `pnpm build`          | Build all packages via Turborepo                   |
| `pnpm lint`           | ESLint everywhere                                  |
| `pnpm type-check`     | `tsc --noEmit` everywhere                           |
| `pnpm test`           | Run vitest everywhere                              |
| `pnpm --filter @nanoproof/api db:migrate` | Run Prisma migrations     |
| `pnpm --filter @nanoproof/api db:seed`    | Seed demo creator + wallet |
| `pnpm --filter @nanoproof/api db:studio`  | Open Prisma Studio         |

## Backend workflow (apps/api)

```bash
# Edit schema
$EDITOR apps/api/prisma/schema.prisma

# Generate migration
pnpm --filter @nanoproof/api db:migrate -- --name add_vault_table

# Apply migrations
pnpm --filter @nanoproof/api db:migrate:deploy

# Inspect data
pnpm --filter @nanoproof/api db:studio
```

To add a module:

1. Create `apps/api/src/modules/<name>/<name>.{module,controller,service}.ts`
2. Wire it into `apps/api/src/app.module.ts`
3. Add Zod schema(s) to `packages/shared/src/schemas/`
4. Re-export from `packages/shared/src/schemas/index.ts`

## Frontend workflow (apps/web)

```bash
# Dev server
pnpm --filter @nanoproof/web dev

# Production build
pnpm --filter @nanoproof/web build

# Add a shadcn component
mkdir -p apps/web/src/components/ui
# then write the component (the button + card primitives are already in src/components/ui/)
```

Pages live under `apps/web/src/app/`. Server components fetch from `process.env.NEXT_PUBLIC_API_URL`. Client components go through `apps/web/src/lib/api.ts`.

## Shared package

`packages/shared` is the single source of truth for wire-format validation. Both api and web import from `@nanoproof/shared/schemas`, `@nanoproof/shared/errors`, `@nanoproof/shared/constants`.

After editing shared:

```bash
pnpm --filter @nanoproof/shared build
```

Both apps transpile it via `transpilePackages` / direct imports — no rebuild required during dev.

## Conventions

- **Money is atomic USDC strings**, never `number` / `Float`. See `packages/shared/src/constants/index.ts`.
- **IDs are strings**, prefixed with `<resource>_`. ULIDs land in Phase 6.
- **Errors use the `NP_*` catalog** from `packages/shared/src/errors`. Throw with `{ code, message, status }`.
- **Modules are append-only** — never UPDATE a Citation / Payment / Attribution. Write a new row.
- **Every controller validates input via Zod** at the boundary.

## Submitting a PR

1. Pick an issue from `.github/issues/phase-N/`
2. Create a branch: `git checkout -b phase-N/<ticket>-<slug>`
3. Make the change, add tests where applicable
4. Run `pnpm lint && pnpm type-check && pnpm test` from the root
5. Open a PR referencing the issue ID (e.g. `Closes P2-006`)
6. Wait for CI

## Useful shortcuts

| Task                                       | Command                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| Reset the DB                               | `docker compose down -v && docker compose up -d && pnpm --filter @nanoproof/api db:migrate` |
| Tail API logs                              | `pnpm --filter @nanoproof/api dev -- --watch`                          |
| Regenerate Prisma client                   | `pnpm --filter @nanoproof/api db:generate`                             |
| Verify the build                           | `pnpm build`                                                           |