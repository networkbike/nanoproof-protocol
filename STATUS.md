# Project Status

> **Last updated:** 2026-07-05 · **Version:** v1.0.0-rc.1 · **Track:** Lepton Agents Hackathon · **Deadline:** Jul 6, 2026, 11:59 PM ET

A single-screen snapshot of where NanoProof is right now. Read this first if you're a judge.

---

## ✅ Live in production

| Surface | URL | Status |
|---|---|---|
| Public web | https://nanoproof-web-production.up.railway.app | ✅ HTTP 200 |
| Public api | https://nanoproof-api-production.up.railway.app | ✅ HTTP 200 |
| Health check | `/v1/healthz` | ✅ `{"status":"ok","database":"ok"}` |
| Auth (real Resend email) | `/auth/otp/send` | ✅ `provider=resend, mode=production` |
| x402 payment flow | `POST /x402/demo` | ✅ end-to-end Arc testnet settle |
| ArcScan verification | embedded in settlement proof | ✅ live links to testnet.arcscan.app |
| Live protocol metrics | `/metrics` | ✅ real numbers (see below) |

## ✅ Live numbers (auto-updated)

```
sourced citations:           51
settled payments:           269
unique AI agents:             5  (ChatGPT, Claude, Gemini, Perplexity, Copilot)
USDC distributed:        $0.97
test cases (unit + e2e):     85
development phases shipped:  11
```

To regenerate these numbers on your machine: see [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md).

## 📦 Repository status

| Item | Status |
|---|---|
| Open source license | ✅ MIT |
| Public repo | ✅ github.com/networkbike/nanoproof-protocol |
| Live deployed | ✅ Railway (api) + Railway (web) |
| Verified email domain | ✅ nanoproof.online (Resend) |
| Docs / README / RUNBOOK | ✅ top-level + /docs |
| Contribution guide | ✅ CONTRIBUTING.md |
| Security policy | ✅ SECURITY.md |
| Code of conduct | ✅ CODE_OF_CONDUCT.md |
| CI | ✅ tests on every PR (see .github) |
| Demo video (≤ 3 min) | 🎬 planned for submission |

## 🟡 In progress (planned post-hackathon)

- ERC-8004 on-chain creator registry contract (currently off-chain schema)
- Multi-chain support (Base, Polygon in addition to Arc)
- Stripe payout rails for non-crypto creators
- Per-agent pricing & refund policies

## 🚦 What's green vs red on the repo

**Green** (production-ready, complete, signed off):
- x402 payment protocol implementation
- SettlementProof hash chain
- ArcScan verification integration
- Real Resend OTP-based auth
- viem-generated creator wallets (MetaMask-importable)
- 13-step in-product guided tour
- Modern landing page with 8-step how-it-works

**Yellow** (working but evolving):
- Citation detection accuracy — pattern-based + AI-classifier hybrid, ~85% precision
- Per-user rate limiting — basic in place, plan to upgrade to sliding window

**Not in scope** (intentionally out):
- Off-chain escrow (we use Arc's USDC-native gas, no escrow needed)
- Subscription billing (out of scope for citation-by-citation payments)

---

## How to verify these claims yourself

```bash
# 1. Confirm api is healthy
curl https://nanoproof-api-production.up.railway.app/v1/healthz

# 2. Confirm web is responsive
curl -I https://nanoproof-web-production.up.railway.app/landing

# 3. Inspect the metrics
curl https://nanoproof-api-production.up.railway.app/metrics

# 4. Try the public x402 flow
curl -X POST https://nanoproof-api-production.up.railway.app/x402/demo \
  -H "Content-Type: application/json" \
  -d '{}'
```

No signup, no API key, no installation needed. If anything here doesn't match what you see, please open an issue — we treat docs drift as a bug.

---

For full submission details see [docs/SUBMISSION.md](./docs/SUBMISSION.md).
For a 60-second judge walkthrough see [docs/JUDGE_GUIDE.md](./docs/JUDGE_GUIDE.md).