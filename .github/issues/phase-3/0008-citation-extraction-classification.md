---
id: P3-008
title: "[Phase 3] Implement Citation Extraction + 5-type Classification"
labels:
  - phase:phase-3
  - area:citation-engine
  - priority:high
  - type:feature
priority: high
depends_on: [P3-004]
milestone: Phase 3 — Citation Engine
estimate: L
---

# [Phase 3] Implement Citation Extraction + 5-type Classification

## Summary

`packages/citation-engine/core/{extractor,classifier}.ts`. Locates the cited span in the response text + assigns one of: DIRECT, INDIRECT, SUPPORTING, REFERENCE, CONTEXT.

## Acceptance criteria

- [ ] Span detection: smallest window that mentions/paraphrases the matched Source.
- [ ] Locator includes `paragraphIndex`, `charStart`, `charEnd`.
- [ ] Classification uses structural cues (quotes → DIRECT; parenthetical → REFERENCE) + embedding similarity (span vs Source body) + optional LLM call for ambiguous cases.
- [ ] Each Citation carries the classification rationale.
- [ ] When ambiguous, classifier outputs ranked alternatives with confidences.
- [ ] Unit tests with hand-classified fixtures.
- [ ] Latency target: <50 ms for typical span.

## Dependencies

- P3-004 (matcher)