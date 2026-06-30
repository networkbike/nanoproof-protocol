# `@nanoproof/shared`

Wire-format schemas, error catalog, and atomic-USDC constants shared between `apps/api` and `apps/web`.

## Exports

| Path                  | Contents                                                          |
| --------------------- | ----------------------------------------------------------------- |
| `@nanoproof/shared`   | Re-exports everything below                                       |
| `@nanoproof/shared/schemas` | Zod schemas: `Creator`, `Wallet`, `Source`, `Citation`, `Payment` |
| `@nanoproof/shared/errors`  | `NP_*` error catalog + HTTP status map                       |
| `@nanoproof/shared/constants` | `USDC_DECIMALS`, default prices, policy versions        |

## Why this package exists

The REST wire format is defined once, here. Both the NestJS controllers and the Next.js client validate against the same Zod schemas, so a contract change in one place propagates to both ends after `pnpm --filter @nanoproof/shared build`.

## Adding a new entity

1. Write `src/schemas/<name>.ts` with the Zod schema and `type X = z.infer<...>`.
2. Re-export from `src/schemas/index.ts`.
3. Add the corresponding NP_* error code in `src/errors/index.ts` + status mapping.
4. Run `pnpm --filter @nanoproof/shared build`.
5. Add the matching Prisma model in `apps/api/prisma/schema.prisma`.

## Money is always atomic-USDC strings

Never `number`. Always a `string` of digits (6 decimals). Use `atomicUsdcToUsd()` / `usdToAtomicUsd()` in `src/utils/index.ts` for display.

## Build

```bash
pnpm --filter @nanoproof/shared build
```