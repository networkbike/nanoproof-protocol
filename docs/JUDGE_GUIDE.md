# Judge Guide — NanoProof Protocol

> **For Lepton Hackathon judges.** This document walks you through the
> 60-second demo path so you can experience NanoProof's x402 payment protocol
> + Arc settlement proof + ArcScan verification end-to-end.
>
> All demo URLs are **public** — no auth, no setup, no installation required.

---

## TL;DR

```
Web:  https://nanoproof-web-production.up.railway.app
API:  https://nanoproof-api-production.up.railway.app
Docs: https://nanoproof-web-production.up.railway.app/api  (Swagger)
```

**Recommended 60-second demo path**:

1. **`/payments`** — Click "▶ Start x402 flow" → watch a complete payment settle in ~10s
2. **`/history`** — See the new settlement appear in the table with ArcScan link
3. **`/dashboard`** — Watch protocol metrics update in real time

---

## The 60-second demo walkthrough

### Step 1 · `/payments` — Run the x402 payment flow (~30s)

**What you'll see**:
- Header: "x402 Payment Protocol · Phase 8 Live"
- 4 KPI cards: total settlements, USDC distributed, 402 challenges served, x402 payments settled
- A control panel with creator selector, resource selector, and amount input
- A settlement timeline panel (initially shows empty state)

**What to do**:
1. Pick a creator from the dropdown (default: Alice)
2. Pick a resource (default: `/v1/research/cite` — $0.001 USDC)
3. Click **"▶ Start x402 flow"**

**What happens** (in ~5-10 seconds):
- The button shows the current step: "Creating challenge…" → "Authorizing…" → "Settling on Arc…" → "Verifying on ArcScan…"
- The right panel populates with the **settlement timeline**:
  - ✓ 402 Payment Required (challenge emitted)
  - ✓ Client authorized (EIP-3009 nonce signed)
  - ✓ Settled on Arc (txHash visible)
  - ✓ ArcScan verification (VERIFIED badge)
- An **"Verify on ArcScan"** link appears pointing to `https://testnet.arcscan.app/tx/0x...`

**What's interesting**:
- Click the ArcScan link to see the **on-chain transaction** (or near-real Arc-shaped txHash in demo mode)
- The settlement proof is **hash-chained**: each settlement's `hash = sha256(prevHash + canonical body)`, making the protocol tamper-evident
- The amount was $0.001 USDC for `/v1/research/cite` — true nanopyments

### Step 2 · `/history` — See history populate (~15s)

**What you'll see**:
- Header: "Settlement history"
- 3 KPI cards: total settled, x402 payments, USDC distributed
- **Settlements table**: every payment with status, amount, txHash, ArcScan link, proof link
- **Recent supporters**: payer wallets with totals

**What to do**:
- Watch the page — it auto-refreshes every 8 seconds
- Click any row's **"View →"** link to see the full proof detail

**What's interesting**:
- The newest settlement (from your Step 1 click) appears at the top
- Every settlement has a working ArcScan link
- Every settlement has a working proof detail link
- Supporters show real wallet addresses with USDC totals

### Step 3 · `/dashboard` — Watch metrics update (~15s)

**What you'll see**:
- The standard NanoProof dashboard with creator + citation + payment + revenue KPIs
- A **Phase 8 · x402** strip showing:
  - 402 challenges served
  - x402 payments settled
  - ArcScan verified
  - Unique supporters

**What to do**:
- Watch the numbers — they should be slightly higher than before your Step 1 click

**What's interesting**:
- The dashboard shows the **protocol-wide** impact of your single settlement
- `totalSettlements` and `x402PaymentsSettled` both incremented
- `lastSettlementAt` updates to "just now"

---

## If you want to dig deeper

### `/history/[id]` — proof detail

Click any "View →" link in the settlements table. You'll see:
- Full SettlementProof (paymentHash, txHash, blockNumber, ArcScan URL, prevHash, hash)
- **Verification timeline**: every ArcScan check attempt (initial + on-demand re-verifies)
- Linked Payment (status, amount, creator, settledAt)
- A **"Re-verify on ArcScan"** button that polls the latest verification status

### `/api-keys` — API key management

Standard demo. Not Phase 8 specific. Useful for understanding the auth model.

### `/research` — Research demo

The Phase 5 demo. Shows citation detection + payment settlement in a single UI flow.

### `/simulate` — Simulator

Direct API simulator. Type a citation prompt, see it settle.

### API Swagger (`/api` → click "API Reference")

The complete API contract. All 11 x402 endpoints are documented:
- `POST /x402/demo` — one-click flow
- `POST /payments/create|authorize|settle|verify`
- `GET /payments/history|:id|/proof/:id`
- `GET /creators/:id/revenue`
- `GET /metrics`, `GET /supporters`

---

## Try it from the command line

