---
milestone: phase-4-payment-engine
title: Phase 4 — Payment Engine
state: open
description: |
  Replace the payment `simulate` endpoint with the real 8-stage pipeline:
  Aggregate → Allocate → Quote → Sign x402 → Batch → Settle on Arc →
  Anchor Receipt → Mirror. Ship Circle Gateway integration, Creator
  Vaults, Treasury management, Fee Structure.
due_on: 2026-08-26
---

## Acceptance

- [ ] 8-stage pipeline implemented end-to-end
- [ ] USDC settles on Arc testnet via Circle Gateway
- [ ] x402 quote header returned to agents; agent signs and replays
- [ ] Receipts anchored with `txHash` + `arcScanUrl` populated
- [ ] Vault balance updated within ≤2 s of finality
- [ ] Treasury 3-of-5 multisig on Arc mainnet
- [ ] Hot-wallet cap enforced ($10k USDC default daily)
- [ ] Payout batched every 60 s
- [ ] Fee schedule applied: 1.5% protocol, 0.5% treasury, 0.5% rebate

## Linked issues

25 tickets under `.github/issues/phase-4/`.