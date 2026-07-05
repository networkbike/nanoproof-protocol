# NanoProof Protocol — Documentation

> All protocol documentation lives here. Architecture overviews, integration guides, runbooks, and operational procedures.

## Where to start

| You are a… | Read this first |
|---|---|
| **Judge / hackathon reviewer** | [`JUDGE_GUIDE.md`](./JUDGE_GUIDE.md) — 60-second walkthrough |
| **Submitting to Lepton** | [`SUBMISSION.md`](./SUBMISSION.md) — pre-filled form answers |
| **Demoing the project** | [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) — 5-min presentation flow |
| **Reading the demo screens** | [`DEMO_DASHBOARD.md`](./DEMO_DASHBOARD.md) — what each page shows |
| **Architect / engineer** | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — system design |
| **Operator / on-call** | [`RUNBOOK.md`](./RUNBOOK.md) — deploy + incident response |
| **Wanting to run on Android** | [`TERMUX_SETUP.md`](./TERMUX_SETUP.md) — phone bootstrap |
| **Auditor / security reviewer** | [`../SECURITY.md`](../SECURITY.md) + [`adr/`](./adr/) |

## Technical deep-dives

| Topic | File |
|---|---|
| x402 protocol implementation | [`X402_IMPLEMENTATION.md`](./X402_IMPLEMENTATION.md) |
| Full payment lifecycle | [`PAYMENT_FLOW.md`](./PAYMENT_FLOW.md) |
| SettlementProof + ArcScan | [`ARC_SETTLEMENT.md`](./ARC_SETTLEMENT.md) |
| Phase 8 release notes | [`PHASE8.md`](./PHASE8.md) |
| REST API reference | [`API_REFERENCE.md`](./API_REFERENCE.md) |
| Cross-cutting design notes | [`architecture.md`](./architecture.md) |
| Wire protocol draft | [`protocol-spec.md`](./protocol-spec.md) |

## Subsystems

| Subsystem | File |
|---|---|
| Creator Registry | [`creator-registry.md`](./creator-registry.md) |
| Citation Engine | [`citation-engine.md`](./citation-engine.md) |
| Payment Engine | [`payment-engine.md`](./payment-engine.md) |
| Attribution Model | [`attribution-model.md`](./attribution-model.md) |
| Wallet Verification | [`wallet-verification.md`](./wallet-verification.md) |
| Source Verification | [`source-verification.md`](./source-verification.md) |
| Source Fingerprinting | [`source-fingerprinting.md`](./source-fingerprinting.md) |
| Settlement on Arc | [`settlement-arc.md`](./settlement-arc.md) |
| ArcScan verification | [`arcscan-verification.md`](./arcscan-verification.md) |
| Creator Vaults | [`creator-vaults.md`](./creator-vaults.md) |
| Revenue Allocation | [`revenue-allocation.md`](./revenue-allocation.md) |
| Fee Structure | [`fee-structure.md`](./fee-structure.md) |
| Fraud Prevention | [`fraud-prevention.md`](./fraud-prevention.md) |
| Payout Workflows | [`payout-workflows.md`](./payout-workflows.md) |
| Treasury Management | [`treasury-management.md`](./treasury-management.md) |
| Future Extensions | [`future-extensions.md`](./future-extensions.md) |

## Folders

| Folder | Contents |
|---|---|
| [`adr/`](./adr/) | Architecture Decision Records |
| [`integrations/`](./integrations/) | Per-integration guides |
| [`runbooks/`](./runbooks/) | Operational procedures (incident response, failover) |
| [`migrations/`](./migrations/) | Schema + API migration notes |

## Operations

| Document | File |
|---|---|
| Deploy to Railway | [`DEPLOY_RAILWAY.md`](./DEPLOY_RAILWAY.md) |
| Deploy overview | [`deployment.md`](./deployment.md) |
| Analytics API | [`analytics-api.md`](./analytics-api.md) · [`analytics.md`](./analytics.md) |

## Quick commands

```bash
# Health
curl https://nanoproof-api-production.up.railway.app/v1/healthz

# Metrics
curl https://nanoproof-api-production.up.railway.app/metrics

# Run the full stack locally (Docker)
docker compose up -d && pnpm dev

# Run on Android Termux
bash scripts/termux-install-fast.sh
```

See [`../STATUS.md`](../STATUS.md) for what's live right now.