# Source Verification

> A **Source** is a single piece of content a Creator registers to monetize. Before an agent can pay for citing a Source, the Source must be **verified** — proven to be owned or controllable by the registering Creator.

This document defines the verification workflow, the three supported methods, the probe order, and the security considerations.

---

## Table of contents

- [Why verify?](#why-verify)
- [Lifecycle](#lifecycle)
- [The three methods](#the-three-methods)
  - [DNS TXT](#1-dns-txt)
  - [HTML meta tag](#2-html-meta-tag)
  - [File upload](#3-file-upload)
- [REST surface](#rest-surface)
- [Probe implementation](#probe-implementation)
- [Retry & caching](#retry--caching)
- [Security considerations](#security-considerations)
- [Errors](#errors)

---

## Why verify?

Without verification, anyone could register any URL on the open web as a Source — including your articles, your photos, your code repos. Verification is the protocol's only protection against impersonation and citation squatting.

Verification is intentionally simple:
- The server generates a **one-time challenge token** (a 32-byte URL-safe random string).
- The creator proves control over the URL by **placing that token in a location only the owner can write to**.
- The server **probes that location** and consumes the challenge on success.

---

## Lifecycle

```
   DRAFT ──► PENDING_VERIFICATION ──► ACTIVE
     │            │                     │
     │            └─► REJECTED          └─► PAUSED ──► ACTIVE
     │                                                      
     └─► ARCHIVED (creator soft-delete)
```

| State | What it means | Can be cited? |
|-------|---------------|---------------|
| `DRAFT` | Creator is still editing | ❌ |
| `PENDING_VERIFICATION` | Challenge issued, awaiting proof | ❌ |
| `ACTIVE` | Verified, payable | ✅ |
| `PAUSED` | Creator temporarily disabled | ❌ |
| `REJECTED` | Verification failed permanently | ❌ |
| `ARCHIVED` | Soft-deleted | ❌ |

---

## The three methods

### 1. DNS TXT

**Use when:** the Source is hosted on a domain the Creator controls (most websites).

**What the Creator does:**
- Adds a TXT record at `_nanoproof-<token>.<domain>` with the value `nanoproof-verify=<token>`.

**What the server probes:**
```
dig TXT _nanoproof-<token>.<domain> @1.1.1.1 +short
```
and checks whether the response contains the token string.

**Propagation:** DNS can take up to 48 hours. The server retries with exponential backoff (5s, 30s, 2m, 10m, 1h) before marking the challenge `REJECTED`.

### 2. HTML meta tag

**Use when:** the Source is a single URL the Creator can edit (blog post, docs page, news article).

**What the Creator does:**
- Adds a `<meta>` tag to the `<head>` of the page:
  ```html
  <meta name="nanoproof-verification" content="<token>">
  ```

**What the server probes:**
```
GET <url>
  → look for <meta name="nanoproof-verification" content="..."> in <head>
  → match `content` attribute against the challenge token
```

**Auto-recommendation:** When a Source is created with a non-root URL, the server suggests HTML meta as the default verification method.

### 3. File upload

**Use when:** the Creator cannot edit DNS or the page HTML (e.g. hosted on a third-party platform).

**What the Creator does:**
- Uploads a file containing the token to the well-known path:
  ```
  https://<domain>/.well-known/nanoproof-<token>.txt
  ```
  with contents:
  ```
  nanoproof-verification: <token>
  ```

**What the server probes:**
```
GET https://<domain>/.well-known/nanoproof-<token>.txt
  → assert body matches /^nanoproof-verification:\s*<token>\s*$/
```

**Why this is the fallback:** it works on any static host with a fixed URL layout, and the path is unobtrusive.

---

## REST surface

### POST /v1/sources

Create a Source in `DRAFT` state.

```json
{
  "title": "On the Origin of Citation",
  "url": "https://ada.example/posts/citation-origin",
  "description": "Why creators should be paid when AI cites them.",
  "license": "CC-BY-4.0",
  "citationPrice": "1000",          // $0.001 USDC
  "minPayout": "100",               // $0.0001 USDC
  "periodCap": "100000",            // $0.10 USDC per agent per 24h
  "organizationId": null,
  "language": "en",
  "contentType": "text/html"
}
```

**Validation:** `url` must be HTTPS and not on a denylist (see Security below).

**Response 201:** full Source record in `DRAFT`.

### POST /v1/sources/:id/challenge

Issue a verification challenge for a Source.

```json
{ "method": "HTML_META" }
```

**Response 200:**

```json
{
  "challengeId": "vc_01HXY...",
  "token": "ak_8f3b2e1d9c...",
  "method": "HTML_META",
  "instructions": {
    "HTML_META": "Add <meta name=\"nanoproof-verification\" content=\"ak_8f3b2e1d9c...\"> to <url>",
    "DNS_TXT": "Add TXT _nanoproof-ak_8f3b2e1d9c....<domain> = nanoproof-verify=ak_8f3b2e1d9c...",
    "FILE_UPLOAD": "Upload a file at https://<domain>/.well-known/nanoproof-ak_8f3b2e1d9c....txt"
  },
  "expiresAt": "2026-06-30T22:30:00Z"
}
```

State transitions to `PENDING_VERIFICATION`.

### POST /v1/sources/:id/verify

Trigger an immediate probe.

**Response 200 (success):** state → `ACTIVE`. Emits `source.verified`.

**Response 422 (failure):** state → `REJECTED`. Body includes `rejectionReason` and the probe that failed.

### Other endpoints

`GET /v1/sources`, `GET /v1/sources/:id`, `PATCH /v1/sources/:id`, `DELETE /v1/sources/:id` — standard CRUD. See [OpenAPI spec](../apps/api/openapi/creator-registry.yaml).

---

## Probe implementation

Probes live in `apps/api/src/sources/verification/`:

| Prober | Responsibility |
|--------|----------------|
| `dns-prober.ts` | `dns.resolveTxt()` with timeout |
| `html-prober.ts` | `fetch(url)`, parse `<head>` for the meta tag |
| `file-prober.ts` | `fetch(url/.well-known/...)`, regex match |
| `verification.processor.ts` | BullMQ worker that schedules retries + emits events |

All probes share:

```typescript
type ProbeResult =
  | { ok: true;  proof: string }                 // `proof` is the evidence captured
  | { ok: false; reason: string; retryable: boolean };
```

The prober:
1. Resolves the challenge from DB (must not be consumed, must not be expired).
2. Runs the probe with a strict timeout (DNS: 5s, HTTP: 5s).
3. On success: marks challenge `consumedAt = now()`, source `status = ACTIVE`, emits `source.verified`.
4. On retryable failure: leaves the challenge open, schedules a retry via BullMQ.
5. On permanent failure: marks source `status = REJECTED`, persists `rejectionReason`.

---

## Retry & caching

| Scenario | Behavior |
|----------|----------|
| DNS not yet propagated | retry at 5s, 30s, 2m, 10m, 1h (5 attempts) |
| HTTP 5xx / timeout | retry at 10s, 1m, 10m (3 attempts) |
| HTTP 4xx (except 429) | permanent reject |
| HTTP 429 | respect `Retry-After`, retry once |
| Token mismatch | permanent reject |
| Challenge expired | return `NP_CHALLENGE_EXPIRED` |

Successful probe results are cached for 60 seconds to absorb retries from over-eager clients.

---

## Security considerations

1. **SSRF defense.** HTML/file probes must not allow the server to fetch internal addresses:
   - Blocklist of IP ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `100.64.0.0/10`, `::1/128`, `fc00::/7`.
   - Resolve the host before fetching and reject if it resolves to a blocked range.
   - Reject URLs with credentials or non-standard ports.
2. **Rate limiting.** Max 10 verification attempts per source per hour. Max 50 per IP per hour.
3. **Challenge entropy.** 32 bytes from `crypto.randomBytes`, base64url-encoded. ~256 bits of entropy.
4. **Single-use.** A consumed challenge cannot be re-validated; re-issuing requires a new challenge.
5. **TTL.** 30 minutes for HTML/file (fast retry); 48 hours for DNS (propagation).
6. **Denylist of hostnames.** Social-media platforms (X, Facebook, Instagram, LinkedIn, Reddit, TikTok, YouTube) — Creators must use HTML meta on a domain they control, or file-upload to a custom subdomain.
7. **HTML parsing.** Use a real parser (e.g. `cheerio`), not regex, to avoid attribute-injection bypasses.

---

## Errors

| Code | HTTP | When |
|------|------|------|
| `NP_SOURCE_NOT_FOUND` | 404 | `:id` does not exist |
| `NP_SOURCE_ALREADY_VERIFIED` | 409 | Source is already ACTIVE |
| `NP_INVALID_VERIFICATION_METHOD` | 422 | method not supported for this URL |
| `NP_CHALLENGE_NOT_FOUND` | 404 | no active challenge |
| `NP_CHALLENGE_EXPIRED` | 410 | challenge > TTL |
| `NP_CHALLENGE_CONSUMED` | 409 | already used |
| `NP_PROBE_TIMEOUT` | 504 | probe exceeded budget |
| `NP_PROBE_FAILED` | 422 | probe returned non-retryable failure |
| `NP_DENIED_HOST` | 422 | hostname on denylist (e.g. social platform) |

---

## See also

- [`phase-2-creator-registry.md`](./phase-2-creator-registry.md)
- [`protocol-spec.md`](./protocol-spec.md#32-source)
- [`../apps/api/openapi/creator-registry.yaml`](../apps/api/openapi/creator-registry.yaml)