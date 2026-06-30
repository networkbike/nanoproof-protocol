# NanoProof Protocol Specification

> **Status:** Draft (Phase 1). Implementation begins in Phase 3.
> **Version:** 0.1.0-draft
> **Editors:** NanoProof Protocol Working Group

This document is the canonical specification of the NanoProof wire protocol. It is the contract that every implementation — official or third-party — must conform to.

---

## 1. Goals

1. Define a deterministic, auditable flow from **citation detection** to **onchain payout**.
2. Allow any AI agent, in any framework, to compensate creators with USDC nanopayments in <2 seconds end-to-end.
3. Keep creators non-custodial — funds flow directly from agent wallet to creator wallet.
4. Provide an open standard that competing gateways, indexers, and dashboards can implement against.

---

## 2. Actors

| Actor | Role |
|-------|------|
| **Creator** | Owns one or more Sources; receives payouts to a self-custodial Arc wallet. |
| **Agent Developer** | Operates an AI agent that consumes Sources; funds a hot wallet for payouts. |
| **Citation Engine** | Detects citations and resolves them to Sources. |
| **Payment Engine** | Quotes, batches, signs, settles payouts. |
| **Registry** | Canonical store of Creators, Sources, and policy metadata. |
| **Gateway** | Batches micro-payouts (Circle Gateway). |
| **Arc L1** | Settlement chain; the source of truth for receipts. |
| **Indexer** | Mirrors onchain receipts + offchain citation events for analytics. |

---

## 3. Data model

### 3.1 Creator

```typescript
type Creator = {
  id: string;                       // cr_<ulid>
  displayName: string;
  payoutWallet: string;             // Arc address (0x...)
  splits?: Array<{                  // optional co-author splits
    wallet: string;
    basisPoints: number;            // 0-10000
  }>;
  pricing: {
    basePriceUsdc: string;          // bigint string, 6 decimals (e.g. "1000" = $0.001)
    minPayoutUsdc: string;
    periodCapUsdc?: string;
  };
  createdAt: string;
  updatedAt: string;
};
```

### 3.2 Source

```typescript
type Source = {
  id: string;                       // src_<ulid>
  creatorId: string;
  url: string;
  fingerprint: string;              // sha256 hex
  license: "all-rights-reserved" | "cc-by" | "cc-by-sa" | "cc0" | "open-source" | "other";
  embedding?: number[];             // cached vector
  title?: string;
  createdAt: string;
};
```

### 3.3 CitationEvent

```typescript
type CitationEvent = {
  id: string;                       // cit_<ulid>
  responseId: string;
  sourceId: string | null;          // null if unresolved
  agentId: string;
  confidence: number;               // 0-1
  snippet: string;
  context: { before: string; after: string };
  candidates: Array<{
    sourceId: string;
    score: number;
    strategy: "regex" | "embedding" | "agent-reported" | "hybrid";
  }>;
  detectedAt: string;
  policyVersion: string;
};
```

### 3.4 PaymentIntent

```typescript
type PaymentIntent = {
  id: string;                       // pi_<ulid>
  creatorId: string;
  agentId: string;
  citations: string[];              // CitationEvent IDs
  totalUsdc: string;                // bigint string, 6 decimals
  status: "pending" | "signed" | "settled" | "failed";
  txHash?: string;                  // Arc tx hash once settled
  arcScanUrl?: string;
  settledAt?: string;
  failureReason?: string;
};
```

---

## 4. Flows

### 4.1 Source registration

```
Creator → POST /v1/sources { url, fingerprint, license }
Registry → validate fingerprint, persist Source
Registry → emit SourceCreated(sourceId, creatorId)
```

### 4.2 Citation + payment

```
Agent → POST /v1/citations { responseId, citations: [...] }
Registry → ingest CitationEvents
Agent → POST /v1/payments/intents { creatorId, citationIds: [...] }
PaymentEngine → quote total
Agent → POST /v1/payments/intents/:id/execute
PaymentEngine → sign x402 envelope
PaymentEngine → batch via Gateway
PaymentEngine → settle on Arc → txHash
Registry → persist PaymentIntent(status: settled, txHash)
Registry → emit PaymentSettled
```

### 4.3 Webhook finality

```
Arc → POST /v1/webhooks/arc { txHash, status }
Registry → update PaymentIntent status
Indexer → mirror to public analytics
```

---

## 5. Economic rules

- **Currency:** USDC only. 6 decimals. No wrapped assets.
- **Minimum payout:** $0.0001 USDC (100 atomic units).
- **Gateway batching:** at most 1000 citations per batch.
- **Settlement finality:** Arc L1 (<500ms typical).
- **Idempotency:** PaymentIntent IDs are UUIDs and uniquely identify the intent across retries.

---

## 6. Error catalog

| Code | HTTP | Meaning |
|------|------|---------|
| `NP_INSUFFICIENT_BALANCE` | 402 | Agent wallet below required |
| `NP_SOURCE_NOT_FOUND` | 404 | Cited source is unregistered |
| `NP_CITATION_THRESHOLD` | 422 | Confidence below resolver τ |
| `NP_GATEWAY_TIMEOUT` | 504 | Circle Gateway SLA breach |
| `NP_ARC_RPC_ERROR` | 502 | Arc RPC failure |
| `NP_DUPLICATE_INTENT` | 409 | Idempotent retry detected |
| `NP_RATE_LIMITED` | 429 | Agent quota exceeded |
| `NP_AUTH_FAILED` | 401 | Invalid API key / signature |

---

## 7. Conformance

An implementation is **NanoProof-conformant** if it:

1. Speaks the REST API defined in section 4.
2. Persists the data model in section 3 (or a strict superset).
3. Settles in USDC on a chain that meets the finality + cost bar in section 5.
4. Emits errors from the catalog in section 6 with the same semantics.
5. Returns ArcScan-verifiable txHashes for every settled PaymentIntent.

---

## 8. Versioning

- **Major:** breaking change to any field in section 3 or any endpoint in section 4.
- **Minor:** new optional field, new endpoint, new error code.
- **Patch:** typo / clarification only — never a behavior change.

---

<div align="center">
<sub>Spec feedback? Open an issue with the <code>spec</code> label or propose a change via PR.</sub>
</div>