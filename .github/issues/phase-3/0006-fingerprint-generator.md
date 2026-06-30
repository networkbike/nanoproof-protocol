---
id: P3-006
title: "[Phase 3] Implement Fingerprint Generator (canonicalizer + hasher + perceptual)"
labels:
  - phase:phase-3
  - area:citation-engine
  - area:fingerprinting
  - priority:high
  - type:feature
priority: high
depends_on: [P3-005]
milestone: Phase 3 — Citation Engine
estimate: L
---

# [Phase 3] Implement Fingerprint Generator

## Summary

`packages/citation-engine/fingerprinting/generator.ts` + supporting files. Per [`docs/source-fingerprinting.md`](../../../docs/source-fingerprinting.md).

## Acceptance criteria

- [ ] URL fetcher with SSRF defense (RFC 1918 + link-local + loopback blocked).
- [ ] URL / domain / title canonicalization.
- [ ] Content canonicalization (HTML → plain text with `<script>/<style>/<nav>/<footer>/<aside>` stripped).
- [ ] SHA-256 `contentHash`.
- [ ] DCT-based `perceptualHash` for images.
- [ ] Metadata extraction (JSON-LD, microdata, OpenGraph).
- [ ] Composite hash `sha256(canonicalized-fingerprint).slice(0,8)`.
- [ ] Embedding computed lazily and stored as `vector(1536)`.
- [ ] Policy version stamped from env (`FP_POLICY_VERSION`).
- [ ] Unit tests + integration tests with seeded Sources.

## Dependencies

- P3-005 (embedders)