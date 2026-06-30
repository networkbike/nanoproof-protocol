-- =============================================================================
-- Phase 2 — Creator Registry Migration
--
-- Adds Organization, OrganizationMembership, VerificationChallenge,
-- ApiKey, IdempotencyKey, SourceVerification tables.
--
-- Adds the partial unique index on Wallet(creatorId, network, isPrimary=true)
-- that Prisma can't model directly.
--
-- Adds append-only triggers on Citation, Payment, Receipt (Phase 4).
-- =============================================================================

-- Organizations ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "organizations" (
  "id"           TEXT PRIMARY KEY,
  "name"         TEXT NOT NULL,
  "slug"         TEXT NOT NULL UNIQUE,
  "bio"          TEXT,
  "avatarUrl"    TEXT,
  "websiteUrl"   TEXT,
  "billingEmail" TEXT,
  "isActive"     BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  "deletedAt"    TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "organizations_deletedAt_idx" ON "organizations"("deletedAt");

CREATE TABLE IF NOT EXISTS "organization_memberships" (
  "id"             TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "creatorId"      TEXT NOT NULL REFERENCES "creators"("id") ON DELETE CASCADE,
  "role"           TEXT NOT NULL DEFAULT 'VIEWER',
  "invitedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt"     TIMESTAMP(3),
  "revokedAt"      TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "organization_memberships_organizationId_creatorId_key"
  ON "organization_memberships"("organizationId", "creatorId");
CREATE INDEX IF NOT EXISTS "organization_memberships_creatorId_idx"
  ON "organization_memberships"("creatorId");

-- Wallets + Verification challenges ---------------------------------------
CREATE TABLE IF NOT EXISTS "wallets" (
  "id"                 TEXT PRIMARY KEY,
  "creatorId"          TEXT NOT NULL REFERENCES "creators"("id") ON DELETE CASCADE,
  "address"            TEXT NOT NULL,
  "network"            TEXT NOT NULL,
  "label"              TEXT,
  "isPrimary"          BOOLEAN NOT NULL DEFAULT FALSE,
  "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "verifiedAt"         TIMESTAMP(3),
  "verificationMethod" TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_address_network_key"
  ON "wallets"("address", "network");
CREATE INDEX IF NOT EXISTS "wallets_creatorId_idx" ON "wallets"("creatorId");
CREATE INDEX IF NOT EXISTS "wallets_verificationStatus_idx" ON "wallets"("verificationStatus");

-- Partial unique index — only one primary wallet per (creator, network)
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_one_primary_per_creator_network"
  ON "wallets"("creatorId", "network")
  WHERE "isPrimary" = TRUE;

CREATE TABLE IF NOT EXISTS "verification_challenges" (
  "id"         TEXT PRIMARY KEY,
  "walletId"   TEXT NOT NULL REFERENCES "wallets"("id") ON DELETE CASCADE,
  "challenge"  TEXT NOT NULL UNIQUE,
  "message"    TEXT NOT NULL,
  "purpose"    TEXT NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'PENDING',
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "verification_challenges_walletId_status_idx"
  ON "verification_challenges"("walletId", "status");
CREATE INDEX IF NOT EXISTS "verification_challenges_expiresAt_idx"
  ON "verification_challenges"("expiresAt");

-- Sources + verification --------------------------------------------------
CREATE TABLE IF NOT EXISTS "sources" (
  "id"            TEXT PRIMARY KEY,
  "creatorId"     TEXT NOT NULL REFERENCES "creators"("id") ON DELETE CASCADE,
  "title"         TEXT NOT NULL,
  "url"           TEXT NOT NULL,
  "domain"        TEXT NOT NULL,
  "description"   TEXT,
  "citationPrice" TEXT NOT NULL DEFAULT '1000',
  "minPayout"     TEXT NOT NULL DEFAULT '100',
  "periodCap"     TEXT,
  "license"       TEXT NOT NULL DEFAULT 'all-rights-reserved',
  "status"        TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "verifiedAt"    TIMESTAMP(3),
  "citationCount" INTEGER NOT NULL DEFAULT 0,
  "earnedAtomic"  TEXT NOT NULL DEFAULT '0',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "archivedAt"    TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "sources_creatorId_url_key"
  ON "sources"("creatorId", "url");
CREATE INDEX IF NOT EXISTS "sources_creatorId_status_idx"
  ON "sources"("creatorId", "status");
CREATE INDEX IF NOT EXISTS "sources_domain_idx" ON "sources"("domain");
CREATE INDEX IF NOT EXISTS "sources_status_idx" ON "sources"("status");

CREATE TABLE IF NOT EXISTS "source_verifications" (
  "id"            TEXT PRIMARY KEY,
  "sourceId"      TEXT NOT NULL REFERENCES "sources"("id") ON DELETE CASCADE,
  "method"        TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'PENDING',
  "token"         TEXT NOT NULL,
  "expected"      TEXT NOT NULL,
  "observed"      TEXT,
  "attempts"      INTEGER NOT NULL DEFAULT 0,
  "lastTriedAt"   TIMESTAMP(3),
  "succeededAt"   TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "source_verifications_sourceId_method_idx"
  ON "source_verifications"("sourceId", "method");
CREATE INDEX IF NOT EXISTS "source_verifications_status_idx"
  ON "source_verifications"("status");

-- Citations (append-only) -------------------------------------------------
CREATE TABLE IF NOT EXISTS "citations" (
  "id"                   TEXT PRIMARY KEY,
  "sourceId"             TEXT NOT NULL REFERENCES "sources"("id") ON DELETE CASCADE,
  "responseId"           TEXT,
  "snippet"              TEXT NOT NULL,
  "kind"                 TEXT NOT NULL DEFAULT 'DIRECT',
  "matchScore"           TEXT NOT NULL DEFAULT '1.0000',
  "confidence"           TEXT NOT NULL DEFAULT '1.00',
  "contributionFraction" TEXT NOT NULL DEFAULT '1.0000',
  "payoutAmountUsdc"     TEXT NOT NULL DEFAULT '1000',
  "status"               TEXT NOT NULL DEFAULT 'PENDING',
  "recordedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "prevHash"             TEXT,
  "hash"                 TEXT
);
CREATE INDEX IF NOT EXISTS "citations_sourceId_idx" ON "citations"("sourceId");
CREATE INDEX IF NOT EXISTS "citations_recordedAt_idx" ON "citations"("recordedAt");

-- Append-only trigger: forbid UPDATE / DELETE on citations
CREATE OR REPLACE FUNCTION citations_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'NP_READONLY: citations table is append-only (op=%)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_citations_no_update ON "citations";
CREATE TRIGGER trg_citations_no_update
  BEFORE UPDATE ON "citations"
  FOR EACH ROW EXECUTE FUNCTION citations_append_only();

DROP TRIGGER IF EXISTS trg_citations_no_delete ON "citations";
CREATE TRIGGER trg_citations_no_delete
  BEFORE DELETE ON "citations"
  FOR EACH ROW EXECUTE FUNCTION citations_append_only();

-- Payments (append-only) --------------------------------------------------
CREATE TABLE IF NOT EXISTS "payments" (
  "id"          TEXT PRIMARY KEY,
  "creatorId"   TEXT NOT NULL REFERENCES "creators"("id") ON DELETE CASCADE,
  "sourceId"    TEXT REFERENCES "sources"("id") ON DELETE SET NULL,
  "amountUsdc"  TEXT NOT NULL,
  "currency"    TEXT NOT NULL DEFAULT 'USDC',
  "network"     TEXT NOT NULL DEFAULT 'ARC_TESTNET',
  "status"      TEXT NOT NULL DEFAULT 'SETTLED',
  "txHash"      TEXT,
  "arcScanUrl"  TEXT,
  "blockNumber" BIGINT,
  "settledAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "prevHash"    TEXT,
  "hash"        TEXT
);
CREATE INDEX IF NOT EXISTS "payments_creatorId_settledAt_idx"
  ON "payments"("creatorId", "settledAt");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");

CREATE OR REPLACE FUNCTION payments_append_only()
RETURNS TRIGGER AS $$
BEGIN
  -- Payments can be UPDATED only to flip status (PENDING → SETTLED etc.)
  -- For the MVP we also enforce UPDATE-immutability and require a new row.
  RAISE EXCEPTION 'NP_READONLY: payments table is append-only (op=%)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_no_update ON "payments";
CREATE TRIGGER trg_payments_no_update
  BEFORE UPDATE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION payments_append_only();

DROP TRIGGER IF EXISTS trg_payments_no_delete ON "payments";
CREATE TRIGGER trg_payments_no_delete
  BEFORE DELETE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION payments_append_only();

-- ApiKeys -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id"                TEXT PRIMARY KEY,
  "organizationId"    TEXT REFERENCES "organizations"("id") ON DELETE CASCADE,
  "creatorId"         TEXT REFERENCES "creators"("id") ON DELETE CASCADE,
  "name"              TEXT NOT NULL,
  "prefix"            TEXT NOT NULL UNIQUE,
  "hash"              TEXT NOT NULL,
  "last4"             TEXT NOT NULL,
  "scopes"            TEXT[] NOT NULL DEFAULT ARRAY['READ_CITATIONS']::TEXT[],
  "isActive"          BOOLEAN NOT NULL DEFAULT TRUE,
  "expiresAt"         TIMESTAMP(3),
  "lastUsedAt"        TIMESTAMP(3),
  "lastUsedIp"        TEXT,
  "callCount"         BIGINT NOT NULL DEFAULT 0,
  "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 600,
  "rateLimitBurst"    INTEGER NOT NULL DEFAULT 100,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  "revokedAt"         TIMESTAMP(3),
  "revokedReason"     TEXT
);
CREATE INDEX IF NOT EXISTS "api_keys_creatorId_isActive_idx"
  ON "api_keys"("creatorId", "isActive");
CREATE INDEX IF NOT EXISTS "api_keys_organizationId_isActive_idx"
  ON "api_keys"("organizationId", "isActive");

-- Idempotency keys --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "key"            TEXT PRIMARY KEY,
  "creatorId"      TEXT,
  "organizationId" TEXT,
  "method"         TEXT NOT NULL,
  "path"           TEXT NOT NULL,
  "requestHash"    TEXT NOT NULL,
  "responseStatus" INTEGER,
  "responseBody"   JSONB,
  "state"          TEXT NOT NULL DEFAULT 'IN_FLIGHT',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "completedAt"    TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "idempotency_keys_expiresAt_idx"
  ON "idempotency_keys"("expiresAt");
