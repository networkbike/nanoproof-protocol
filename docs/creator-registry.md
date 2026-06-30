# Creator Registry

> The Creator Registry is the identity layer of NanoProof. Every Source on the protocol must trace back to a verified Creator in this registry.

---

## Table of contents

- [What is a Creator?](#what-is-a-creator)
- [What is an Organization?](#what-is-an-organization)
- [REST surface](#rest-surface)
- [Data model](#data-model)
- [Validation rules](#validation-rules)
- [Errors](#errors)
- [Examples](#examples)

---

## What is a Creator?

A **Creator** is a human who registers content (a Source) for monetization. Every Creator has:

- A unique `username` (URL-safe slug).
- A unique `email` (used for Clerk auth + notifications).
- A `reputationScore` (0+, computed from citation quality + agent feedback).
- 0..n **Wallets** (where payouts settle).
- 0..n **Sources** (the actual monetizable content).
- 0..n **ApiKeys** (for their own integrations).
- 0..n **Organization** memberships.

A Creator is created exactly once per Clerk user. Re-calling `POST /v1/creators` for a Clerk user that already has a Creator returns the existing record (idempotency).

---

## What is an Organization?

An **Organization** groups multiple Creators under a shared entity (e.g. a studio, a lab, a research group). Organizations:

- Have a `name` and a unique `slug`.
- Hold optional shared Sources (`Source.organizationId`).
- Have **memberships** with roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`.
- Can be referenced in citations when a Source is org-owned.

Role matrix:

| Role | Manage org | Invite | Remove | Create source as org |
|------|-----------|--------|--------|----------------------|
| OWNER | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ❌ | ✅ | ✅ | ✅ |
| MEMBER | ❌ | ❌ | ❌ | ✅ (their own only) |
| VIEWER | ❌ | ❌ | ❌ | ❌ |

---

## REST surface

### POST /v1/creators

Create a Creator profile for the authenticated Clerk user.

**Idempotent.** If a Creator already exists for this Clerk user, returns 200 with the existing record.

**Request body:**

```json
{
  "name": "Ada Lovelace",
  "username": "ada",
  "bio": "Writing about the history of computing.",
  "avatarUrl": "https://cdn.nanoproof.xyz/avatars/ada.png",
  "twitterHandle": "@ada",
  "githubHandle": "ada",
  "websiteUrl": "https://ada.example"
}
```

**Response 201:**

```json
{
  "id": "cr_01HXY...Z",
  "name": "Ada Lovelace",
  "username": "ada",
  "email": "ada@example.com",
  "bio": "...",
  "avatarUrl": "...",
  "reputationScore": 0,
  "isActive": true,
  "createdAt": "2026-06-30T22:00:00Z",
  "updatedAt": "2026-06-30T22:00:00Z"
}
```

### GET /v1/creators

List creators, cursor-paginated.

**Query:**

| Param | Type | Notes |
|-------|------|-------|
| `cursor` | string | opaque |
| `limit` | int 1-100 | default 25 |
| `q` | string | prefix search on `username` or `name` |
| `minReputation` | int | default 0 |

**Response 200:**

```json
{
  "data": [{ "id": "cr_...", ... }],
  "nextCursor": "...",
  "hasMore": true
}
```

### GET /v1/creators/:id

Public read. Returns the creator profile + counts.

```json
{
  "id": "cr_01HXY...",
  "name": "Ada Lovelace",
  "username": "ada",
  "bio": "...",
  "avatarUrl": "...",
  "reputationScore": 42,
  "walletCount": 2,
  "sourceCount": 17,
  "totalEarnedUsdc": "12500000",  // $12.50
  "createdAt": "..."
}
```

### PATCH /v1/creators/:id

Update fields. Owner-only.

```json
{
  "name": "Ada Byron Lovelace",
  "bio": "Updated bio.",
  "avatarUrl": "..."
}
```

### DELETE /v1/creators/:id

Soft-delete. Sets `isActive = false` and `deletedAt = now()`. Owner-only.

A soft-deleted Creator cannot be cited (their Sources cascade to `ARCHIVED`).

---

## Data model

See [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma) for the canonical definition.

```prisma
model Creator {
  id              String   @id @default(cuid())
  name            String
  username        String   @unique
  email           String   @unique
  bio             String?
  avatarUrl       String?
  reputationScore Int      @default(0)
  isActive        Boolean  @default(true)
  twitterHandle   String?
  githubHandle    String?
  websiteUrl      String?
  settings        Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  wallets     Wallet[]
  sources     Source[]
  apiKeys     ApiKey[]
  memberships OrganizationMembership[]
}
```

---

## Validation rules

| Field | Rule |
|-------|------|
| `username` | 3-30 chars, `[a-z0-9_-]`, no leading/trailing `-` or `_`, reserved list blocked |
| `name` | 1-80 chars |
| `email` | RFC 5322 + DNS MX hint |
| `bio` | max 500 chars |
| `avatarUrl` | HTTPS only, max 2MB, allowed hosts: `cdn.nanoproof.xyz`, `avatars.githubusercontent.com`, `*.googleusercontent.com` |
| `twitterHandle`, `githubHandle` | max 50 chars, no whitespace |
| `websiteUrl` | HTTPS only |

Reserved usernames: `admin`, `api`, `dashboard`, `signup`, `signin`, `nanoproof`, `support`, `about`, `docs`, `pricing`, `status`.

---

## Errors

| Code | HTTP | When |
|------|------|------|
| `NP_CREATOR_NOT_FOUND` | 404 | `:id` does not exist |
| `NP_USERNAME_TAKEN` | 409 | `username` already in use |
| `NP_EMAIL_TAKEN` | 409 | `email` already in use |
| `NP_USERNAME_RESERVED` | 422 | `username` is on the reserved list |
| `NP_INVALID_AVATAR_URL` | 422 | not HTTPS or untrusted host |
| `NP_AUTH_FAILED` | 401 | invalid or missing token |

---

## Examples

### Create a creator

```bash
curl -X POST https://api.nanoproof.xyz/v1/creators \
  -H "Authorization: Bearer $CLERK_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ada Lovelace",
    "username": "ada",
    "email": "ada@example.com",
    "bio": "Writing about the history of computing."
  }'
```

### Search creators

```bash
curl "https://api.nanoproof.xyz/v1/creators?q=lovelace&limit=10" \
  -H "Authorization: Bearer $CLERK_JWT"
```

### Read public profile

```bash
curl https://api.nanoproof.xyz/v1/creators/cr_01HXY...
```

---

## See also

- [`phase-2-creator-registry.md`](./phase-2-creator-registry.md) — overall Phase 2 architecture
- [`source-verification.md`](./source-verification.md)
- [`wallet-verification.md`](./wallet-verification.md)
- [`protocol-spec.md`](./protocol-spec.md#31-creator)