-- =============================================================================
-- Phase 8 — x402 Payment Protocol + Arc Settlement Proof + ArcScan Verification
-- =============================================================================
--
-- Adds 5 tables + 2 enums for the x402 payment flow:
--   payment_requests      — x402 challenge lifecycle
--   settlement_proofs     — immutable, hash-chained per creator
--   verification_events   — append-only ArcScan check log
--   supporters            — payer wallet aggregates
--   protocol_metrics      — singleton protocol counters
--
-- Enums:
--   PaymentRequestStatus      — QUOTED | AUTHORIZED | SETTLED | EXPIRED | FAILED
--   SettlementVerificationStatus — PENDING | VERIFIED | FAILED | INCONCLUSIVE
--
-- Run with: prisma migrate deploy
-- =============================================================================

-- Enums ----------------------------------------------------------------
CREATE TYPE "PaymentRequestStatus" AS ENUM (
  'QUOTED',
  'AUTHORIZED',
  'SETTLED',
  'EXPIRED',
  'FAILED'
);

CREATE TYPE "SettlementVerificationStatus" AS ENUM (
  'PENDING',
  'VERIFIED',
  'FAILED',
  'INCONCLUSIVE'
);

-- PaymentRequests ------------------------------------------------------
CREATE TABLE "payment_requests" (
  "id"          TEXT PRIMARY KEY,
  "creatorId"   TEXT NOT NULL,
  "resource"    TEXT NOT NULL,
  "resourceId"  TEXT,
  "description" TEXT,
  "amountUsdc"  TEXT NOT NULL,
  "currency"    TEXT NOT NULL DEFAULT 'USDC',
  "network"     TEXT NOT NULL DEFAULT 'ARC_TESTNET',
  "chainId"     INTEGER NOT NULL DEFAULT 5042002,
  "assetAddress" TEXT NOT NULL DEFAULT '0x3600000000000000000000000000000000000000',
  "payTo"       TEXT NOT NULL,
  "facilitator" TEXT NOT NULL DEFAULT '0x0000000000000000000000000000000000000000',
  "validAfter"  BIGINT NOT NULL DEFAULT 0,
  "validBefore" BIGINT NOT NULL,
  "nonce"       TEXT NOT NULL,
  "x402Challenge" JSONB NOT NULL,
  "status"      "PaymentRequestStatus" NOT NULL DEFAULT 'QUOTED',
  "paymentId"   TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "quotedAt"    TIMESTAMP,
  "authorizedAt" TIMESTAMP,
  "settledAt"   TIMESTAMP,
  "expiredAt"   TIMESTAMP,

  CONSTRAINT "payment_requests_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE,
  CONSTRAINT "payment_requests_nonce_unique" UNIQUE ("nonce"),
  CONSTRAINT "payment_requests_paymentId_unique" UNIQUE ("paymentId"),
  CONSTRAINT "payment_requests_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL
);

CREATE INDEX "payment_requests_creatorId_status_idx"
  ON "payment_requests"("creatorId", "status");
CREATE INDEX "payment_requests_status_createdAt_idx"
  ON "payment_requests"("status", "createdAt");
CREATE INDEX "payment_requests_nonce_idx"
  ON "payment_requests"("nonce");

-- SettlementProofs -----------------------------------------------------
CREATE TABLE "settlement_proofs" (
  "id"                   TEXT PRIMARY KEY,
  "paymentId"            TEXT NOT NULL,
  "paymentHash"          TEXT NOT NULL,
  "txHash"               TEXT NOT NULL,
  "blockNumber"          BIGINT NOT NULL,
  "blockTimestamp"       TIMESTAMP NOT NULL,
  "blockHash"            TEXT,
  "arcScanUrl"           TEXT NOT NULL,
  "facilitator"          TEXT NOT NULL,
  "network"              TEXT NOT NULL DEFAULT 'ARC_TESTNET',
  "chainId"              INTEGER NOT NULL DEFAULT 5042002,
  "amountUsdc"           TEXT NOT NULL,
  "assetAddress"         TEXT NOT NULL,
  "payerAddress"         TEXT NOT NULL,
  "payeeAddress"         TEXT NOT NULL,
  "nonce"                TEXT NOT NULL,
  "verificationStatus"   "SettlementVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "confirmedAt"          TIMESTAMP,
  "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastCheckedAt"        TIMESTAMP,
  "prevHash"             TEXT NOT NULL,
  "hash"                 TEXT NOT NULL,
  "createdAt"            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "settlement_proofs_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE,
  CONSTRAINT "settlement_proofs_paymentId_unique" UNIQUE ("paymentId"),
  CONSTRAINT "settlement_proofs_paymentHash_unique" UNIQUE ("paymentHash"),
  CONSTRAINT "settlement_proofs_txHash_unique" UNIQUE ("txHash"),
  CONSTRAINT "settlement_proofs_hash_unique" UNIQUE ("hash")
);

