---
id: LD-002
title: "[Lepton Demo] Lightweight citation matching (keyword overlap)"
labels:
  - phase:lepton-demo
  - area:agent
  - priority:high
priority: high
estimate: S
status: closed
milestone: lepton-demo-mvp
---

# [Lepton Demo] Lightweight citation matching

## Summary

Replace the Phase 3 fingerprint pipeline with a keyword-overlap scorer that
runs in-memory. The thin slice is enough to surface 2-3 sources per question
for the demo, and the real Phase 3 engine lands later.

## Acceptance

- [x] `tokenize()` strips stopwords, lowercases, drops < 2 chars
- [x] `keywordOverlap()` returns proportion of query tokens found in source
- [x] `cosineSimilarity()` helper for future use
- [x] `matchSources()` returns top 3 matches with 60/25/15 contribution split
- [x] Unit tests: 7/7 pass
