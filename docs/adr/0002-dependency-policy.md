# ADR 0002: Dependency Policy

- **Status:** Accepted
- **Date:** 2026-06-30
- **Authors:** @networkbike

## Context and Problem Statement

NanoProof ships software that handles real money. A supply-chain compromise in any dependency could lead to unauthorized payouts. We need a defensible policy for choosing, auditing, and maintaining third-party dependencies.

## Decision Drivers

- **Funds safety.** Anything in the payment path gets extra scrutiny.
- **Operational sustainability.** Maintainers can't review 500 transitive deps by hand.
- **Velocity.** We're shipping during a hackathon; we need automated guardrails, not review-by-committee.

## Considered Options

1. **Allowlist-only.** No dependency enters the repo without manual review.
2. **Automated scanning only.** Dependabot + `pnpm audit` + CI gates.
3. **Hybrid: allowlist for payment-path deps, automated scanning for the rest.**

## Decision Outcome

**Chosen option:** **3. Hybrid.**

- **Payment-path deps** (anything imported by `@nanoproof/payment-engine` or `contracts/`) require an explicit allowlist entry with a justification, a pinned version range, and a code owner.
- **All other deps** rely on Dependabot + weekly `pnpm audit` + CI gates for critical/high CVEs.
- **Native modules are banned.** Termux and sandboxed environments can't build them. We use pure-JS alternatives (sql.js, bcryptjs, etc.) where possible.

### Positive Consequences

- Pragmatic — doesn't block shipping.
- Extra scrutiny on the code that touches money.
- No native-build pain across environments.

### Negative Consequences

- Hybrid policies are easy to violate by accident (people forget what's "payment-path").
- Maintainers must keep the allowlist current.

## Pros and Cons of the Options

### Option 1 — Allowlist-only

- ✅ Maximum control.
- ❌ Slows every PR to a crawl.
- ❌ Doesn't scale past 50 deps.

### Option 2 — Automated scanning only

- ✅ Velocity.
- ❌ A zero-day in a payment-path dep would slip through before CI flags it.

### Option 3 — Hybrid

- ✅ Pragmatic balance.
- ❌ Requires discipline.

## References

- [`SECURITY.md`](../../SECURITY.md)
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- [GitHub Dependabot docs](https://docs.github.com/en/code-security/dependabot)