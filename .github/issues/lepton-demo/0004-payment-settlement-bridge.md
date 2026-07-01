---
id: LD-004
title: "[Lepton Demo] Settlement bridge — agent.settleAttribution → /v1/payments/settle"
labels:
  - phase:lepton-demo
  - area:agent
  - area:api
  - priority:high
priority: high
estimate: M
status: closed
milestone: lepton-demo-mvp
---

# [Lepton Demo] Settlement bridge

## Summary

`@nanoproof/agent` calls `POST /v1/payments/settle` with the responseId and
maps the resulting `Payment` rows back to the per-creator Attribution rows.
The agent is the "Payment Proof" layer for the demo.

## Acceptance

- [x] `settleAttribution(attribution, {client, responseId})` returns `PaymentAllocation[]`
- [x] One PaymentAllocation per Attribution row
- [x] Status, paymentId, txHash, arcScanUrl, settledAt populated from the API response
- [x] `totalPaidAtomic(allocations)` helper for the Payment Proof panel
- [x] Best-effort failure handling — if the API is down, PENDING is returned
