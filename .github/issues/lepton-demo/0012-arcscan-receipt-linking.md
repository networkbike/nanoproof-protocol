---
id: LD-012
title: "[Lepton Demo] ArcScan receipt linking in the Payment Proof panel"
labels:
  - phase:lepton-demo
  - area:web
  - priority:low
priority: low
estimate: S
status: open
milestone: lepton-demo-mvp
---

# [Lepton Demo] ArcScan receipt linking

## Summary

When Phase 4 ships real Arc settlement, every Payment row will carry
a `txHash` and an `arcScanUrl`. The Payment Proof panel should render
those as click-through links to the ArcScan transaction page.

## Acceptance

- [ ] When `payment.arcScanUrl` is non-null, render as a click-through link
- [ ] When null (current MVP), show "View on ArcScan" with a disabled style
- [ ] Tooltip explains what ArcScan is for non-crypto judges
- [ ] The full response JSON still includes the raw URL for power users
