# Wallet Verification

> A **Wallet** is a chain address owned by a Creator where citation payouts settle in USDC. Before a Wallet can receive payouts, the Creator must prove ownership by signing an **EIP-191 personal_sign challenge**.

This document defines the challenge format, the signature verification path, the supported networks, and the security defenses.

---

## Table of contents

- [Why verify?](#why-verify)
- [Supported networks](#supported-networks)
- [The challenge flow](#the-challenge-flow)
- [Canonical message format](#canonical-message-format)
- [Signature verification](#signature-verification)
- [Multi-wallet + primary wallet](#multi-wallet--primary-wallet)
- [Replay protection](#replay-protection)
- [REST surface](#rest-surface)
- [Security considerations](#security-considerations)
- [Errors](#errors)

---

## Why verify?

Without wallet verification, a Creator could attach any address — including one they don't own — and divert citation payouts to it. Verification forces the Creator to prove they hold the private key for the address they're claiming.

---

## Supported networks

The `WalletNetwork` enum is defined in [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma):

```prisma
enum WalletNetwork {
  ARC_TESTNET
  ARC_MAINNET
  BASE
  BASE_SEPOLIA
  ETHEREUM
  ETHEREUM_SEPOLIA
  POLYGON
  POLYGON_AMOY
}
```

- **`ARC_TESTNET`** and **`ARC_MAINNET`** are the primary targets per [ADR 0001](./adr/0001-chain-portability.md).
- Other networks are supported for the creator's own convenience but settlement only happens on Arc in Phase 2.

Address validation per network:
- All EVM chains use the same 0x-prefixed 20-byte address with EIP-55 checksum.
- The server **lowercases** the address before storing it; the `(address, network)` pair is unique.
- Returns the checksummed form to clients.

---

## The challenge flow

```
1. POST /v1/wallets/:id/challenge
      → server creates VerificationChallenge { kind: "wallet", subjectId: walletId, token: <random>, expiresAt: now+15min }
      → server composes a canonical message
      → server returns { message, nonce }  (and stores message + nonce in DB for replay defense)

2. Creator signs `message` with the wallet's private key (EIP-191 personal_sign)

3. POST /v1/wallets/:id/verify { signature }
      → server loads the active challenge
      → server recovers the signer address from the signature
      → server compares recovered.toLowerCase() to wallet.address.toLowerCase()
      → on match: mark challenge consumed, wallet.verified, emit wallet.verified
```

State machine:

```
   UNVERIFIED ──► PENDING (challenge issued) ──► VERIFIED
        │                  │                       │
        └─► REVOKED        └─► REVOKED              └─► REVOKED (creator disconnect)
```

---

## Canonical message format

The signed message MUST follow this exact format:

```
NanoProof Wallet Verification

Wallet ID:   wl_01HXY...
Address:     0x...
Network:     ARC_TESTNET
Nonce:       ak_8f3b2e1d9c...
Issued at:   2026-06-30T22:00:00Z
Expires at:  2026-06-30T22:15:00Z

Sign this message to prove ownership of the address above.
This signature does not authorize any transaction.
```

Notes:
- The `Nonce` is the verification token (32 random bytes, base64url).
- `Issued at` and `Expires at` are RFC 3339 UTC.
- The "This signature does not authorize any transaction" line is a security UX cue — wallets show this to the user.

The server validates that the signature was produced over the **exact bytes** of the message it returned. Any deviation (extra whitespace, different casing, etc.) is rejected.

---

## Signature verification

We use [`viem`](https://viem.sh/) for EIP-191 recovery:

```typescript
import { verifyMessage } from "viem";

export async function verifyWalletSignature(params: {
  message: string;
  signature: `0x${string}`;
  expectedAddress: string;
}): Promise<{ ok: boolean; recovered?: string }> {
  const ok = await verifyMessage({
    address: params.expectedAddress as `0x${string}`,
    message: params.message,
    signature: params.signature,
  });
  if (!ok) return { ok: false };
  // Belt-and-suspenders: re-recover and compare
  // (viem's verifyMessage already does this; included for clarity)
  return { ok: true };
}
```

We additionally enforce:
- Signature is exactly 65 bytes (130 hex chars + `0x`).
- `v` ∈ {27, 28} (legacy) or EIP-2098 high-bit (compact).
- Signature must be recoverable — malformed inputs return `NP_INVALID_SIGNATURE`.

---

## Multi-wallet + primary wallet

A Creator can attach multiple Wallets:
- One is marked `isPrimary = true`. This is the default destination for citation payouts.
- Non-primary Wallets can be used as co-author splits (Phase 5).
- At most **one** primary per Creator per network.

Switching the primary wallet is a PATCH operation; no re-verification is required unless the wallet is `UNVERIFIED`.

---

## Replay protection

The signature is bound to:

1. **The challenge token (nonce).** A signature is valid only for the active challenge. Re-using a signature across challenges returns `NP_CHALLENGE_CONSUMED`.
2. **The wallet ID.** A signature for wallet `wl_A` is not valid for wallet `wl_B`, even if both addresses are owned by the same Creator.
3. **The exact message bytes.** Any tampering invalidates the signature.
4. **A 15-minute TTL.** Challenges expire; expired challenges cannot be verified.
5. **One-time consumption.** A consumed challenge cannot be re-verified. To re-verify, the Creator must request a fresh challenge.

We additionally log every verify attempt (success or failure) to `VerificationChallenge` with the IP and user-agent, for abuse investigation.

---

## REST surface

### POST /v1/wallets

Attach a wallet to the authenticated Creator.

```json
{
  "address": "0xAbCdEf0123456789...",
  "network": "ARC_TESTNET",
  "label": "Primary",
  "isPrimary": true
}
```

The wallet is created in `UNVERIFIED` state. The server returns:

```json
{
  "id": "wl_01HXY...",
  "address": "0xabcd...ef0123",        // checksummed form
  "network": "ARC_TESTNET",
  "verificationStatus": "UNVERIFIED",
  ...
}
```

### POST /v1/wallets/:id/challenge

Issue an EIP-191 challenge.

```json
// request body is empty
```

Response:

```json
{
  "challengeId": "vc_01HXY...",
  "message": "NanoProof Wallet Verification\n\nWallet ID: ...",
  "nonce": "ak_8f3b2e1d9c...",
  "expiresAt": "2026-06-30T22:15:00Z"
}
```

### POST /v1/wallets/:id/verify

Submit the signature.

```json
{
  "challengeId": "vc_01HXY...",
  "signature": "0x..."
}
```

Response 200:

```json
{
  "id": "wl_01HXY...",
  "verificationStatus": "VERIFIED",
  "verifiedAt": "2026-06-30T22:01:12Z",
  ...
}
```

### Other endpoints

`GET /v1/wallets`, `PATCH /v1/wallets/:id` (label + isPrimary only).

---

## Security considerations

1. **No transaction signing.** The message explicitly says it does not authorize a transaction. Wallets must surface this.
2. **Bound to wallet ID.** A signature can't be replayed against a different wallet.
3. **Strict byte equality.** The server stores the canonical message and verifies the signature over those exact bytes.
4. **Rate limit.** Max 5 challenge requests per wallet per hour. Max 20 verify attempts per IP per hour.
5. **No private keys ever touch our server.** Verification is signature-based — the server only sees the signed message and the signature.
6. **Address canonicalization.** Lowercased before storage and comparison to avoid checksum-mismatch edge cases.
7. **Audit log.** Every verify attempt (success or failure) is recorded with IP + UA + outcome.
8. **No silent migration to mainnet.** A `ARC_TESTNET` wallet cannot be "upgraded" to `ARC_MAINNET` — the Creator must add a separate wallet.

---

## Errors

| Code | HTTP | When |
|------|------|------|
| `NP_WALLET_NOT_FOUND` | 404 | `:id` does not exist |
| `NP_WALLET_ALREADY_VERIFIED` | 409 | already VERIFIED |
| `NP_WALLET_ALREADY_ADDED` | 409 | address + network already attached to this creator |
| `NP_INVALID_ADDRESS` | 422 | bad checksum or wrong length |
| `NP_CHALLENGE_NOT_FOUND` | 404 | no active challenge for this wallet |
| `NP_CHALLENGE_EXPIRED` | 410 | > 15 minutes since issued |
| `NP_CHALLENGE_CONSUMED` | 409 | already used |
| `NP_INVALID_SIGNATURE` | 422 | signature does not recover the wallet address |
| `NP_RATE_LIMITED` | 429 | too many challenges / verify attempts |

---

## Implementation outline

```typescript
// apps/api/src/wallets/verification/signature.service.ts

import { verifyMessage } from "viem";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { Errors } from "@nanoproof/shared/errors";

@Injectable()
export class WalletSignatureService {
  constructor(private readonly prisma: PrismaService) {}

  async verify(walletId: string, challengeId: string, signature: `0x${string}`) {
    const challenge = await this.prisma.verificationChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) throw Errors.NP_CHALLENGE_NOT_FOUND;
    if (challenge.consumedAt) throw Errors.NP_CHALLENGE_CONSUMED;
    if (challenge.expiresAt < new Date()) throw Errors.NP_CHALLENGE_EXPIRED;

    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    const ok = await verifyMessage({
      address: wallet.address as `0x${string}`,
      message: challenge.meta!.message as string,
      signature,
    });
    if (!ok) throw Errors.NP_INVALID_SIGNATURE;

    await this.prisma.$transaction([
      this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { verificationStatus: "VERIFIED", verifiedAt: new Date() },
      }),
    ]);

    return wallet;
  }
}
```

(Implementation contract only — actual code lands in the implementing issues.)

---

## See also

- [`phase-2-creator-registry.md`](./phase-2-creator-registry.md)
- [`protocol-spec.md`](./protocol-spec.md#wallet-verification)
- [`apps/api/openapi/creator-registry.yaml`](../apps/api/openapi/creator-registry.yaml)