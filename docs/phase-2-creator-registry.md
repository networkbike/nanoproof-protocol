# Phase 2 — Creator Registry Architecture

> **Status:** Architecture complete; implementation lands in [GitHub Issues](#implementation-issues) (see `.github/issues/phase-2/`).
> **Owners:** Backend, Protocol
> **Depends on:** Phase 1 (Repository Foundation)
> **Blocks:** Phase 3 (Citation Engine), Phase 5 (Payment Engine)

This document is the architectural blueprint for the **Creator Registry** — the part of NanoProof that lets creators sign up, register their content (Sources), verify ownership of their wallets, and manage API keys for their own integrations.

The three sub-documents cover each pillar in detail:

- [`creator-registry.md`](./creator-registry.md) — Creator profiles, Organizations, the `/creators` REST surface.
- [`source-verification.md`](./source-verification.md) — Source registration + DNS / HTML meta / file-upload verification.
- [`wallet-verification.md`](./wallet-verification.md) — Arc wallet ownership via EIP-191 signature challenges.

---

## 1. Goals

1. A creator can sign up via Clerk and complete a profile in <2 minutes.
2. A creator can register a Source and prove ownership via one of three verification methods, with the standard method (HTML meta) auto-detected.
3. A creator can connect one or more Arc wallets and prove ownership via an EIP-191 signature challenge.
4. A creator can issue API keys for their own agent integrations (or for organization members).
5. Every state-changing operation is authenticated, idempotent where possible, and emits a structured audit event.

---

## 2. Bounded contexts

The Phase 2 backend introduces five bounded contexts, each its own NestJS module:

| Module | Owns | Reads from | Writes to |
|--------|------|------------|-----------|
| `auth` | Clerk JWT verification, session guards | — | — |
| `creators` | Creator profile, memberships | auth | `creators`, `organization_memberships` |
| `organizations` | Org CRUD, memberships, invitations | auth | `organizations`, `organization_memberships` |
| `wallets` | Wallet CRUD + EIP-191 verification | auth, creators | `wallets`, `verification_challenges` |
| `sources` | Source CRUD + DNS/HTML/file verification | auth, creators | `sources`, `verification_challenges` |
| `apikeys` | Issue / list / revoke keys | auth, creators | `api_keys` |

Each module exposes:
- A **controller** (REST surface)
- A **service** (business logic)
- A **repository** (Prisma queries)
- **DTOs** (Zod schemas from `@nanoproof/shared`)
- An **events** surface for downstream modules (NestJS EventEmitter)

---

## 3. Data model summary

See [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma) for the canonical definition. Summary:

```
Organization ─< OrganizationMembership >─ Creator ─< Wallet
                                       │
                                       ├─< Source >─ Organization?
                                       │
                                       └─< ApiKey
```

- A **Creator** is the human identity. Has a username, email, reputation score.
- A **Wallet** belongs to a Creator. Address is unique per network. Status flows UNVERIFIED → PENDING → VERIFIED.
- A **Source** belongs to a Creator (and optionally to an Organization). Has a unique `(creatorId, url)` pair. Status flows DRAFT → PENDING_VERIFICATION → ACTIVE.
- An **Organization** is optional. A Creator can belong to many Orgs at different roles.
- An **ApiKey** belongs to a Creator. Used by the Creator's own integrations (Phase 3+ agent developers will get their own first-class identity).
- A **VerificationChallenge** is a one-time token issued for both wallet and source verification.

### Key design choices

1. **String IDs everywhere.** Prisma `cuid()`, application layer prefixes them with `cr_`, `wl_`, `src_`, `org_`, `ak_`. No auto-incrementing integers, no UUIDv4.
2. **Money is a string of atomic units.** `citationPrice` is `"1000"` (= $0.001 USDC). Never `Float` or `Decimal` for money.
3. **Soft delete on Creator + Source.** Hard delete only via a GDPR erasure job.
4. **Embeddings live on Source.** Stored as `vector(1536)` (pgvector) — populated by a Phase 3 worker.
5. **Cached counters on Source.** `citationCount` and `earnedAtomic` are denormalized for fast dashboard reads; refreshed by a BullMQ worker that listens to `payment.settled` events.

---

## 4. REST surface (summary)

Full OpenAPI spec lives at [`apps/api/openapi/creator-registry.yaml`](../apps/api/openapi/creator-registry.yaml).

### Creator

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/v1/creators` | Clerk | Create a creator profile (idempotent on Clerk userId) |
| `GET` | `/v1/creators` | Clerk | List creators (paginated, cursor-based) |
| `GET` | `/v1/creators/:id` | Public | Read creator profile |
| `PATCH` | `/v1/creators/:id` | Clerk (owner) | Update profile |
| `DELETE` | `/v1/creators/:id` | Clerk (owner) | Soft-delete |

### Wallet

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/v1/wallets` | Clerk | Attach a wallet |
| `GET` | `/v1/wallets` | Clerk | List wallets for the current creator |
| `PATCH` | `/v1/wallets/:id` | Clerk (owner) | Update label / isPrimary |
| `POST` | `/v1/wallets/:id/challenge` | Clerk (owner) | Issue EIP-191 challenge |
| `POST` | `/v1/wallets/:id/verify` | Clerk (owner) | Submit signature, mark VERIFIED |

### Source

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/v1/sources` | Clerk | Register a source (DRAFT) |
| `GET` | `/v1/sources` | Public | List sources (filterable by `creatorId`, `domain`, `status=ACTIVE`) |
| `GET` | `/v1/sources/:id` | Public | Read source |
| `PATCH` | `/v1/sources/:id` | Clerk (owner) | Update source |
| `DELETE` | `/v1/sources/:id` | Clerk (owner) | Archive |
| `POST` | `/v1/sources/:id/challenge` | Clerk (owner) | Issue verification challenge |
| `POST` | `/v1/sources/:id/verify` | Clerk (owner) | Submit verification proof, mark ACTIVE |

### Organization

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/v1/organizations` | Clerk | Create an organization |
| `GET` | `/v1/organizations` | Public | List orgs |
| `GET` | `/v1/organizations/:id` | Public | Read org |
| `POST` | `/v1/organizations/:id/members` | Clerk (owner/admin) | Invite a creator |
| `PATCH` | `/v1/organizations/:id/members/:memberId` | Clerk (owner/admin) | Update role |
| `DELETE` | `/v1/organizations/:id/members/:memberId` | Clerk (owner/admin) | Remove |

### ApiKey

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/v1/apikeys` | Clerk | Issue a key (plaintext returned once) |
| `GET` | `/v1/apikeys` | Clerk | List keys (never return keyHash) |
| `DELETE` | `/v1/apikeys/:id` | Clerk (owner) | Revoke |

All endpoints:
- Use cursor-based pagination via `?cursor=&limit=`.
- Return ETag + Last-Modified for caching.
- Surface errors from the `NP_*` catalog in `@nanoproof/shared`.
- Emit structured events on success (consumed by the Indexer, the Analytics worker, and the audit log).

---

## 5. Authentication & authorization

Phase 2 supports two auth modes side-by-side:

| Mode | Where used | Verification |
|------|-----------|--------------|
| **Clerk session** | Creator dashboard, organization admin | JWT bearer, verified via `clerkBackend.verifyToken()` |
| **ApiKey** | Agent + creator-owned integrations | `Authorization: Bearer np_live_xxx...`; hashed + looked up on every request |

Both modes resolve to the same `AuthContext`: `{ creatorId, scopes, rateLimitTier }`. Controllers never check the mode — they consume the resolved context.

Authorization is per-resource:
- `Creator` is owned by exactly one Clerk user.
- `Wallet`, `Source`, `ApiKey` are owned by exactly one `Creator`.
- `Organization` membership governs access to org-scoped `Source`s.

---

## 6. Idempotency

Every `POST` accepts an optional `Idempotency-Key` header. The server caches the response for 24h. Re-submitting the same key returns the cached response without re-running the handler. This is critical for `POST /v1/sources` and `POST /v1/wallets`, which clients retry aggressively.

---

## 7. Event surface

Every successful state change emits a structured event via NestJS EventEmitter:

| Event | Emitted by | Consumed by |
|-------|-----------|-------------|
| `creator.created` | creators.service | analytics, audit |
| `creator.updated` | creators.service | analytics, audit |
| `creator.deleted` | creators.service | audit (GDPR record) |
| `wallet.added` | wallets.service | analytics |
| `wallet.verified` | wallets.service | analytics, audit |
| `wallet.revoked` | wallets.service | audit |
| `source.created` | sources.service | analytics |
| `source.verified` | sources.service | citation-engine worker (Phase 3) |
| `source.archived` | sources.service | analytics |
| `apikey.issued` | apikeys.service | audit, security alert |
| `apikey.revoked` | apikeys.service | audit, security alert |

Phase 2 ships the EventEmitter wiring; the downstream consumers (Indexer, analytics worker) come online in Phase 6.

---

## 8. Verification flows (high-level)

### 8.1 Wallet verification (EIP-191)

```
1. POST /v1/wallets/:id/challenge
      → server creates VerificationChallenge { kind: "wallet", subjectId: walletId, token: <random>, expiresAt: now+15min }
      → server returns { message: <canonical string>, nonce: <token> }

2. Client signs `message` with the wallet's private key (EIP-191 personal_sign)

3. POST /v1/wallets/:id/verify { signature }
      → server recovers signer from signature
      → server compares recovered address to wallet.address (case-insensitive)
      → server consumes VerificationChallenge, marks Wallet.verificationStatus = VERIFIED
      → server emits wallet.verified
```

See [`wallet-verification.md`](./wallet-verification.md) for the full spec, message format, replay-attack defenses, and rate limits.

### 8.2 Source verification (DNS / HTML / File)

```
1. POST /v1/sources  → DRAFT source created
2. POST /v1/sources/:id/challenge { method }
      → server creates VerificationChallenge { kind: "source", subjectId: sourceId, token: <random> }
      → server returns the appropriate challenge for the chosen method:
           DNS_TXT:    "Add a TXT record at _nanoproof-<token>.<domain>"
           HTML_META:  "Add <meta name="nanoproof-verification" content="<token>"> to <url>"
           FILE_UPLOAD: "Upload a file at /.well-known/nanoproof-<token>.txt"
3. Creator performs the action out-of-band.
4. POST /v1/sources/:id/verify
      → server probes DNS / fetches HTML / reads file → looks for the token
      → server consumes VerificationChallenge, marks Source.status = ACTIVE
      → server emits source.verified
```

See [`source-verification.md`](./source-verification.md) for the exact probe order, retry policy, and security considerations.

---

## 9. NestJS folder layout

```
apps/api/src/
├── auth/
│   ├── auth.module.ts
│   ├── clerk.strategy.ts
│   ├── apikey.strategy.ts
│   ├── guards/
│   │   ├── clerk-auth.guard.ts
│   │   ├── apikey-auth.guard.ts
│   │   └── scopes.guard.ts
│   └── decorators/
│       ├── current-creator.decorator.ts
│       └── scopes.decorator.ts
│
├── creators/
│   ├── creators.module.ts
│   ├── creators.controller.ts
│   ├── creators.service.ts
│   ├── creators.repository.ts
│   ├── dto/
│   │   ├── create-creator.dto.ts
│   │   ├── update-creator.dto.ts
│   │   └── query-creators.dto.ts
│   └── events/
│       ├── creator-created.event.ts
│       └── creator-updated.event.ts
│
├── organizations/
│   ├── organizations.module.ts
│   ├── organizations.controller.ts
│   ├── organizations.service.ts
│   ├── organizations.repository.ts
│   ├── dto/...
│   └── events/...
│
├── wallets/
│   ├── wallets.module.ts
│   ├── wallets.controller.ts
│   ├── wallets.service.ts
│   ├── wallets.repository.ts
│   ├── verification/
│   │   ├── challenge.service.ts
│   │   ├── signature.service.ts     # EIP-191 verify via viem
│   │   └── verification.processor.ts
│   ├── dto/...
│   └── events/...
│
├── sources/
│   ├── sources.module.ts
│   ├── sources.controller.ts
│   ├── sources.service.ts
│   ├── sources.repository.ts
│   ├── verification/
│   │   ├── challenge.service.ts
│   │   ├── dns-prober.ts           # DNS TXT lookups
│   │   ├── html-prober.ts          # fetch + parse meta tags
│   │   ├── file-prober.ts          # /.well-known fetch
│   │   └── verification.processor.ts
│   ├── dto/...
│   └── events/...
│
├── apikeys/
│   ├── apikeys.module.ts
│   ├── apikeys.controller.ts
│   ├── apikeys.service.ts
│   ├── apikeys.repository.ts
│   ├── token.ts                    # plaintext generation + sha256 hashing
│   ├── dto/...
│   └── events/...
│
├── common/
│   ├── filters/all-exceptions.filter.ts
│   ├── interceptors/idempotency.interceptor.ts
│   ├── pipes/zod-validation.pipe.ts
│   ├── errors/                     # NP_* catalog mirror
│   └── pagination/cursor.paginator.ts
│
├── infra/
│   ├── prisma/
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── events/
│   │   ├── events.module.ts
│   │   └── events.service.ts
│   ├── config/
│   │   └── env.schema.ts           # Zod-validated env loader
│   └── http/
│       └── http.module.ts
│
└── main.ts
```

---

## 10. Configuration

New env vars (added to `apps/api/.env.example`):

| Var | Purpose | Required |
|-----|---------|----------|
| `CLERK_SECRET_KEY` | Clerk API | yes |
| `CLERK_JWT_KEY` | JWT verification | yes |
| `CLERK_WEBHOOK_SECRET` | lifecycle webhooks | yes |
| `VERIFICATION_CHALLENGE_TTL_MIN` | challenge expiry (default 15) | no |
| `DNS_PROBE_TIMEOUT_MS` | DNS probe budget (default 5000) | no |
| `HTML_PROBE_TIMEOUT_MS` | HTML fetch budget (default 5000) | no |
| `WALLET_MESSAGE_PREFIX` | EIP-191 prefix (default `NanoProof Wallet Verification`) | no |
| `API_KEY_PREFIX` | plaintext prefix (default `np_live_`) | no |

---

## 11. Observability

- **Sentry** — every controller wraps with a Sentry breadcrumb.
- **Axiom** — every event emission logs the canonical subject ID.
- **Health endpoint** — `/v1/healthz` checks Clerk reachability, Prisma, and Redis.
- **Metrics** — Prometheus on `/metrics`: per-endpoint latency, verification success rate, apikey issuance rate.

---

## 12. Security checklist

- [x] All routes authenticated except the explicitly public ones (`GET /v1/creators/:id`, `GET /v1/sources`, `GET /v1/sources/:id`).
- [x] Wallet signatures are verified server-side via `viem.verifyMessage` — never trusted from the client.
- [x] DNS lookups are rate-limited per source + IP to prevent abuse.
- [x] HTML probes respect `robots.txt` and abort on 4xx/5xx > 3 retries.
- [x] VerificationChallenges are single-use, expire, and bound to a creator + IP.
- [x] ApiKey plaintext is returned exactly once at creation; only the SHA-256 hash is stored.
- [x] Soft delete on Creator + Source; audit log preserves the deletion event forever.

---

## 13. Implementation issues

Twenty-two issues are filed under `.github/issues/phase-2/`. See [Implementation issues](#implementation-issues) for the index.

---

## 14. Acceptance criteria for Phase 2

Phase 2 is **done** when:

1. A creator can sign up, complete a profile, and see themselves in the dashboard.
2. A creator can register a Source, run the HTML meta verification, and see the source move to `ACTIVE` in <60 seconds.
3. A creator can attach an Arc wallet and verify it via EIP-191 signature in <30 seconds.
4. An organization can be created, a member invited, and the member accepts.
5. A creator can issue an API key, hit `/v1/sources` with it, and get a 200 response.
6. All `NP_*` errors are surfaced correctly under failure conditions.
7. All OpenAPI paths render in Swagger UI.
8. CI is green on every PR.

See [`ROADMAP.md`](../ROADMAP.md#phase-2--creator-registry-) for the original Phase 2 commitments.

---

## 15. Open questions / ADRs to file during implementation

| Question | Proposed ADR |
|----------|-------------|
| Soft-delete retention window? | ADR-0006 |
| ApiKey plaintext rotation policy? | ADR-0007 |
| Multi-org role inheritance? | ADR-0008 |
| Reputation score formula? | ADR-0009 |

These are intentionally **not** pre-decided — they get filed by whoever picks up the implementing issue.

---

<div align="center">
<sub>Phase 2 architecture complete. Implementation kicks off when the maintainers approve the issues in <code>.github/issues/phase-2/</code>.</sub>
</div>