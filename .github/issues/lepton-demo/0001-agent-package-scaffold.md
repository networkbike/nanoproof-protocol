---
id: LD-001
title: "[Lepton Demo] Scaffold @nanoproof/agent package with core/research/citations/attribution/settlement/prompts/types/tests"
labels:
  - phase:lepton-demo
  - area:agent
  - priority:high
priority: high
estimate: M
status: closed
milestone: lepton-demo-mvp
---

# [Lepton Demo] Scaffold @nanoproof/agent package

## Summary

Stand up the canonical `@nanoproof/agent` package with the seven sub-packages
the demo depends on.

## Acceptance

- [x] `packages/agent/package.json` with workspace deps
- [x] `src/core/{tokenize,client,orchestrator}.ts`
- [x] `src/research/{matcher,answer,types}.ts`
- [x] `src/citations/index.ts` (stub for Phase 3 hook)
- [x] `src/attribution/attribution.ts`
- [x] `src/settlement/settlement.ts`
- [x] `src/prompts/templates.ts`
- [x] `src/types/agent.ts`
- [x] `src/data/demo-sources.ts` (5 Lepton-relevant sources)
- [x] `test/{tokenize,matcher}.spec.ts` — 16/16 pass
- [x] tsc --noEmit clean

## Resolution

Shipped in commit `pending`. Package exposes `research()` orchestrator that
runs the full pipeline: Question → Research → Citation Match → Attribution → Settlement.
