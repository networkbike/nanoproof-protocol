# Payment Flow — NanoProof Protocol

> The complete end-to-end journey of a single x402 payment through NanoProof,
> from the first 402 challenge to the final ArcScan-verified settlement proof.

## Actors

| Role | Identity in NanoProof |
|---|---|
| **Buyer** | AI agent or human wallet with USDC on Arc testnet |
| **Seller** | Creator whose wallet receives the USDC |
| **Facilitator** | NanoProof server (the relay that submits the onchain tx) |
| **Verifier** | ArcScan (Blockscout v2 API) — the canonical source of truth |

## Happy-path flow

### Step 1 — Request without payment

```
GET /v1/research/cite?...
Authorization: Bearer (missing or invalid)
```

The buyer wants to access a premium resource but hasn't paid. The server
returns a 402 challenge.

### Step 2 — Server emits 402 + challenge

```
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: eyJ4NDAyVmVyc2lvbiI6MSwiYWNjZXB0cyI6W3...
Content-Type: application/json

{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "eip155:5042002",
    "maxAmountRequired": "1000",
    "resource": "/v1/research/cite",
    "payTo": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "maxTimeoutSeconds": 60,
    "asset": "0x3600000000000000000000000000000000000000",
    "extra": {
      "name": "USDC",
      "version": "2",
      "validAfter": 0,
      "validBefore": 1751539200,
      "nonce": "0xa1b2c3d4..."
    }
  }],
  "paymentRequestId": "preq_abc123"
}
```

A `PaymentRequest` row is created with `status = QUOTED` and a 32-byte
EIP-3009 nonce is generated (uniqueness = proof-of-payment).

### Step 3 — Client signs the payment

The buyer's wallet or agent signs an EIP-712 typed-data message:

```
DomainSeparator = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
HashStruct       = keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
```

The signature yields `v`, `r`, `s` ECDSA components. The client base64-encodes
the full payload and retries the request:

```
GET /v1/research/cite?...
PAYMENT-SIGNATURE: eyJzY2hlbWUiOiJleGFjdCIs...  (base64 of signed payload)
```

### Step 4 — Server verifies signature + authorizes

```ts
// apps/api/src/x402/x402.service.ts:authorizePayment()
const req = await prisma.paymentRequest.findUnique({ where: { id: requestId } });
// Verify:
//   - sig recovers to `from` (buyer's address)
//   - nonce matches PaymentRequest.nonce
//   - value matches PaymentRequest.amountUsdc
//   - validAfter <= now <= validBefore
//   - nonce not already consumed onchain
req.status = "AUTHORIZED";
req.authorizedAt = new Date();
await prisma.supporter.upsert({ where: { address: payerAddress }, ... });
```

### Step 5 — Facilitator submits transferWithAuthorization on Arc

The facilitator (NanoProof server) calls USDC's
`transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)`.
This atomically:
1. Transfers `value` USDC from `from` to `to`
2. Invalidates `nonce` (replay protection)
3. Pays gas in USDC (Arc's native gas token)

Arc's deterministic BFT finality means **1 confirmation = final**.

### Step 6 — Server creates Payment + SettlementProof rows

```ts
// Atomic transactional write
await prisma.$transaction(async (tx) => {
  const payment = await tx.payment.create({
    data: { creatorId, amountUsdc, status: "SETTLED", txHash, arcScanUrl, ... },
  });
  const proof = await tx.settlementProof.create({
    data: {
      paymentId: payment.id,
      paymentHash,  // sha256 of canonical settlement body
      txHash,        // from the receipt
      blockNumber,
      prevHash,      // previous SettlementProof.hash for this creator
      hash,          // sha256(prevHash + canonical body)
      verificationStatus: "PENDING",
      ...
    },
  });
  await tx.paymentRequest.update({
    where: { id: req.id },
    data: { status: "SETTLED", settledAt, paymentId: payment.id },
  });
});
```

### Step 7 — Server responds 200 + PAYMENT-RESPONSE

```
HTTP/1.1 200 OK
PAYMENT-RESPONSE: eyJzdWNjZXNzIjp0cnVlLCJ0cmFuc2FjdGlvbkhhc2giOiIweC4uLiJ9
Content-Type: application/json

{ "data": "...premium resource content..." }
```

### Step 8 — Server verifies via ArcScan

Asynchronously (and on every `POST /payments/verify` call):

```ts
const status = await arcScanVerifier.verify(txHash);
// GET https://testnet.arcscan.app/api/v2/transactions/{txHash}
// Returns 200 with Transaction object if mined, 404 if not yet indexed

if (status.success === true && status.found) {
  proof.verificationStatus = "VERIFIED";
  proof.confirmedAt = new Date();
}
```

A `VerificationEvent` row is appended to the proof's timeline.

### Step 9 — Dashboard updates

The creator's dashboard reflects the new settlement in real time:
- Revenue counter bumps
- Settlement count bumps
- Timeline shows the new settlement with the ArcScan link
- Verification badge shows "Verified on ArcScan"

## Failure modes

### Invalid signature (Step 4)

- Return 402 with `error: "Invalid signature"` (or 400 with details)
- Don't update PaymentRequest status (still QUOTED, will expire in 60s)

### Onchain revert (Step 5)

- Facilitator catches revert, returns error
- PaymentRequest status = FAILED
- VerificationEvent records the failure
- Client can retry with a fresh challenge (new nonce)

### ArcScan 404 (Step 8)

- ArcScan hasn't indexed the tx yet (typical < 1s after finality)
- VerificationEvent records `status: "PENDING"`, `error: "tx not yet indexed"`
- Next re-verify (auto or manual) will likely succeed

### Challenge expiry (Step 3 → 4)

- If client takes > 60s to sign and retry, the nonce window expires
- PaymentRequest.status = EXPIRED
- Client must call `POST /payments/create` again for a fresh challenge

### Double-spend (Step 5)

- USDC's `transferWithAuthorization` invalidates the nonce after first use
- Second attempt reverts with `FUSDC_NONCE_ALREADY_USED`
- Facilitator records FAILED, client gets a fresh challenge

## Why this is "production-quality"

1. **Standard protocol** — x402 is open, well-documented, with TypeScript + Python SDKs
2. **Tamper-evident** — hash-chained SettlementProof per creator
3. **Publicly verifiable** — anyone with a txHash can verify on ArcScan
4. **Stateless client** — buyer only needs USDC + a wallet (no accounts)
5. **Cheap** — sub-cent per settlement on Arc
6. **Fast** — sub-second finality
7. **Replay-safe** — EIP-3009 nonce + USDC's onchain nonce invalidation
8. **Observable** — every step emits a VerificationEvent
9. **Open agent-friendly** — no API keys required for x402 endpoints

## Where to read more

- x402 spec deep dive: `docs/X402_IMPLEMENTATION.md`
- Arc settlement: `docs/ARC_SETTLEMENT.md`
- API reference: `docs/API_REFERENCE.md`
- Phase 8 overview: `docs/PHASE8.md`