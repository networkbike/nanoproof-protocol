# Contributing to NanoProof Protocol

Welcome. We're building the open infrastructure layer for creator compensation in the agent economy, and we need your help.

This document is the contract between contributors and maintainers. It explains how we work, how we review, and what we expect. Read it before your first PR — it'll save you a review cycle.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Project values](#project-values)
- [How to contribute](#how-to-contribute)
- [Development setup](#development-setup)
- [Branch + commit conventions](#branch--commit-conventions)
- [Pull request process](#pull-request-process)
- [Issue triage](#issue-triage)
- [Style guide](#style-guide)
- [Testing requirements](#testing-requirements)
- [Documentation requirements](#documentation-requirements)
- [Release process](#release-process)
- [Getting help](#getting-help)

---

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By participating, you agree to uphold it. Report unacceptable behavior to **[conduct@nanoproof.xyz](mailto:conduct@nanoproof.xyz)**.

---

## Project values

1. **Creators come first.** Every change should answer: does this move money to creators faster, more reliably, or more transparently?
2. **Standards over products.** The spec is the product. Anyone should be able to build a competing gateway, indexer, or dashboard against the same primitives.
3. **Hackathon-grade UI, venture-grade core.** Fast and beautiful in the browser, durable and observable on the wire.
4. **Composability wins.** Each package should be independently adoptable.
5. **Ship the boring stuff too.** Migrations, error messages, retries, rate limits — these are features.

---

## How to contribute

There are many ways to contribute. Pick the one that matches your time and skill.

| Path | What you'll do |
|------|----------------|
| 🐛 **Report bugs** | File a [`bug` issue](https://github.com/networkbike/nanoproof-protocol/issues/new?template=bug.yml). |
| 💡 **Request features** | File a [`feature` issue](https://github.com/networkbike/nanoproof-protocol/issues/new?template=feature.yml). |
| 📝 **Improve docs** | Even fixing a typo helps. |
| 🧪 **Write tests** | Coverage is the protocol's immune system. |
| 🔧 **Build features** | Pick a [`good first issue`](https://github.com/networkbike/nanoproof-protocol/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). |
| 🔐 **Audit security** | See [`SECURITY.md`](./SECURITY.md). |
| 🎨 **Design + UX** | The frontend is wide open. |
| 🪙 **Build a competing gateway** | The cleanest signal the protocol works. |

---

## Development setup

### Prerequisites

- **Node.js** ≥ 20.18.2
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **PostgreSQL** ≥ 16 (or a [Neon](https://neon.tech) URL)
- **Foundry** (for contracts): `curl -L https://foundry.paradigm.xyz | bash`
- **Arc CLI** (optional, for live settlement): `uv tool install git+https://github.com/the-canteen-dev/ARC-cli`

### First-time setup

```bash
# 1. Fork + clone
git clone https://github.com/<your-handle>/nanoproof-protocol
cd nanoproof-protocol

# 2. Install deps
pnpm install

# 3. Copy env templates
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Run database (Docker Compose coming in Phase 1.1)
docker compose up -d postgres

# 5. Migrate + seed
pnpm --filter @nanoproof/api db:migrate
pnpm --filter @nanoproof/api db:seed

# 6. Run everything
pnpm dev
```

### Useful scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev` | Runs all apps + packages in watch mode |
| `pnpm build` | Builds every package |
| `pnpm test` | Runs Vitest across the workspace |
| `pnpm test:e2e` | Runs Playwright end-to-end suite |
| `pnpm lint` | ESLint + Prettier checks |
| `pnpm format` | Auto-format the entire repo |
| `pnpm type-check` | `tsc --noEmit` everywhere |
| `pnpm changeset` | Add a Changeset for your PR |

---

## Branch + commit conventions

### Branches

- `main` — always deployable. Never commit directly.
- `feat/<short-name>` — new feature (e.g. `feat/citation-extractor`)
- `fix/<short-name>` — bug fix (e.g. `fix/payment-dedupe`)
- `chore/<short-name>` — tooling, deps, docs
- `refactor/<short-name>` — internal refactor, no behavior change

### Commit messages — Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

**Examples:**

```
feat(citation-engine): add OpenAI embedder adapter
fix(payment-engine): dedupe Gateway batches by PaymentIntent id
docs(README): clarify Arc testnet faucet steps
```

A PR with 1 logical change should have 1 commit. Use `git rebase -i` to squash noise commits before review.

---

## Pull request process

1. **Open an issue first** for non-trivial changes. Describe the problem, the proposed solution, and the alternatives you considered.
2. **Branch from `main`** using the naming convention above.
3. **Make your change** with tests + docs.
4. **Run the full check suite locally:**
   ```bash
   pnpm lint && pnpm type-check && pnpm test && pnpm build
   ```
5. **Add a Changeset** if your change affects a published package:
   ```bash
   pnpm changeset
   ```
6. **Open the PR** using the [PR template](./.github/PULL_REQUEST_TEMPLATE.md).
7. **Pass CI** — all checks must be green before review.
8. **Get one approval** from a code owner. Security-sensitive changes need two.
9. **Squash-merge** once approved. The PR title becomes the commit message.

### Review SLA

- First response within **2 business days**.
- Reviews typically complete within **5 business days** of green CI.
- Stale PRs (>30 days inactive) will be closed. Reopen when you're ready.

---

## Issue triage

We use labels to keep the backlog legible. If you're filing an issue, apply the right labels so it lands in front of the right people.

| Label | Meaning |
|-------|---------|
| `bug` | Something is broken |
| `feature` | New functionality |
| `docs` | Documentation only |
| `good first issue` | Small + well-scoped — first-time contributor friendly |
| `help wanted` | We'd love a contribution here |
| `priority:high` | Blocking or in the current sprint |
| `priority:medium` | Next sprint |
| `priority:low` | Backlog |
| `area:frontend` | `apps/web` |
| `area:api` | `apps/api` |
| `area:sdk` | `packages/sdk` |
| `area:citation-engine` | `packages/citation-engine` |
| `area:payment-engine` | `packages/payment-engine` |
| `area:contracts` | `contracts/` |
| `area:docs` | `docs/` |

---

## Style guide

### TypeScript

- **Strict mode.** No `any`, no implicit `any`, no unchecked nullable access.
- **Zod schemas** for every request/response boundary.
- **Prefer named exports** over default exports.
- **No barrel files** in hot paths — they hurt tree-shaking.

### Formatting

- **Prettier** handles whitespace. Don't bikeshed it.
- **ESLint** handles correctness. Don't disable rules without a comment.
- **Imports** sorted automatically — `simple-import-sort`.

### Naming

- `camelCase` for variables + functions.
- `PascalCase` for types + classes + React components.
- `SCREAMING_SNAKE_CASE` for constants.
- File names `kebab-case.ts` for modules, `PascalCase.tsx` for React components.

### Comments

- Comment **why**, not **what**. The code shows what.
- Public APIs must have JSDoc.
- TODOs reference an issue: `// TODO(#123): handle per-source pricing tiers`.

---

## Testing requirements

Every PR must include tests that prove the change works and won't silently regress.

| Change type | Required tests |
|-------------|----------------|
| New feature | Unit + integration |
| Bug fix | Regression test that fails on `main` and passes on the branch |
| Refactor | Existing tests still pass; no new tests required |
| Docs only | None |
| Build / tooling | Smoke test the changed path |

Aim for **>80% coverage** on every package. We don't enforce a strict number — we enforce "untested code paths are a smell."

### Test conventions

- Unit tests live next to the code: `foo.ts` → `foo.test.ts`.
- Integration tests live in `tests/integration/`.
- E2E tests live in `apps/web/e2e/`.
- Fixtures go in `__fixtures__/` next to the test file.

---

## Documentation requirements

- **Every public API** in `packages/sdk`, `packages/citation-engine`, `packages/payment-engine` needs JSDoc + a usage example in the package README.
- **Every breaking change** needs a migration note in `docs/migrations/`.
- **Every architectural decision** gets an ADR in `docs/adr/`.
- **README, ARCHITECTURE, ROADMAP** stay current. Stale docs are worse than missing docs.

---

## Release process

1. **Changesets** collect version bumps per PR.
2. On every merge to `main`, the **Release** GitHub Action opens a version PR.
3. Merging the version PR publishes packages to npm + PyPI and tags the release.
4. **GitHub Releases** are auto-generated from merged PRs.

We follow **SemVer** strictly. Breaking changes ship on majors only.

---

## Getting help

- **Discord:** [https://discord.gg/8P9Hksd6SU](https://discord.gg/8P9Hksd6SU) — `#nanoproof-builders`
- **GitHub Discussions:** [github.com/networkbike/nanoproof-protocol/discussions](https://github.com/networkbike/nanoproof-protocol/discussions)
- **Email:** [hello@nanoproof.xyz](mailto:hello@nanoproof.xyz)

Don't DM maintainers for support — public channels let others learn from the answer.

---

<div align="center">
<sub>Thank you for building the open creator economy with us.</sub>
</div>