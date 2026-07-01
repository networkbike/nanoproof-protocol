---
id: LD-005
title: "[Lepton Demo] /research page with 7 panels (Hero, Query, Response, Sources, Attribution, Payment, Settlement, Proof)"
labels:
  - phase:lepton-demo
  - area:web
  - priority:high
priority: high
estimate: L
status: closed
milestone: lepton-demo-mvp
---

# [Lepton Demo] /research page

## Summary

Build the judge-facing research demo at `apps/web/src/app/research/page.tsx`.
The page exposes the full NanoProof pipeline in a single, scrolling view.

## Acceptance

- [x] Hero — "Every AI Citation Becomes a Payment"
- [x] Query Input — textarea + suggested prompts + "Ask the agent" button
- [x] AI Response — markdown-ish response text with inline source links
- [x] Sources Used — list of matched sources with score, creator, URL
- [x] Attribution — table with contribution % + atomic USDC payout
- [x] Payment Allocation — same data, USDC totals
- [x] Settlement — status badges (SETTLED / PENDING / FAILED) per payment
- [x] Payment Proof — responseId, total paid, settled count, scenario
- [x] Client-side `useTransition` for non-blocking submit
- [x] Tailwind 4 styles via existing @theme tokens
