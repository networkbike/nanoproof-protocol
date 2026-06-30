# Treasury Management

> The protocol treasury holds accrued fees, gas reserves, and operational capital. This document defines the treasury model, the multisig structure, and the operational workflows.

---

## Table of contents

- [Purpose](#purpose)
- [Treasury vault](#treasury-vault)
- [Multisig structure](#multisig-structure)
- [Account types](#account-types)
- [What flows into the treasury](#what-flows-into-the-treasury)
- [What flows out](#what-flows-out)
- [Hot wallet operations](#hot-wallet-operations)
- [Cold storage](#cold-storage)
- [Key management evolution](#key-management-evolution)
- [Operational workflows](#operational-workflows)
- [Treasury reporting](#treasury-reporting)
- [Security considerations](#security-considerations)
- [See also](#see-also)

---

## Purpose

The treasury is the protocol's operational financial layer. It:

1. **Holds accrued fees** from every settled PaymentIntent.
2. **Funds the agent hot wallet** that signs payout transactions.
3. **Funds gas reserves** for batch settlements.
4. **Funds operational expenses** — auditors, hosting, salaries (Phase 9+).
5. **Funds clawbacks** when disputes resolve against a Creator.

The treasury is **never** used to hold creator funds — those settle directly to vaults.

---

## Treasury vault

The treasury vault is a **Gnosis Safe 3-of-5 multisig** on Arc.

```
Address: <treasury_vault_address>     // configured via env
Network: ARC_TESTNET | ARC_MAINNET
Contract: Gnosis Safe v1.3.0
Threshold: 3 of 5
```

### Signers

| # | Role | Description |
|---|------|-------------|
| 1 | Canteen ops lead | Operational continuity |
| 2 | Canteen co-founder | Founder oversight |
| 3 | Canteen security lead | Security review |
| 4 | Independent security advisor | External accountability |
| 5 | Independent finance advisor | External accountability |

Signer identities are published at `/docs/audits/multisig.md` (with their consent).

### Rotation

- Signer rotation: quarterly, with a 7-day overlap period.
- New signer added via 3-of-5 multisig transaction.
- Old signer removed via 3-of-5 multisig transaction.
- Rotation events logged in the audit trail.

---

## Account types

NanoProof uses three onchain account types:

| Type | Owner | Purpose | Balance cap | Auth |
|------|-------|---------|-------------|------|
| **Treasury vault** | Multisig | Holds fees + reserves | Unlimited | 3-of-5 |
| **Agent hot wallet** | Protocol (env var) | Signs payout transactions | $10k USDC default | KMS in Phase 9 |
| **Cold storage** | Multisig | Long-term protocol reserves | Unlimited | 3-of-5 |

### Agent hot wallet

A dedicated EOA that signs every payout. For Lepton, the private key lives in Railway env vars. For Phase 9+, it migrates to AWS KMS / Fireblocks / Turnkey.

```
PE_AGENT_HOT_WALLET_ADDRESS      = 0x...
PE_AGENT_HOT_WALLET_PRIVATE_KEY  = <KMS ref or env var>
```

Drain protection: hard daily cap, monitored by the Reconciler.

### Cold storage

Long-term reserves, multisig-controlled, never signs payout transactions. Used for:

- Operational expenses (auditors, hosting).
- Emergency clawback funds.
- Future protocol development grants.

---

## What flows into the treasury

| Source | Frequency | Amount |
|--------|-----------|--------|
| **Protocol fees** | Per PaymentIntent | `totalAtomic × fee_bps / 10000` |
| **Volume discounts** (rebates) | Monthly | (negative) per agent discount program |
| **Refund reversals** | Per dispute resolution | (positive) when clawback reverses a prior payment |
| **Donations / grants** | Ad-hoc | Variable |

Every inflow is logged as a `TreasuryTransaction` row.

---

## What flows out

| Use case | Frequency | Approval |
|----------|-----------|----------|
| **Top-up agent hot wallet** | Per batch window | Automated (no multisig) |
| **Refund a Creator** | Per dispute resolution | 2-of-5 |
| **Operational expense** | Monthly | 3-of-5 |
| **Smart contract upgrade** | Per release | 5-of-5 (Phase 7+) |
| **Treasury allocation to grants** | Quarterly | 5-of-5 |

### Automated top-up

The hot wallet is automatically refilled when balance drops below a threshold:

```typescript
if (hotWallet.balance < HOT_WALLET_REFILL_THRESHOLD) {
  const amount = HOT_WALLET_REFILL_AMOUNT - hotWallet.balance;
  await treasuryVault.executeTransaction(
    transfer(hotWallet.address, amount)
  );
}
```

The top-up is triggered by a BullMQ cron (every 5 min). It only requires the **treasury Safe's signature** — not the multisig — because it's an automated, audited operation.

### Manual outflow

Manual outflows (refunds, expenses, grants) require a multisig transaction. The workflow:

```
1. Operator submits a request via `/v1/treasury/withdrawals` (Phase 9+).
2. Request includes: amount, recipient, reason, supporting docs.
3. Other signers review via the Safe UI.
4. Threshold signatures collected.
5. Transaction executed; treasury log updated.
```

---

## Cold storage

Cold storage holds long-term reserves. The threshold for cold → hot transfer is **5-of-5** (all signers).

Cold storage is rarely touched. The hot wallet is the operating account.

### Cold storage cadence

| Activity | Frequency |
|----------|-----------|
| Cold → hot transfer | Monthly or as needed |
| Audit | Quarterly (verify balance matches records) |
| Signer review | Quarterly |

---

## Key management evolution

| Phase | Hot wallet | Cold wallet | Treasury |
|-------|-----------|-------------|----------|
| **Phase 5** (now) | Env var (Railway) | Multisig (3-of-5) | Multisig (3-of-5) |
| **Phase 7** | Env var + AWS KMS | Multisig | Multisig |
| **Phase 9** (Public Beta) | KMS or MPC | Multisig | Multisig |

### KMS integration (Phase 7)

For the hot wallet, we use **AWS KMS** with a `KMS_KEY_ID` reference. The private key never exists in plaintext outside KMS. The Payment Engine uses `KMS.Sign(message)` to produce signatures.

MPC alternatives considered:
- **Fireblocks** — premium, requires vendor relationship.
- **Turnkey** — newer, lower friction.
- **Self-hosted Lit Protocol** — open, operational burden.

We default to AWS KMS in Phase 7; revisit in Phase 9 based on operational fit.

---

## Operational workflows

### Hot wallet refill

```
1. BullMQ cron runs every 5 min.
2. Checks `hotWallet.balance` via Arc RPC.
3. If balance < $5,000 USDC:
     a. Compute refill amount ($10,000 - current).
     b. Build Safe transaction.
     c. Safe auto-executes (treasury is Safe owner with automation role).
4. Logs the refill to `TreasuryTransaction` table.
```

### Failed payout recovery

```
1. PaymentIntent.status = FAILED.
2. Surface to ops dashboard.
3. If cause = hot wallet drained:
     a. Pause all PaymentIntents.
     b. Trigger emergency refill from cold storage.
     c. Resume after refill confirmed.
4. If cause = revert (insufficient destination balance, etc.):
     a. Mark Payout FAILED with reason.
     b. Surface to Creator dashboard.
     c. Retry on next batching window (up to 3x).
```

### Dispute clawback

```
1. Dispute resolves against Creator (PAYOUT_REVERSE).
2. Payment Engine initiates USDC.transferFrom(vault, treasury, amount) IF vault approved protocol as operator.
   - In practice, this requires Creator cooperation (sign a clawback tx).
3. If Creator refuses, the dispute is escalated to legal (Phase 9+ only).
4. All clawbacks logged + public.
```

---

## Treasury reporting

### Public dashboard

`/treasury` page renders:
- Current balances: treasury, hot wallet, cold storage.
- Total fees accrued (all-time).
- Total fees accrued (last 30d).
- Recent transactions (last 50, anonymized).
- Hot wallet refill events.

### Monthly report

Published at `/docs/treasury/<YYYY-MM>.md`:
- Opening + closing balances.
- Total fees accrued.
- Top outflows by category.
- Hot wallet refill count.
- Any incidents.

### Annual audit

A third-party auditor reviews:
- Balance integrity (onchain vs. local).
- Multisig activity (every signature reviewed).
- Treasury policy compliance.
- Clawback fairness.

---

## Security considerations

1. **Multisig for treasury.** No single point of compromise for >$1k USDC.
2. **Hot wallet caps.** Drain protection prevents catastrophic loss.
3. **KMS migration (Phase 9).** Removes the env-var risk entirely.
4. **Audit trail.** Every action is logged with operator + reasoning.
5. **Cold storage discipline.** Cold → hot transfers are infrequent and heavily signed.
6. **Public transparency.** Treasury state is publicly viewable.
7. **Bug bounty.** Treasury-relevant vulnerabilities are Critical severity (see [`../SECURITY.md`](../SECURITY.md)).
8. **Insurance (Phase 9+).** We commit to insuring the hot wallet against theft.

---

## Emergency procedures

### Hot wallet compromise

```
1. Pause all PaymentIntents (status: PAUSED).
2. Multisig transfers remaining hot wallet balance to cold storage.
3. Generate a new hot wallet via multisig (5-of-5 required).
4. Update `PE_AGENT_HOT_WALLET_ADDRESS` env (via Railway deploy).
5. Resume PaymentIntents.
6. Post-mortem within 48h.
```

See [`../runbooks/incident-response.md`](../docs/runbooks/incident-response.md) for the full play.

### Treasury multisig compromise

The 3-of-5 threshold + signer rotation policy make this extremely unlikely. Response:

```
1. Pause all protocol operations.
2. Public disclosure within 24h.
3. Coordinate with remaining signers to migrate to a new Safe (5-of-5).
4. Migrate all funds.
5. Post-mortem + governance review.
```

---

## API surface

```
GET    /v1/treasury                       # public dashboard
GET    /v1/treasury/balance               # current balances
GET    /v1/treasury/transactions          # recent tx history (paginated)
GET    /v1/treasury/fees                  # fee accrual over time
GET    /v1/treasury/hot-wallet            # hot wallet status
GET    /v1/treasury/refills               # refill history
POST   /v1/treasury/withdrawals           # request a withdrawal (operator)
POST   /v1/treasury/withdrawals/:id/sign  # co-sign a withdrawal (operator)
```

See [`../apps/api/openapi/payment-engine.yaml`](../apps/api/openapi/payment-engine.yaml) for the full schema.

---

## See also

- [`payment-engine.md`](./payment-engine.md)
- [`fee-structure.md`](./fee-structure.md)
- [`settlement-arc.md`](./settlement-arc.md)
- [`payment-audit.md`](./payment-audit.md)
- [`../SECURITY.md`](../SECURITY.md)
- [`../runbooks/secrets-rotation.md`](../docs/runbooks/secrets-rotation.md)