CREATE INDEX "settlement_proofs_verificationStatus_createdAt_idx"
  ON "settlement_proofs"("verificationStatus", "createdAt");
CREATE INDEX "settlement_proofs_txHash_idx"
  ON "settlement_proofs"("txHash");
CREATE INDEX "settlement_proofs_blockNumber_idx"
  ON "settlement_proofs"("blockNumber");
CREATE INDEX "settlement_proofs_payerAddress_idx"
  ON "settlement_proofs"("payerAddress");
CREATE INDEX "settlement_proofs_createdAt_idx"
  ON "settlement_proofs"("createdAt");

-- VerificationEvents ---------------------------------------------------
CREATE TABLE "verification_events" (
  "id"           TEXT PRIMARY KEY,
  "proofId"      TEXT NOT NULL,
  "txHash"       TEXT NOT NULL,
  "status"       TEXT NOT NULL,
  "confirmations" INTEGER NOT NULL,
  "source"       TEXT NOT NULL,
  "payload"      JSONB NOT NULL,
  "blockNumber"  BIGINT,
  "errorMessage" TEXT,
  "checkedAt"    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "verification_events_proofId_fkey"
    FOREIGN KEY ("proofId") REFERENCES "settlement_proofs"("id") ON DELETE CASCADE
);

CREATE INDEX "verification_events_proofId_checkedAt_idx"
  ON "verification_events"("proofId", "checkedAt");
CREATE INDEX "verification_events_status_checkedAt_idx"
  ON "verification_events"("status", "checkedAt");

-- Supporters -----------------------------------------------------------
CREATE TABLE "supporters" (
  "id"           TEXT PRIMARY KEY,
  "address"      TEXT NOT NULL,
  "totalPaid"    TEXT NOT NULL DEFAULT '0',
  "totalPayments" INTEGER NOT NULL DEFAULT 0,
  "firstSeenAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userAgent"    TEXT,
  "label"        TEXT,
  "metadata"     JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "supporters_address_unique" UNIQUE ("address")
);

CREATE INDEX "supporters_totalPaid_idx" ON "supporters"("totalPaid");
CREATE INDEX "supporters_lastSeenAt_idx" ON "supporters"("lastSeenAt");

-- ProtocolMetrics ------------------------------------------------------
CREATE TABLE "protocol_metrics" (
  "id"                     TEXT PRIMARY KEY,
  "totalPayments"          BIGINT NOT NULL DEFAULT 0,
  "totalSettlements"       BIGINT NOT NULL DEFAULT 0,
  "totalVerifications"     BIGINT NOT NULL DEFAULT 0,
  "totalVerified"          BIGINT NOT NULL DEFAULT 0,
  "totalFailed"            BIGINT NOT NULL DEFAULT 0,
  "totalUsdcDistributed"   TEXT NOT NULL DEFAULT '0',
  "totalFeesCollected"     TEXT NOT NULL DEFAULT '0',
  "uniqueSupporters"       INTEGER NOT NULL DEFAULT 0,
  "uniqueCreators"         INTEGER NOT NULL DEFAULT 0,
  "x402ChallengesServed"   BIGINT NOT NULL DEFAULT 0,
  "x402PaymentsSettled"    BIGINT NOT NULL DEFAULT 0,
  "lastSettlementAt"       TIMESTAMP,
  "lastVerifiedAt"         TIMESTAMP,
  "updatedAt"              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
