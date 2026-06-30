---
id: P4-005
title: "[Phase 4] Implement x402 envelope signer + validator"
labels:
  - phase:phase-4
  - area:payment-engine
  - area:x402
  - priority:high
  - type:feature
priority: high
depends_on: [P4-004]
milestone: Phase 4 — Payment Engine
estimate: M
---

# [Phase 4] Implement x402 envelope signer + validator

## Summary

`packages/payment-engine/x402/{signer,validator}.ts`. Wrap PaymentQuote in x402 envelope. Validate inbound envelopes.

## Acceptance criteria

- [ ] Envelope shape per [`docs/settlement-arc.md` §x402](../../../docs/settlement-arc.md#x402-protocol-integration).
- [ ] EIP-712 sign with the protocol's domain separator.
- [ ] Validator checks signature, amount, payees, validUntil, policy version.
- [ ] Unit tests for round-trip sign + verify.
- [ ] Conformance test against a reference x402 verifier.

## Dependencies

- P4-004 (quoter)