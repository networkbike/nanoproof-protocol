# Creator Vaults

> A Creator vault is the onchain destination for USDC payouts. NanoProof is **non-custodial**: from the moment of Arc settlement, USDC lives in the vault. The vault is owned by the Creator.

---

## Table of contents

- [Purpose](#purpose)
- [Vault model](#vault-model)
- [Vault types](#vault-types)
- [Vault creation](#vault-creation)
- [Ownership and control](#ownership-and-control)
- [Vault configuration](#vault-configuration)
- [Receiving payouts](#receiving-payouts)
- [Smart contract vaults](#smart-contract-vaults)
- [Multisig vaults](#multisig-vaults)
- [Vault migration](#vault-migration)
- [Security considerations](#security-considerations)
- [API surface](#api-surface)
- [See also](#see-also)

---

## Purpose

Every Citation payout needs a destination. The vault is that destination. Vaults are:

- **Self-custodial** — the Creator controls the private key(s) or smart contract.
- **Verifiable** — every payout has a public ArcScan receipt pointing at the vault.
- **Composable** — splits + org rules determine how the vault's allocation is split before deposit.
- **Portable** — vaults work outside NanoProof (Creators can use them for any USDC transfer).

The Payment Engine **never** holds creator funds beyond the batching window.

---

## Vault model

A `Vault` is a 1:1 mapping between a verified Creator wallet and an onchain address.

```typescript
type Vault = {
  id: string;                  // "vlt_<ulid>"
  creatorId: string;           // owning Creator
  address: string;             // 0x-prefixed 20-byte address
  network: WalletNetwork;      // ARC_TESTNET | ARC_MAINNET | ...
  mode: VaultMode;              // SIMPLE | SPLIT | PROGRAMMABLE
  isPrimary: boolean;          // default destination
  label?: string;              // "Main", "Co-author split", etc.

  // Programmable vault (if mode === PROGRAMMABLE)
  contractAddress?: string;
  contractType?: string;       // "GNOSIS_SAFE" | "CUSTOM" | ...

  // Verification (reuses Phase 2 wallet verification)
  verificationStatus: WalletVerificationStatus;
  verifiedAt?: Date;

  // Status
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
};

type VaultMode = "SIMPLE" | "SPLIT" | "PROGRAMMABLE";
```

### Vault modes

| Mode | Use case | Configuration |
|------|----------|---------------|
| **SIMPLE** | Solo Creator, single destination | Just an address |
| **SPLIT** | Co-authors, royalty splits | Address + `splits[]` with basisPoints |
| **PROGRAMMABLE** | Smart contract vault (Safe, custom) | Address + contract metadata + ABI fragment |

---

## Vault types

### Simple vault

```
Vault {
  mode: "SIMPLE",
  address: "0xCreatorMainWallet...",
  isPrimary: true,
  splits: []
}
```

100% of every payout lands here. No allocation logic beyond the default.

### Split-configured vault

```
Vault {
  mode: "SPLIT",
  address: "0xPrimaryCoauthor...",
  splits: [
    { walletId: "wl_main", basisPoints: 7000 },
    { walletId: "wl_coauthor1", basisPoints: 2000 },
    { walletId: "wl_coauthor2", basisPoints: 1000 }
  ]
}
```

The Payment Engine computes per-payout allocation:
- 70% → main author
- 20% → coauthor 1
- 10% → coauthor 2

Splits are **frozen at PaymentIntent creation** — changing splits mid-flight doesn't retroactively affect in-flight payouts.

### Programmable vault

```
Vault {
  mode: "PROGRAMMABLE",
  address: "0xSafeAddress...",
  contractAddress: "0xSafeAddress...",
  contractType: "GNOSIS_SAFE",
  contractVersion: "1.3.0"
}
```

For Smart Wallets (Gnosis Safe, ERC-4337 accounts, custom contracts). The Payment Engine treats the vault address as the destination; the smart contract handles internal routing.

---

## Vault creation

### Step 1 — Verify the wallet

A vault's address **must be** a verified wallet (per Phase 2's [`wallet-verification.md`](./wallet-verification.md)). Without verification, payouts cannot settle.

```typescript
// Phase 2 already produces:
const wallet = await walletVerification.verify(walletId, challengeId, signature);
// wallet.verificationStatus === 'VERIFIED'
```

### Step 2 — Register the vault

```http
POST /v1/vaults
{
  "walletId": "wl_01HXY...",
  "mode": "SPLIT",
  "isPrimary": true,
  "label": "Main vault",
  "splits": [
    { "walletId": "wl_main",     "basisPoints": 7000 },
    { "walletId": "wl_coauthor", "basisPoints": 3000 }
  ]
}
```

Response 201:
```json
{
  "id": "vlt_01HXY...",
  "creatorId": "cr_...",
  "address": "0x...",
  "mode": "SPLIT",
  "splits": [...],
  "verificationStatus": "VERIFIED",
  "isActive": true,
  "createdAt": "..."
}
```

### Step 3 — Activate

Vaults are active by default once verified. The Creator can pause a vault (`isActive = false`) without removing it.

---

## Ownership and control

A vault is **owned by a Creator** (`creatorId`). Only the Creator (or an Organization admin acting on their behalf) can:

- Update the vault's `label`, `isPrimary` flag.
- Modify the splits (when no in-flight PaymentIntent depends on them).
- Pause / resume the vault.
- Migrate the vault to a new address.

The onchain address (the `address` field) is **immutable**. To change addresses, the Creator creates a new vault and migrates.

---

## Vault configuration

### Per-Creator limits

- Max 1 primary vault per network.
- Max 10 vaults per Creator per network.
- Max 5 splits per vault.

### Split validation

- Sum of basisPoints must equal 10000.
- Each split's wallet must belong to the same Creator (or be a co-author with a verified wallet).
- A wallet can't appear in two splits of the same vault.

### Source-level overrides

A Source can override the Creator's default vault via `Source.pricing.payoutVaultId`. This allows per-Source payout routing without changing the Creator's global default.

---

## Receiving payouts

When the Payment Engine executes a `PaymentIntent`:

```
1. PaymentIntent.totalAtomic = $0.50 USDC (after fees)
2. Lookup vault by creatorId (primary or per-Source override)
3. If vault.mode === 'SIMPLE':
     → single USDC.transfer(vault.address, $0.50)
4. If vault.mode === 'SPLIT':
     → for each split: USDC.transfer(split.wallet, $0.50 * split.basisPoints / 10000)
     → Σ payouts == $0.50 (atomic)
5. If vault.mode === 'PROGRAMMABLE':
     → USDC.transfer(vault.address, $0.50)
     → smart contract handles internal routing
6. Each USDC.transfer emits a Transfer event on Arc
7. Payment Engine parses the events, writes Receipts
```

### Idempotency

Every payout carries an `idempotencyKey = sha256(paymentIntentId || vaultId || nonce)`. Re-submitting the same intent never double-pays.

### Failure handling

| Failure | Behavior |
|---------|----------|
| Vault paused (`isActive = false`) | Payout queued; surface to Creator dashboard; no auto-skip |
| Split wallet unverified | Payout held until verification completes |
| Smart contract revert | Mark Payout `FAILED`; capture revert reason; surface to Creator |
| Vault address blacklisted | (Future) automatic onchain blacklist check |

---

## Smart contract vaults

NanoProof supports any EVM-compatible smart contract as a vault, with optional ABI-driven integration for advanced routing.

### Supported contract types (v1.0)

| Type | Notes |
|------|-------|
| **EOA** | Plain wallet — default |
| **Gnosis Safe** | `contractType: "GNOSIS_SAFE"` — verified via Safe transaction service |
| **ERC-4337 Smart Account** | `contractType: "ERC4337"` — verified via EntryPoint deposit |
| **Custom** | `contractType: "CUSTOM"` — registered with ABI; Payment Engine calls `receive()` or fallback |

### ABI registration

Smart contract vaults register an ABI fragment so the Payment Engine can:
- Decode receipts.
- Verify the contract's `owner()` matches the Creator's verified wallet.
- Call optional hooks (e.g. `onCitationPayout(uint256 amount, bytes32 citationHash)`).

### Security checks

For every smart contract vault, the Payment Engine verifies:
- `owner()` returns the Creator's wallet (if applicable).
- The contract can receive USDC (via `USDC.transfer` simulation).
- The contract is not on a denylist of known-malicious contracts.

---

## Multisig vaults

Creators can require multiple signatures to move funds out of their vault. NanoProof **does not** enforce a particular multisig scheme; it only deposits.

Common patterns:
- **Gnosis Safe 2-of-3** — Creator + co-author + a recovery signer.
- **Gnosis Safe 3-of-5** — for high-value creators.
- **Custom multisig** — for sophisticated creators with bespoke security models.

The Payment Engine only verifies the Safe's `owners()` includes the Creator's wallet before depositing.

---

## Vault migration

When a Creator needs to move from one vault to another (e.g. wallet compromised, key rotation):

```
1. POST /v1/vaults/{id}/migrate
   {
     "newWalletId": "wl_new...",
     "scheduledAt": "<ISO date>"  // optional deferred migration
   }

2. The migration creates a NEW vault linked to the new wallet.
3. The OLD vault is marked for retirement.
4. After the next batching window, new payouts route to the new vault.
5. The OLD vault can be drained manually by the Creator.
```

Old vault's pending payouts during migration:
- If the payout was queued **before** migration → settles to OLD vault.
- If queued **after** migration → settles to NEW vault.

There is no auto-sweep from OLD → NEW; the Creator is responsible for draining.

---

## Security considerations

1. **Address verification.** Every vault's address must trace back to a Phase 2-verified wallet. We do not accept arbitrary addresses.
2. **Immutable vault address.** Once created, a vault's `address` cannot be changed. Migration creates a new vault.
3. **Append-only ledger.** Every vault modification (label, splits, isPrimary) is logged.
4. **Pause without deletion.** Creators can pause vaults without losing configuration.
5. **Splits frozen at intent creation.** Editing a vault's splits doesn't retroactively affect queued PaymentIntents.
6. **No custody.** NanoProof never holds the private key. Even the agent hot wallet signs payments; creators retain custody of their vaults.
7. **Programmable vault screening.** Every smart contract vault is screened against a denylist before activation.
8. **Multisig verification.** The Payment Engine verifies the multisig includes the Creator's wallet.

---

## API surface

```
POST   /v1/vaults                          # create
GET    /v1/vaults                          # list (auth'd creator)
GET    /v1/vaults/:id                      # read
PATCH  /v1/vaults/:id                      # update (label, splits, isPrimary)
POST   /v1/vaults/:id/pause                # pause
POST   /v1/vaults/:id/resume               # resume
POST   /v1/vaults/:id/migrate              # migrate to new wallet
GET    /v1/vaults/:id/receipts             # list payouts to this vault
GET    /v1/vaults/:id/balance              # current onchain USDC balance
```

All endpoints require authentication; non-owners get 403.

See [`../apps/api/openapi/payment-engine.yaml`](../apps/api/openapi/payment-engine.yaml) for the canonical spec.

---

## See also

- [`payment-engine.md`](./payment-engine.md)
- [`settlement-arc.md`](./settlement-arc.md)
- [`revenue-allocation.md`](./revenue-allocation.md)
- [`wallet-verification.md`](./wallet-verification.md)
- [`fee-structure.md`](./fee-structure.md)