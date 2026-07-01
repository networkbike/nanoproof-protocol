---
milestone: lepton-demo-mvp
title: Lepton Demo MVP
state: open
description: |
  Ship a judge-facing research demo that runs the NanoProof protocol
  end-to-end. Build for demo readiness, not protocol completeness.
due_on: 2026-07-05
---

## Acceptance

- [ ] `pnpm install && pnpm dev` brings up the full stack
- [ ] `pnpm --filter @nanoproof/agent seed` registers 5 demo creators + sources
- [ ] `http://localhost:3000/research` renders the 7-panel judge UI
- [ ] "Ask the agent" returns a responseId, citations, attribution, and settled payments within 2s
- [ ] 30/30 unit tests pass; tsc --noEmit clean across all workspaces
- [ ] Deployment docs cover Vercel + Railway + Neon
- [ ] 5-min demo script ready to record
- [ ] Lepton submission ≤3-min demo video linked from README

## Linked issues

12 issues under `.github/issues/lepton-demo/` cover the implementation.