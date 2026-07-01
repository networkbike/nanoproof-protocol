---
id: LD-007
title: "[Lepton Demo] Demo dataset — 5 Lepton-relevant sources"
labels:
  - phase:lepton-demo
  - area:agent
  - priority:high
priority: high
estimate: S
status: closed
milestone: lepton-demo-mvp
---

# [Lepton Demo] Demo dataset

## Summary

`packages/agent/src/data/demo-sources.ts` ships with 5 Lepton-relevant
Sources, each tied to a registered Creator and a $0.001 citation price.

## Sources

1. **Bitcoin Restaking: A Complete Guide** (SatLayer)
2. **SatLayer Protocol Overview** (SatLayer)
3. **Babylon Protocol Documentation** (Babylon Labs)
4. **Arc L1 — Programmable USDC Settlement** (Arc Foundation)
5. **The Creator Compensation Stack (2026)** (Creator Economy Lab)

## Acceptance

- [x] Each entry has title, url, author, creatorUsername, citationPrice, topic, keywords
- [x] `pnpm --filter @nanoproof/agent seed` registers all 5 creators + sources + wallets
- [x] Idempotent (NP_USERNAME_TAKEN → 409 → upsert path)
- [x] 5 deterministic placeholder Arc testnet addresses
