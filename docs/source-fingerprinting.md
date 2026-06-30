# Source Fingerprinting

> The fingerprint is the canonical identity of a Source at a moment in time. It lets the Citation Engine deduplicate, version-track, and resolve the same piece of content even when URL, title, or hosting changes.

---

## Table of contents

- [Why fingerprint?](#why-fingerprint)
- [The fingerprint object](#the-fingerprint-object)
- [Inputs and how each is computed](#inputs-and-how-each-is-computed)
- [Composite fingerprint](#composite-fingerprint)
- [Duplicate detection](#duplicate-detection)
- [Version tracking](#version-tracking)
- [Source identity resolution](#source-identity-resolution)
- [Perceptual hashes for media](#perceptual-hashes-for-media)
- [Storage](#storage)
- [Cache strategy](#cache-strategy)
- [Security considerations](#security-considerations)
- [API surface](#api-surface)

---

## Why fingerprint?

URLs change. Titles are edited. Domains expire and are re-registered. Hosting moves from WordPress to Substack to a personal site. Without a stable identity, the same article could be re-registered as a new Source, splitting its citation history.

Fingerprinting solves three problems:

1. **Dedup** — when a Creator registers what is clearly the same article under a slightly different URL.
2. **Provenance** — when a Creator claims a Source, the system verifies the content matches what the fingerprint claims.
3. **Migration** — when a Source's URL changes, the Creator can re-link to the existing fingerprint without losing citation history.

---

## The fingerprint object

```typescript
type SourceFingerprint = {
  // Stable identity across URL/domain/title changes.
  id: string;                       // "fp_<ulid>"

  // Component hashes.
  contentHash: string;              // sha256(canonicalized content bytes), hex
  perceptualHash?: string;          // pHash for images / audio / video (16 hex chars)
  urlCanonical: string;             // final URL after redirects, normalized
  domainCanonical: string;          // eTLD+1 (e.g. "nytimes.com", not "www.nytimes.com")
  titleCanonical: string;           // trimmed + NFKC-normalized

  // Structured metadata used for matching.
  metadata: {
    authors?: string[];             // ["Ada Lovelace", "Charles Babbage"]
    publishedAt?: string;           // ISO date, best-effort
    language?: string;              // BCP-47 (e.g. "en")
    doi?: string;                   // "10.1234/xyz"
    isbn?: string;
    arxivId?: string;
    wordCount?: number;
    readingTimeSec?: number;
    contentType?: string;           // MIME
    license?: string;               // SPDX or human-readable
    keywords?: string[];
  };

  // Embeddings (computed lazily).
  embedding?: number[];             // vector(1536) when present
  embeddingModel?: string;
  embeddedAt?: string;

  // Provenance + versioning.
  contentFetchedAt: string;
  contentBytes: number;
  policyVersion: string;            // "fp.v1.2.0"
};
```

---

## Inputs and how each is computed

### URL → `urlCanonical`

1. Resolve all HTTP redirects (max 10 hops).
2. Lowercase host.
3. Strip tracking query params (`utm_*`, `fbclid`, `gclid`, `mc_eid`, `_ga`, etc.).
4. Normalize `www.` prefix (strip).
5. Resolve punycode (`xn--…`) to Unicode.
6. Sort remaining query params alphabetically (for stable equality).

```typescript
// Examples
// in : "HTTP://Www.NYTimes.com/Article?id=123&utm_source=x"
// out: "https://nytimes.com/article?id=123"

// in : "https://github.com/user/repo/?ref=abc#readme"
// out: "https://github.com/user/repo#readme"
```

### Domain → `domainCanonical`

Use the [Public Suffix List](https://publicsuffix.org/) via the `psl` npm package to compute eTLD+1. Strip subdomains (`blog.nytimes.com` → `nytimes.com`, `github.io` → `github.io`).

### Title → `titleCanonical`

1. NFKC-normalize Unicode.
2. Trim whitespace.
3. Collapse internal whitespace to single spaces.
4. Strip leading/trailing punctuation.
5. Lowercase (only for storage / equality checks; display keeps original casing).

### Content → `contentHash`

The canonical content is the **rendered text** (HTML stripped to plain text) for text content, or the file bytes for binary content. SHA-256 over the canonical bytes, hex-encoded.

For HTML, canonicalization includes:
- Strip `<script>`, `<style>`, `<nav>`, `<footer>`, `<aside>`.
- Strip all HTML tags, keeping only text.
- Decode HTML entities.
- Collapse whitespace.
- Strip BOM and zero-width chars.

For PDFs, we extract text via `pdf-parse` or `pdfjs-dist` before hashing.

### Metadata → `metadata.*`

| Field | Source |
|-------|--------|
| `authors` | `<meta name="author">`, JSON-LD `Person`, OpenGraph `article:author`, microdata |
| `publishedAt` | `<meta property="article:published_time">`, JSON-LD `datePublished`, HTTP `Last-Modified` |
| `language` | `<html lang>`, `og:locale` |
| `doi` | `<meta name="citation_doi">`, datacite |
| `isbn` | `<meta name="citation_isbn">` |
| `arxivId` | extracted from URL or `<meta name="citation_arxiv_id">` |
| `wordCount` | computed post-canonicalization |
| `readingTimeSec` | `ceil(wordCount / 220 * 60)` |
| `license` | `<a rel="license">`, JSON-LD, microdata, `<meta name="license">` |
| `keywords` | `<meta name="keywords">`, JSON-LD `keywords` |

If any field cannot be determined confidently, it is omitted (not stored as `null`).

---

## Composite fingerprint

A Source can match against the registry via any one of the following composite signals:

```typescript
// Composite hash: 8-char prefix of sha256 of the JSON-canonicalized fingerprint.
fingerprint.compositeHash = sha256(JSON.stringify({
  contentHash,
  urlCanonical,
  domainCanonical,
  titleCanonical,
  doi,
  arxivId,
  authors: metadata.authors?.sort(),
})).slice(0, 8);
```

`compositeHash` is what we compare for "are these the same Source?" equality.

---

## Duplicate detection

When a Creator registers a new Source, the registry computes its fingerprint and runs:

1. **Exact composite match.** If `compositeHash` matches an existing Source, surface "this Source is already registered" and offer to claim it instead.
2. **Content-hash match.** If `contentHash` matches, definitely the same content. Treat as duplicate.
3. **URL-only match.** If `urlCanonical` matches but `contentHash` doesn't, flag for Creator review (content has changed — possible version bump).
4. **Fuzzy match.** If `titleCanonical` and one of `authors[0]` match with high similarity, suggest as possible duplicate.

The Creator always makes the final call. The engine does not auto-merge.

---

## Version tracking

A Source can have **multiple Fingerprint rows** over time:

```
Source
  ├── Fingerprint v1  (2024-01-01)  content_hash=A
  ├── Fingerprint v2  (2024-06-15)  content_hash=B  ← minor edit
  └── Fingerprint v3  (2025-02-01)  content_hash=C  ← major rewrite
```

The current canonical Fingerprint is the latest non-`SUPERSEDED` row. Older rows are kept forever for auditability.

When the engine matches a citation, it records which Fingerprint version was the canonical one **at that moment**. A Creator who edits their article cannot retroactively hide old citations.

```sql
CREATE TABLE fingerprints (
  id              text PRIMARY KEY,
  source_id       text NOT NULL REFERENCES sources(id),
  version         int  NOT NULL,
  status          text NOT NULL,        -- CURRENT | SUPERSEDED
  content_hash    text NOT NULL,
  url_canonical   text NOT NULL,
  ...
  UNIQUE (source_id, version)
);
```

---

## Source identity resolution

When an agent submits a Citation request, the matcher needs to resolve "which Source did the agent mean?" in this order:

```
1. Exact composite hash        → use that Source
2. Exact content_hash          → use that Source, possibly mark version bump
3. URL canonicalization match  → use that Source (warning if content_hash differs)
4. DOI / arXiv / ISBN match    → use that Source
5. Embedding similarity ≥ 0.92 → use that Source
6. Embedding similarity ≥ τ    → use that Source (warn)
7. Below threshold             → no Source; emit unresolved candidate for review
```

Steps 1–4 are considered **high-precision** matches (≥ 0.95 confidence). Steps 5–6 are **embedding-assisted**. Step 7 is rejected.

---

## Perceptual hashes for media

For image, audio, and video Sources we compute a perceptual hash (`pHash`) in addition to the byte hash:

- **Images:** 64-bit DCT-based pHash via `sharp` + custom implementation.
- **Audio:** Chromaprint fingerprint via `chromaprint-js`.
- **Video:** Sampled keyframes hashed individually; combined hash = XOR of keyframe hashes.

This lets the engine recognize an image that's been resized, recompressed, or cropped — common adversarial transformations.

---

## Storage

```
fingerprints (append-only)
├── id (pk)
├── source_id (fk)
├── version (int, monotonic per source)
├── status (CURRENT | SUPERSEDED)
├── content_hash
├── perceptual_hash
├── url_canonical
├── domain_canonical
├── title_canonical
├── metadata (jsonb)
├── embedding (vector(1536))
├── embedding_model
├── embedded_at
├── content_fetched_at
├── content_bytes
├── policy_version
└── created_at
```

Indexes:
- `UNIQUE(source_id, version)`
- `(source_id, status)` for "current fingerprint per source"
- HNSW on `embedding` for nearest-neighbor lookups.

---

## Cache strategy

| Cache | TTL | Purpose |
|-------|-----|---------|
| `fp:url:<canonical>` | 24h | Skip re-fetching known URLs |
| `fp:content:<sha256>` | 7d | Skip re-hashing identical content |
| `fp:embed:<sha256>` | 30d | Reuse embeddings for identical content |

All caches are bounded (LRU). Cache misses fall through to a fresh fetch + canonicalize + hash.

---

## Security considerations

1. **No URL fetching from untrusted input.** Fingerprints are generated only for Sources that have passed Source Verification (Phase 2). We never fetch arbitrary URLs posted by an agent.
2. **Bounded fetch size.** Max 10 MB per Source. Anything larger is rejected.
3. **No JavaScript execution.** Pages are parsed as text. We use a strict HTML parser, not a browser engine.
4. **Content vs display.** We hash rendered text, not raw HTML. Adversaries who modify display styling cannot shift the hash.
5. **Provenance logging.** Every fetch stores the User-Agent, IP, and final URL. Auditors can trace every fingerprint back to a network observation.

---

## API surface

```
POST   /v1/fingerprints/generate     # generate a fingerprint for a Source (server-side)
GET    /v1/fingerprints/:id          # read
GET    /v1/fingerprints/by-url       # lookup by URL
GET    /v1/fingerprints/by-content/:hash   # lookup by content hash
GET    /v1/fingerprints/by-doi/:doi         # lookup by DOI
GET    /v1/fingerprints/source/:sourceId    # list all versions for a source
```

See [`../apps/api/openapi/citation-engine.yaml`](../apps/api/openapi/citation-engine.yaml) for the canonical OpenAPI spec.

---

## See also

- [`citation-engine.md`](./citation-engine.md) — how fingerprints are consumed in the pipeline
- [`fraud-prevention.md`](./fraud-prevention.md) — fingerprint-level abuse detection
- [`protocol-spec.md`](./protocol-spec.md#32-source)