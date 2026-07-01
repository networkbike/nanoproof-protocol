---
id: P4-006
title: "[Phase 4] Implement Arc client (viem-based) with primary/backup RPC failover"
labels:
  - phase:phase-4
  - area:payment-engine
  - area:settlement
  - priority:high
  - type:feature
priority: high
depends_on: []
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement Arc client (viem-based) with failover

## Summary

`packages/payment-engine/settlement/arc-client.ts`. viem-based Arc RPC client with primary/backup failover.

## Acceptance criteria

- [ ] `sendTransaction`, `waitForFinality`, `balanceOf`, `call`, `getBlock`, `getLogs`.
- [ ] Primary RPC from `PE_ARC_RPC_URL`; backup from `PE_ARC_RPC_URL_BACKUP`.
- [ ] Auto-failover on timeout / 5xx.
- [ ] Finality: 1 confirmation on Arc (~500ms).
- [ ] Unit tests with mocked transport; integration test against Arc testnet.

## Dependencies

None.