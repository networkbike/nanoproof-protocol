---
milestone: phase-3-citation-engine
title: Phase 3 — Citation Engine
state: open
description: |
  Replace the citation `simulate` endpoint with the real 10-stage pipeline:
  Discovery → Normalization → Matching → Extraction → Classification →
  Scoring → Resolution → Quoting → Recording → Receipt.
  Ship Source Fingerprinting + the Attribution Model + Fraud Prevention.
due_on: 2026-08-05
---

## Acceptance

- [ ] 10-stage pipeline implemented end-to-end, observable via logs/metrics
- [ ] Per-Citation `matchScore`, `confidence`, `contributionFraction` populated by AttributionScorer
- [ ] Fingerprint v1 (HTML + PDF + image hashes) registered for every Source
- [ ] Evidence rows attached to every Citation
- [ ] Fraud signals: rapid-fire citations, snippets outside Source body, hash collisions
- [ ] Disputes endpoint (`POST /v1/disputes`)
- [ ] Analytics rollup worker (`CreatorEarningsDay`, `SourceEarningsDay`)
- [ ] Latency: <500 ms per citation at p95

## Linked issues

25 tickets under `.github/issues/phase-3/`.