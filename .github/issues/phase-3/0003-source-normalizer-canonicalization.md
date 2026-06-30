---
id: P3-003
title: "[Phase 3] Implement Source Normalization — URL/domain/title canonicalization + DOI resolution"
labels:
  - phase:phase-3
  - area:citation-engine
  - priority:high
  - type:feature
priority: high
depends_on: [P3-002]
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Implement Source Normalization

## Summary

`packages/citation-engine/core/normalizer.ts`. Converts `CandidateReference[]` → `NormalizedReference[]` with canonical form + redirect chain + provenance.

## Acceptance criteria

- [ ] URL: resolve redirects (max 10), lowercase host, strip tracking params, normalize `www.`, resolve punycode.
- [ ] Domain: compute eTLD+1 via `psl` package.
- [ ] Title: NFKC normalize, trim, collapse whitespace, lowercase for equality.
- [ ] DOI: resolve via `https://doi.org/<doi>` to canonical URL.
- [ ] arXiv: convert `1234.5678` → `https://arxiv.org/abs/1234.5678`.
- [ ] GitHub: canonicalize to `https://github.com/<owner>/<repo>`.
- [ ] Each `NormalizedReference` carries `NormalizerVersion` (from env).
- [ ] Unit tests + golden-file fixtures.

## Dependencies

- P3-002 (discovery)