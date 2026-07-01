---
id: LD-003
title: "[Lepton Demo] Attribution model — 60/25/15 split + atomic USDC payout"
labels:
  - phase:lepton-demo
  - area:agent
  - priority:high
priority: high
estimate: S
status: closed
milestone: lepton-demo-mvp
---

# [Lepton Demo] Attribution model

## Summary

Compute per-creator attribution from the matched citations. Apply the
canonical 60/25/15 split for top 3 matches. Payouts are atomic USDC strings,
never numbers.

## Acceptance

- [x] `buildAttribution(matches)` returns `Attribution[]`
- [x] Aggregates by creatorId (a creator cited twice sums their contribution)
- [x] Atomic USDC conversion via `atomicUsdToDisplay()` (6 decimals)
- [x] Unit tests cover the aggregation
