---
id: P3-002
title: "[Phase 3] Implement Source Discovery — regex + URL/DOI/arXiv/ISBN extractors"
labels:
  - phase:phase-3
  - area:citation-engine
  - priority:high
  - type:feature
priority: high
depends_on: [P3-001]
milestone: Phase 3 — Citation Engine
estimate: M
---

# [Phase 3] Implement Source Discovery — regex + URL/DOI/arXiv/ISBN extractors

## Summary

`packages/citation-engine/core/discovery.ts`. Extracts `CandidateReference[]` from raw text + agent metadata. Generous by design — false positives are cheap, false negatives are expensive.

## Acceptance criteria

- [ ] URL extractor (`https?://...`).
- [ ] DOI extractor (`10.\d{4,9}/[-._;()/:A-Z0-9]+`).
- [ ] ISBN extractor (10/13 digit + checksum validation).
- [ ] arXiv ID extractor (`arXiv:NNNN.NNNNN[v2]` and bare IDs).
- [ ] GitHub repo extractor (`github.com/<owner>/<repo>`).
- [ ] Author+year pattern (e.g. "Smith et al. 2024").
- [ ] Each candidate includes 200-char `beforeText` / `afterText` context.
- [ ] Unit tests with corpus of 50+ sample responses.
- [ ] Discovery is **never** an agent-supplied URL fetcher — only pattern extraction from text.

## Dependencies

- P3-001 (orchestrator)