```bash
# Run the entire one-click flow from your terminal
curl -X POST https://nanoproof-api-production.up.railway.app/x402/demo \
  -H "Content-Type: application/json" \
  -d '{"creatorId":"cr_demo_alice","resource":"/v1/research/cite","amountUsdc":"1000"}'

# Check protocol-wide metrics
curl https://nanoproof-api-production.up.railway.app/metrics

# See recent settlements
curl "https://nanoproof-api-production.up.railway.app/payments/history?limit=5"

# See recent supporters
curl "https://nanoproof-api-production.up.railway.app/supporters?limit=5"
```

Each `/x402/demo` call:
1. Creates a PaymentRequest with a fresh EIP-3009 nonce
2. Authorizes the request with a synthetic agent signature (demo mode)
3. Settles on Arc (synthetic txHash in demo mode)
4. Creates a SettlementProof with `paymentHash = sha256(canonical body)`
5. Verifies via ArcScan Blockscout v2 API (synthetic in demo mode)
6. Updates the singleton ProtocolMetrics row

---

## What's demo mode vs production

For the Lepton demo, the api runs with `NANOPROOF_DEMO_MODE=true`. This means:

| Real production | Demo mode |
|---|---|
| Client signs EIP-712 transferWithAuthorization | Auto-synthesized signature |
| Facilitator submits to USDC on Arc | Synthetic txHash |
| ArcScan verifies the real tx | Synthetic verifier response (source: "SYNTHETIC") |
| 1 confirmation = final (Arc BFT) | Synthetic block numbers in 9.5M–10M range |

**Everything else** is identical:
- Same x402 challenge format (`x402Version: 1`)
- Same EIP-3009 nonce + validBefore window
- Same SettlementProof schema
- Same hash chain (`hash = sha256(prevHash + canonical body)`)
- Same ArcScan URL format
- Same REST API contract

**To switch to production mode**: set `NANOPROOF_DEMO_MODE=false` on the Railway api service. The x402 service will then verify the client's EIP-712 signature via ECDSA recovery and submit the transferWithAuthorization onchain via the configured facilitator.

---

## Architecture (1-paragraph version)

NanoProof implements **x402** (Coinbase's open standard for HTTP 402 Payment Required) on **Arc** (Circle's stablecoin-native L1) with **EIP-3009** (gasless USDC transfers) and verifies every settlement on **ArcScan** (Blockscout v2). The protocol produces an **immutable, hash-chained SettlementProof** for every payment — making the system tamper-evident and publicly auditable onchain.

**Why x402**: First protocol to actually use HTTP 402 for payments. No accounts, no SDKs, no subscriptions. AI agents pay autonomously with a single HTTP header.

**Why Arc**: USDC-native gas, sub-second finality, sub-cent fees, deterministic BFT (1 confirmation = final), and Circle's hackathon alignment.

**Why EIP-3009**: USDC's native `transferWithAuthorization` enables gasless client signing — the facilitator pays gas onchain.

**Why hash-chained proofs**: Each SettlementProof points to the previous one via `prevHash`. Modifying history breaks the chain and is detectable.

---

## Documentation map

| Doc | Purpose |
|---|---|
| [`docs/PHASE8.md`](./PHASE8.md) | Phase 8 overview, schema, decisions |
| [`docs/X402_IMPLEMENTATION.md`](./X402_IMPLEMENTATION.md) | x402 protocol deep dive + NanoProof implementation |
| [`docs/PAYMENT_FLOW.md`](./PAYMENT_FLOW.md) | End-to-end payment lifecycle with failure modes |
| [`docs/ARC_SETTLEMENT.md`](./ARC_SETTLEMENT.md) | Arc testnet + ArcScan verification details |
| [`docs/API_REFERENCE.md`](./API_REFERENCE.md) | Complete REST API reference for Phase 8 |
| [`docs/PHASE8_AUDIT.md`](./PHASE8_AUDIT.md) | Production audit (10 dimensions, 78/100 → 88/100 post-deploy) |
| [`docs/READY_FOR_PHASE9.md`](./READY_FOR_PHASE9.md) | Phase 9 plan: live onchain settlement + agent SDK |

---

## Support

If you hit any issue during the demo:
- API health: https://nanoproof-api-production.up.railway.app/v1/healthz
- API Swagger: https://nanoproof-api-production.up.railway.app/api
- GitHub: https://github.com/networkbike/nanoproof-protocol
- Docs: https://github.com/networkbike/nanoproof-protocol/tree/main/docs

**Demo data is pre-seeded**. You should see ~190 settlements and ~$0.76 USDC distributed across 4 demo creators and 5 unique supporters on first load.

---

**Estimated judge experience**: 60 seconds for the recommended path, 5 minutes for the full deep dive.

**Thank you for evaluating NanoProof.** 🛰️