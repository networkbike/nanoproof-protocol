# Security Policy

> ⚠️ **Do not file public issues for security vulnerabilities.** Follow the disclosure process below.

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch | ✅ Active development |
| Latest tagged release | ✅ Critical fixes only |
| Anything older | ❌ No support — please upgrade |

We follow SemVer. Security patches ship as **patch** releases on the latest minor line. Critical vulnerabilities may receive an out-of-band patch release.

---

## Reporting a Vulnerability

**Email:** [security@nanoproof.xyz](mailto:security@nanoproof.xyz)

**PGP key:** [https://nanoproof.xyz/.well-known/pgp.asc](https://nanoproof.xyz/.well-known/pgp.asc) (fingerprint coming in Phase 1.1)

**Subject line:** `[SECURITY] <one-line summary>`

Include:
1. A clear description of the vulnerability.
2. Steps to reproduce (proof-of-concept preferred).
3. The component(s) affected (e.g. `packages/payment-engine`, `contracts/PaymentRouter.sol`).
4. The impact you observed or suspect.
5. Your name / handle for the credit line (or "anonymous" to opt out).

### What to expect

| Stage | SLA |
|-------|-----|
| **Acknowledgement** | within 48 hours |
| **Initial triage** | within 5 business days |
| **Status updates** | every 5 business days until resolved |
| **Fix landed** | target ≤30 days for high-severity; ≤90 days for medium |
| **Public disclosure** | coordinated with the reporter, after the fix ships |

If the vulnerability is in a **smart contract**, expect a faster timeline — we'll prioritize and may request an emergency audit.

---

## Severity Classification

We use CVSS v3.1 as the starting point, then contextualize for protocol impact.

| Severity | Example |
|----------|---------|
| **Critical** | Unauthorized withdrawal of creator funds, signature replay draining PaymentRouter, owner key compromise |
| **High** | Bypass of citation-to-payout linkage, offchain payment state desync causing double-pay, auth bypass on `/api/creators/:id` |
| **Medium** | PII exposure to unauthorized agents, rate-limit bypass, citation spam at scale |
| **Low** | Information disclosure that doesn't enable an attack, UI XSS in dashboard, missing security headers |

---

## Scope

### In scope

- All code under `apps/`, `packages/`, `contracts/`, `scripts/`.
- Official Docker images published from this repo.
- The hosted dashboard, API, and any subdomain under `nanoproof.xyz`.
- The published npm packages `@nanoproof/*`.
- Smart contracts deployed by the NanoProof team to Arc testnet and mainnet.

### Out of scope

- Third-party gateways implementing the NanoProof spec. Report to them directly.
- User errors (lost keys, leaked secrets, wrong recipient address).
- Vulnerabilities requiring physical access to a creator's device.
- Best-practice recommendations without a concrete attack.

---

## Bug Bounty

> **Status: planning phase.** A bug bounty program is being scoped for post-Public-Beta (Phase 9+). We'll publish program rules, scope, and reward tiers before the program goes live. Submitting a report now still gets you a credit and our gratitude.

Tentative tiering (subject to change):

| Severity | Reward (USDC) |
|----------|---------------|
| Critical | $5,000 – $25,000 |
| High | $1,000 – $5,000 |
| Medium | $250 – $1,000 |
| Low | $50 – $250 |

Researchers who follow the disclosure process get full credit in the post-fix advisory and the project README.

---

## Security Architecture (current design)

### Authentication
- **Human users** — Clerk-managed sessions with short-lived JWTs.
- **Agent developers** — API keys issued via the developer portal; rotated and scoped per environment.
- **Onchain operations** — every transaction signed by an agent wallet private key held in Vercel/Railway env vars (Hsm-backed key management is on the Phase 9 roadmap).

### Authorization
- Creators can only modify their own sources + payout settings.
- Agents can only spend up to their per-period quota.
- The API enforces all authorization checks; the SDK is treated as an untrusted boundary.

### Funds safety
- **NanoProof is non-custodial.** At no point do creator funds sit in a NanoProof-controlled wallet.
- All payouts flow agent wallet → Circle Gateway → Arc L1 → creator wallet.
- Smart contracts are immutable in v1; emergency pause is owned by a 3-of-5 multisig (deploying in Phase 7).

### Audit trail
- Every CitationEvent is hashed and persisted to Postgres + ArcScan.
- Every PaymentIntent carries an idempotency key (UUID).
- Every onchain transaction has a public txHash viewable on ArcScan.
- API access logs are retained for 90 days minimum.

---

## Operational Security

If you discover:
- A leaked secret in the repo or in a deployed environment
- A compromised maintainer account
- Suspicious activity in production logs

Contact [security@nanoproof.xyz](mailto:security@nanoproof.xyz) immediately. Treat all such reports as **critical** regardless of context.

---

## Cryptography

- **Hashing:** SHA-256 for content fingerprints.
- **Signatures:** secp256k1 (Ethereum standard) for onchain operations.
- **Transport:** TLS 1.3 minimum. HSTS enforced on all subdomains.
- **Key derivation:** BIP-44 for Arc wallets.

---

## Third-Party Dependencies

We run automated dependency scanning via GitHub Dependabot + `pnpm audit` in CI. Critical CVEs block merges on the affected lines.

For supply-chain concerns, see [`docs/adr/0002-dependency-policy.md`](./docs/adr/0002-dependency-policy.md).

---

## Past Advisories

> _No advisories yet — the protocol is pre-release._

When advisories ship, they'll be linked here with:
- Affected versions
- CVE ID (when assigned)
- Mitigation steps
- Credit to the reporter

---

## Hall of Fame

Researchers who have helped us ship a more secure protocol:

- _Be the first._

---

<div align="center">
<sub>Security is a feature, not an afterthought. Thank you for helping us build it right.</sub>
</div>