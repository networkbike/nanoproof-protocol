# `fingerprinting/` — Source Fingerprinting

> Generates, versions, and matches Source fingerprints. Documented in [`docs/source-fingerprinting.md`](../../../docs/source-fingerprinting.md).

## Purpose

The fingerprint is the canonical identity of a Source at a moment in time. It survives URL / domain / title changes via a content-addressed `compositeHash`. It enables duplicate detection, version tracking, and embedding-based matching.

## Files

| File | Responsibility |
|------|----------------|
| `generator.ts` | `FingerprintGenerator` — orchestrates a full fingerprint generation. |
| `fetcher.ts` | URL fetch + redirect chain capture. Strict SSRF defense. |
| `canonicalizer.ts` | URL / domain / title canonicalization. |
| `hasher.ts` | SHA-256 content hash + perceptual hash (pHash) for media. |
| `metadata.ts` | Extracts structured metadata from HTML / JSON-LD / microdata / OpenGraph. |
| `embedder-client.ts` | Wraps the `Embedder` interface; lazy + cached. |
| `perceptual.ts` | DCT-based pHash for images. Chromaprint for audio. Sampled-frame XOR for video. |
| `composite.ts` | `compositeHash = sha256(canonicalized-fingerprint).slice(0,8)`. |
| `duplicates.ts` | Detection: exact composite match, content-hash match, fuzzy title+author match. |
| `versions.ts` | Version bumping + `SUPERSEDED` lifecycle management. |
| `policy.ts` | Loads the fingerprint policy version from env. |

## Public API

```typescript
export interface FingerprintGenerator {
  generate(req: GenerateFingerprintRequest): Promise<Fingerprint>;
  bump(sourceId: string): Promise<Fingerprint>; // current → SUPERSEDED, new → CURRENT
  findDuplicate(req: { url, contentHash, title, author }): Promise<Fingerprint | null>;
  currentFor(sourceId: string): Promise<Fingerprint | null>;
  historyFor(sourceId: string): Promise<Fingerprint[]>;
}
```

## SSRF defense

`fetcher.ts` enforces:
- Reject RFC 1918, link-local, loopback, CGNAT ranges.
- Reject non-HTTPS URLs.
- Reject credentials in URLs.
- Reject non-standard ports.
- Max 10 MB response.
- Max 10 redirect hops.

## Cache strategy

| Cache | TTL | Storage |
|-------|-----|---------|
| URL → canonical | 24h | Redis |
| Content hash | 7d | Redis |
| Embedding cache | 30d | Redis (LRU) |

## See also

- [`docs/source-fingerprinting.md`](../../../docs/source-fingerprinting.md)
- [`../matching/`](../matching/README.md) — consumes fingerprints
- [`../core/`](../core/README.md)