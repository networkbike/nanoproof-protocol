# Scripts

> One-off ops, dev tools, and CI helpers for the NanoProof monorepo.

---

## Conventions

- Each script lives in this folder at the repo root or in `scripts/<area>/`.
- Scripts are Node.js (TypeScript) or Bash, never Python (we want zero-dep ops).
- All scripts log structured output via `console.info({ ... })` for Axiom ingest.

---

## Planned scripts (Phase 1+)

| Script | Purpose |
|--------|---------|
| `seed.ts` | Seed the dev DB with fixture creators, sources, and agents |
| `migrate.ts` | Run Prisma migrations against the configured environment |
| `fund-wallet.ts` | Send testnet USDC to a developer wallet from the Canteen-hosted Arc faucet |
| `decode-receipt.ts` | Decode a `CitationReceipt` event from a tx hash |
| `lint-md.ts` | Lint every Markdown file in the repo for broken links + style issues |
| `validate-env.ts` | Validate that every `.env.example` is mirrored in deployed environments |

---

## Running a script

```bash
pnpm tsx scripts/<name>.ts
```

(`tsx` is the project's TS runtime; comes free with the workspace.)

---

## Adding a script

1. Create the file in `scripts/`.
2. Add an entry to `package.json` `scripts` if it's invoked often.
3. Document it in this README.
4. Avoid adding new dependencies unless absolutely necessary.