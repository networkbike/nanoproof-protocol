-- =============================================================================
-- Phase 3 — Citation Engine (thin slice)
--
-- Adds:
--   fingerprints (snippet-hash matching)
--   citations.matchKind column
--   citations(responseId, recordedAt) index
-- =============================================================================

CREATE TABLE IF NOT EXISTS "fingerprints" (
  "id"         TEXT PRIMARY KEY,
  "sourceId"   TEXT NOT NULL REFERENCES "sources"("id") ON DELETE CASCADE,
  "algorithm"  TEXT NOT NULL,
  "hash"       TEXT NOT NULL,
  "window"     INTEGER NOT NULL,
  "body"       TEXT,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "fingerprints_sourceId_algorithm_hash_key"
  ON "fingerprints"("sourceId", "algorithm", "hash");
CREATE INDEX IF NOT EXISTS "fingerprints_hash_idx" ON "fingerprints"("hash");

-- Citations matchKind (default 'URL' preserves existing rows)
ALTER TABLE "citations" ADD COLUMN IF NOT EXISTS "matchKind" TEXT NOT NULL DEFAULT 'URL';
CREATE INDEX IF NOT EXISTS "citations_responseId_idx" ON "citations"("responseId");
CREATE INDEX IF NOT EXISTS "citations_matchKind_idx" ON "citations"("matchKind");
