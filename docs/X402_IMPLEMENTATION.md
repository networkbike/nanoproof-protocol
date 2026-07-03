# x402 Implementation — NanoProof Protocol

> How NanoProof implements the [x402](https://www.x402.org/) open payment standard
> to monetize APIs, AI agents, content, and digital resources using nano-payments.

## What is x402?

x402 is Coinbase's open standard (released May 2025) that turns the long-dormant
HTTP 402 "Payment Required" status code into a real, programmable payment layer
for the agent economy. It enables:

- **M2M payments** — AI agents paying APIs without human intervention
- **Pay-per-use** — no subscriptions, no accounts
- **USDC-native** — uses EIP-3009 for gasless transfers
- **HTTP-native** — no custom protocols, no SDKs required
- **Chain-agnostic** — works with any EIP-3009 token on any EVM chain

## NanoProof's x402 implementation

### The 402 response

When a client hits a NanoProof-protected resource without payment, the server
returns:

```http
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: eyJ4NDAyVmVyc2lvbiI6MSwiYWNjZXB0cyI6W3...
Content-Type: application/json

{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:5042002",
      "maxAmountRequired": "1000",
      "resource": "/v1/research/cite",
      "description": "NanoProof access: /v1/research/cite (creator alice)",
      "payTo": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "maxTimeoutSeconds": 60,
      "asset": "0x3600000000000000000000000000000000000000",
      "extra": {
        "name": "USDC",
        "version": "2",
        "validAfter": 0,
        "validBefore": 1751539200,
        "nonce": "0xa1b2c3..."
      }
    }
  ],
  "paymentRequestId": "preq_abc123"
}
```

### Header reference

| Header | Direction | Purpose |
|---|---|---|
| `PAYMENT-REQUIRED` | server → client | Base64-encoded JSON challenge |
| `PAYMENT-SIGNATURE` | client → server | Base64-encoded signed payment payload |
| `PAYMENT-RESPONSE` | server → client | Settlement confirmation (base64) |
| `WWW-Authenticate` | server → client | RFC 7235 hint for HTTP auth |

### Field meanings

| Field | Required | Description |
|---|---|---|
| `x402Version` | yes | Protocol version (we use 1) |
| `accepts[]` | yes | Array of acceptable payment options |
| `accepts[].scheme` | yes | `"exact"` (fixed amount) or `"upto"` (consumption-based) |
| `accepts[].network` | yes | CAIP-2 network identifier (e.g. `eip155:5042002`) |
| `accepts[].maxAmountRequired` | yes | Atomic units as string (USDC = 6 decimals) |
| `accepts[].resource` | yes | URI of the resource being paid for |
| `accepts[].payTo` | yes | Recipient wallet (creator's settlement address) |
| `accepts[].maxTimeoutSeconds` | yes | How long the challenge is valid |
| `accepts[].asset` | yes | ERC-20 contract address of the payment token |
| `accepts[].description` | yes | Human-readable (shown in wallet prompts) |
| `accepts[].mimeType` | no | Expected response content type |
| `accepts[].outputSchema` | no | Bazaar discovery — describes the response shape |
| `accepts[].extra` | no | Asset-specific (EIP-712 domain, EIP-3009 window, nonce) |

## How NanoProof uses it

### Price catalog

```ts
// apps/api/src/x402/x402.constants.ts
export const PRICE_CATALOG: Record<string, string> = {
  "/v1/research/answer": "10000", // $0.01 — full research query
  "/v1/research/cite":   "1000",  // $0.001 — single citation lookup
  "/v1/premium/source":  "5000",  // $0.005 — premium source access
  "/v1/agent/tool":      "2500",  // $0.0025 — agent tool call
};
```

Prices are atomic USDC (6 decimals). $0.01 = `"10000"`, $0.001 = `"1000"`, $1.00 = `"1000000"`.

### Challenge lifecycle

```
┌─────────────────────┐
│   Client request    │
│   (no X-PAYMENT)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Server emits 402 + challenge      │
│   (POST /payments/create)           │
│                                     │
│   PaymentRequest row created        │
│   status = QUOTED                   │
│   nonce generated                   │
│   x402Challenge JSON built          │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Client signs PAYMENT-SIGNATURE    │
│   (EIP-712 typed-data signature)    │
│                                     │
│   v, r, s + from, to, value,        │
│   validAfter, validBefore, nonce    │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Client retries request with       │
│   PAYMENT-SIGNATURE header          │
│                                     │
│   (POST /payments/authorize)        │
│   PaymentRequest.status = AUTHORIZED│
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Server / facilitator submits      │
│   transferWithAuthorization onchain │
│                                     │
│   (POST /payments/settle)           │
│   PaymentRequest.status = SETTLED   │
│   Payment row created               │
│   SettlementProof row created       │
│   (hash-chained per creator)        │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Server verifies via ArcScan       │
│   (POST /payments/verify)           │
│                                     │
│   SettlementProof.verificationStatus│
│   = VERIFIED | FAILED | PENDING     │
│   VerificationEvent appended        │
└─────────────────────────────────────┘
```

## Code walkthrough

### 1. Create a challenge

```ts
// apps/api/src/x402/x402.service.ts:createPaymentRequest()
const accept: X402Accept = {
  scheme: "exact",
  network: "eip155:5042002",
  maxAmountRequired: "1000",  // $0.001 USDC
  resource: "/v1/research/cite",
  description: "NanoProof access: /v1/research/cite (creator alice)",
  payTo: creator.wallets[0].address,  // settlement destination
  maxTimeoutSeconds: 60,
  asset: "0x3600000000000000000000000000000000000000",  // USDC on Arc
  extra: {
    name: "USDC",
    version: "2",
    validAfter: 0,
    validBefore: nowSec + 60,
    nonce: generateEip3009Nonce(),
  },
};

const challenge: X402PaymentRequired = {
  x402Version: 1,
  accepts: [accept],
  error: "X-PAYMENT header required to access this resource.",
};

const request = await prisma.paymentRequest.create({
  data: { ...accept, x402Challenge: challenge, status: "QUOTED" },
});
```

### 2. Settle onchain (demo mode)

In production, this would:
1. Verify the EIP-712 signature against the challenge terms
2. Submit `transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)`
   to the USDC contract on Arc
3. Wait for the tx receipt

In demo mode, we synthesise an Arc-shaped txHash and create the Payment +
SettlementProof rows:

```ts
// apps/api/src/x402/x402.service.ts:settlePayment()
const txHash = syntheticTxHash(`${req.id}:${payerAddress}:${settledAt.toISOString()}`);
const blockNumber = syntheticBlockNumber(req.id);

// Canonical settlement body (for immutable hash)
const settlementBody = {
  paymentRequestId: req.id,
  creatorId: req.creatorId,
  resource: req.resource,
  amountUsdc: req.amountUsdc,
  payer: payerAddress,
  payee: req.payTo,
  nonce: req.nonce,
  txHash,
  blockNumber: blockNumber.toString(),
  settledAt: settledAt.toISOString(),
};
const paymentHash = sha256Hex(JSON.stringify(settlementBody));

// Hash chain
const prevProof = await prisma.settlementProof.findFirst({
  where: { payment: { creatorId: req.creatorId } },
  orderBy: { createdAt: "desc" },
});
const prevHash = prevProof?.hash ?? "0x" + "0".repeat(64);
const hash = sha256Hex(prevHash + JSON.stringify(settlementBody));

// Transactional write
const result = await prisma.$transaction(async (tx) => {
  const payment = await tx.payment.create({ ... });
  const proof = await tx.settlementProof.create({
    data: { paymentId: payment.id, paymentHash, txHash, prevHash, hash, ... },
  });
  await tx.paymentRequest.update({
    where: { id: req.id },
    data: { status: "SETTLED", settledAt, paymentId: payment.id },
  });
  await tx.supporter.upsert({
    where: { address: payerAddress },
    update: { totalPayments: { increment: 1 } },
    create: { ... },
  });
  // Note: totalPaid (String) is incremented via raw SQL since
  // Prisma's StringFieldUpdateOperationsInput doesn't support { increment }
  await tx.$executeRaw`
    UPDATE "supporters"
    SET "totalPaid" = (CAST("totalPaid" AS BIGINT) + CAST(${req.amountUsdc} AS BIGINT))::TEXT
    WHERE "address" = ${payerAddress}
  `;
  return { payment, proof };
});
```

### 3. Verify via ArcScan

```ts
// apps/api/src/x402/x402.service.ts:verifySettlement()
const status = await this.arcscan.verify(proof.txHash, {
  // For demo: synthesise a realistic verified response
  blockNumber: proof.blockNumber,
  from: proof.payerAddress,
  to: proof.payeeAddress,
  valueAtomic: proof.amountUsdc,
  settledAt: proof.blockTimestamp,
});

let final: "VERIFIED" | "PENDING" | "FAILED" = "PENDING";
if (status.success === true && status.found) final = "VERIFIED";
else if (status.success === false) final = "FAILED";
else if (!status.found && status.error?.includes("not yet indexed")) final = "PENDING";

// Persist event + update proof
await this.prisma.$transaction(async (tx) => {
  await tx.verificationEvent.create({ data: { proofId, status: final, ... } });
  await tx.settlementProof.update({
    where: { id: proofId },
    data: {
      verificationAttempts: { increment: 1 },
      lastCheckedAt: new Date(),
      verificationStatus: final,
      confirmedAt: final === "VERIFIED" ? new Date() : null,
    },
  });
});
```

## Demo mode

Demo mode (`NANOPROOF_DEMO_MODE=true`) makes the full flow runnable in one click
for the Lepton judges. It synthesises:
- Arc-shaped txHashes (sha256 of `nanoproof:tx:<seed>`)
- Deterministic block numbers in the 9.5M-10M range
- Verification responses (ArcScan Blockscout v2 API is bypassed)

Production deployments set `NANOPROOF_DEMO_MODE=false` and the x402 service
will:

1. Verify the client's EIP-712 signature against the nonce + terms
2. Submit the transferWithAuthorization via the configured facilitator
3. Pass the real txHash to ArcScan verification

## Where to read more

- Spec: <https://www.x402.org/>
- Coinbase docs: <https://docs.cdp.coinbase.com/x402/welcome>
- Phase 8 overview: `docs/PHASE8.md`
- Payment flow deep dive: `docs/PAYMENT_FLOW.md`
- Arc settlement: `docs/ARC_SETTLEMENT.md`