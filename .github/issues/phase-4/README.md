# Phase 4 Implementation Issues

> Twenty-five issues for Phase 4 (Payment Engine). Each file is a self-contained implementation ticket.

## Index

| ID | Title | Priority | Depends on | Estimate |
|----|-------|----------|------------|----------|
| [P4-001](./0001-payment-engine-orchestrator.md) | PaymentEngine top-level orchestrator | 🔴 High | — | L |
| [P4-002](./0002-aggregator-citation-to-intent.md) | Aggregator — CitationEvents to PaymentIntent | 🔴 High | P4-001 | M |
| [P4-003](./0003-allocator-splits-org-recursive.md) | Allocator — splits + org + recursive royalties | 🔴 High | P4-001 | L |
| [P4-004](./0004-quoter-eip712.md) | Quoter — signed PaymentQuote (EIP-712) | 🔴 High | P4-003 | M |
| [P4-005](./0005-x402-envelope-signer.md) | x402 envelope signer + validator | 🔴 High | P4-004 | M |
| [P4-006](./0006-arc-client-viem.md) | Arc client (viem-based) + failover | 🔴 High | — | M |
| [P4-007](./0007-circle-gateway-client.md) | Circle Gateway client + batch executor | 🔴 High | P4-006 | M |
| [P4-008](./0008-vault-manager.md) | VaultManager (CRUD + splits + migration) | 🔴 High | — | M |
| [P4-009](./0009-fee-calculator-tier-evaluator.md) | FeeCalculator + TierEvaluator + RebateEngine | 🔴 High | — | M |
| [P4-010](./0010-treasury-fee-accrual.md) | TreasuryManager + FeeAccruer + HotWallet | 🔴 High | P4-009, P4-006 | M |
| [P4-011](./0011-receipt-writer-hash-chain.md) | ReceiptWriter + HashChain + Verifier | 🔴 High | P4-007 | M |
| [P4-012](./0012-prisma-migration-payment-engine.md) | Prisma migration for Payment Engine schema | 🔴 High | — | M |
| [P4-013](./0013-shared-zod-schemas-payment.md) | Payment Zod schemas in @nanoproof/shared | 🔴 High | — | M |
| [P4-014](./0014-rest-controllers-vaults-payments.md) | REST controllers for /v1/vaults + /v1/payments | 🔴 High | P4-008, P4-012, P4-013 | L |
| [P4-015](./0015-rest-controllers-payouts-receipts.md) | REST controllers for /v1/payouts + /v1/receipts | 🔴 High | P4-014 | M |
| [P4-016](./0016-rest-controllers-treasury.md) | REST controllers for /v1/treasury + /v1/fees + /v1/rebates | 🔴 High | P4-014 | M |
| [P4-017](./0017-reconciliation-worker.md) | Periodic Reconciler (local DB vs Arc L1) | 🔴 High | P4-006, P4-011 | M |
| [P4-018](./0018-replay-tool-receipt-allocation.md) | Receipt + Allocation replay tooling | 🟡 Med | P4-011 | S |
| [P4-019](./0019-hot-wallet-drain-protection.md) | HotWallet drain protection + daily cap | 🔴 High | P4-010 | S |
| [P4-020](./0020-fraud-gate-pre-execution.md) | FraudGate pre-execution check | 🔴 High | P4-001 | S |
| [P4-021](./0021-clawback-cooperation.md) | Cooperative clawback flow | 🟡 Med | P4-008, P4-011 | M |
| [P4-022](./0022-multisig-treasury-withdrawal.md) | Multisig TreasuryWithdrawal flow | 🔴 High | P4-010 | M |
| [P4-023](./0023-rate-limiting-payment-engine.md) | Rate limiting on Payment Engine endpoints | 🔴 High | P4-014 | S |
| [P4-024](./0024-acceptance-tests-phase-4.md) | Phase 4 acceptance — full e2e on Arc testnet | 🔴 High | P4-001, P4-003, P4-007, P4-010, P4-011 | M |
| [P4-025](./0025-shared-error-catalog-phase-4.md) | Extend NP_* error catalog with Phase 4 codes | 🔴 High | — | S |

## Suggested execution order

1. **Foundation** (parallel):
   - P4-025 (errors)
   - P4-013 (Zod schemas)
   - P4-012 (Prisma migration)
   - P4-006 (Arc client)
2. **Core components**:
   - P4-001 (orchestrator)
   - P4-008 (VaultManager)
   - P4-002 (Aggregator)
   - P4-009 (FeeCalculator)
3. **Allocation + Quoting**:
   - P4-003 (Allocator)
   - P4-004 (Quoter)
   - P4-005 (x402)
4. **Settlement**:
   - P4-007 (Gateway)
   - P4-010 (Treasury + HotWallet)
   - P4-011 (ReceiptWriter + HashChain)
   - P4-019 (drain protection)
5. **Cross-cutting**:
   - P4-020 (FraudGate)
   - P4-021 (clawback)
   - P4-022 (multisig withdrawal)
   - P4-017 (Reconciler)
6. **API surface**:
   - P4-014 (vaults + payments controllers)
   - P4-015 (payouts + receipts controllers)
   - P4-016 (treasury + fees + rebates controllers)
   - P4-023 (rate limiting)
7. **Tooling + Done**:
   - P4-018 (replay tooling)
   - P4-024 (acceptance test)

## Labels used

| Label | Meaning |
|-------|---------|
| `phase:phase-4` | Phase 4 issue |
| `area:api` / `area:shared` | Surface |
| `area:payment-engine` / `area:settlement` / `area:vaults` / `area:allocation` / `area:receipts` / `area:treasury` / `area:fees` / `area:x402` / `area:fraud` / `area:database` / `area:prisma` | Module |
| `priority:high` / `priority:medium` / `priority:low` | Effort priority |
| `type:feature` / `type:database` / `type:validation` / `type:security` / `type:reliability` / `type:tooling` / `type:testing` | Issue type |
| `milestone:Phase 4 — Payment Engine` | All Phase 4 issues share this milestone |