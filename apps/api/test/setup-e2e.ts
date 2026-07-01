// Vitest e2e setup — boots pglite (WASM Postgres) on a TCP socket.
//
// Why not apt postgresql?
//   The native Postgres server requires kernel shared memory (`/dev/shm`) for
//   `initdb` and `pg_ctl start`. On Android (Termux, proot-distro) `/dev/shm`
//   is unavailable to user space, so `initdb` fails with:
//     FATAL: could not create shared memory segment: No space left on device
//   even though `/dev/shm` reports capacity. The shmget(2) syscall returns
//   ENOSPC because the kernel param SHMMNI / SHMMAX cannot be tuned inside
//   proot.
//
// Why not pglite directly (no socket)?
//   Prisma 5.22's official adapter set is {pg,libsql,d1}. There's no
//   first-class pglite adapter, and the pg driver expects a real wire-protocol
//   socket. We need a server, not an in-process adapter.
//
// Why pglite-socket (WASM + Node net.Server)?
//   - It speaks the Postgres wire protocol. Prisma's pg adapter connects
//     exactly the same way it connects to a real Postgres.
//   - No kernel shm, no initdb, no apt postgresql, no /var/run/postgresql.
//   - Works on Termux / proot because the whole stack is JS + WASM.
//   - The data lives in a file under our control (no daemon, no auth).
//
// Lifecycle:
//   pglite is bound to the vitest worker process. When the worker exits,
//   the TCP server closes and the file is removed by the global teardown.
//
// Connection string:
//   process.env.DATABASE_URL is hard-coded to localhost:5432 so the test
//   bootstrap (which uses Pool({ connectionString })) finds us.

import "reflect-metadata";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL = "postgresql://root@127.0.0.1:5432/nanoproof";

// Per-worker ephemeral DB file (one file per fork so concurrent workers
// don't collide; vitest singleFork=true makes this single-fork anyway).
const dbPath = `/tmp/nanoproof-pglite-${process.pid}.data`;

declare global {
  // eslint-disable-next-line no-var
  var __nanoproof_pglite: PGlite | undefined;
  // eslint-disable-next-line no-var
  var __nanoproof_pglite_socket: PGLiteSocketServer | undefined;
}

const setupPromise = (async () => {
  if (globalThis.__nanoproof_pglite) return; // already up

  // 1. Boot WASM Postgres
  const db = await PGlite.create({ dataDir: dbPath });
  globalThis.__nanoproof_pglite = db;

  // 1a. Create enums BEFORE applying SQL — Prisma migrations assume these
  //     exist via `prisma migrate`, but we exec raw SQL so the enums are
  //     our responsibility. Keep this list in sync with apps/api/prisma/schema.prisma.
  const enumSql = `
    DO $$ BEGIN
      CREATE TYPE "WalletNetwork" AS ENUM ('ARC_TESTNET', 'ARC_MAINNET', 'BASE', 'BASE_SEPOLIA', 'ETHEREUM', 'ETHEREUM_SEPOLIA', 'POLYGON', 'POLYGON_AMOY');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE "SourceStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'ACTIVE', 'PAUSED', 'REJECTED', 'ARCHIVED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE "SourceVerificationMethod" AS ENUM ('DNS_TXT', 'HTML_META', 'FILE_UPLOAD', 'MANUAL');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE "CitationKind" AS ENUM ('DIRECT', 'INDIRECT', 'SUPPORTING', 'REFERENCE', 'CONTEXT');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'QUOTED', 'SETTLED', 'CAPPED', 'FAILED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE "ApiKeyScope" AS ENUM ('READ_CITATIONS', 'WRITE_CITATIONS', 'READ_PAYMENTS', 'WRITE_PAYMENTS', 'ADMIN');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `;
  await db.exec(enumSql);

  // 2. Apply Prisma migrations directly (bypass the prisma CLI).
  //    We exec the SQL files in alphabetical order so the schema matches
  //    what `db:migrate:deploy` would produce.
  const migrationsDir = join(process.cwd(), "prisma", "migrations");
  const migrationDirs = readdirSync(migrationsDir)
    .filter((name) => /^\d/.test(name))
    .sort();
  for (const dir of migrationDirs) {
    const sqlPath = join(migrationsDir, dir, "migration.sql");
    const sql = readFileSync(sqlPath, "utf8");
    try {
      await db.exec(sql);
    } catch (err) {
      const msg = (err as Error).message;
      // "relation already exists" is fine because the migrations use
      // CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS guards.
      if (msg.includes("already exists")) continue;
      throw err;
    }
  }

  // 2a. Re-apply enum casts that the raw-SQL migrations skip.
  //     The migrations declare columns as TEXT (because they were written
  //     without prisma-client connection), so Prisma's typed queries
  //     (findUnique, create, update) error out with 42883 ("operator
  //     does not exist: text = \"WalletNetwork\""). We cast the
  //     affected columns to their respective enums to match what
  //     `prisma migrate deploy` would have produced.
  await db.exec(`
    -- Wallets — drop defaults first so the enum cast doesn't trip on them
    ALTER TABLE "wallets" ALTER COLUMN "network" DROP DEFAULT;
    ALTER TABLE "wallets" ALTER COLUMN "verificationStatus" DROP DEFAULT;
    ALTER TABLE "wallets" ALTER COLUMN "network" TYPE "WalletNetwork" USING "network"::"WalletNetwork";
    ALTER TABLE "wallets" ALTER COLUMN "verificationStatus" TYPE "VerificationStatus" USING "verificationStatus"::"VerificationStatus";
    ALTER TABLE "wallets" ALTER COLUMN "network" SET DEFAULT 'ARC_TESTNET';
    ALTER TABLE "wallets" ALTER COLUMN "verificationStatus" SET DEFAULT 'UNVERIFIED';

    -- Verification challenges — status is TEXT in the schema, but the
    -- challenge.status field is consumed through the VerificationStatus
    -- enum (see walletes.service.ts:98: updateMany uses VerificationStatus
    -- values directly). Cast to enum so Prisma's typed query works.
    ALTER TABLE "verification_challenges" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "verification_challenges" ALTER COLUMN "status" TYPE "VerificationStatus" USING "status"::"VerificationStatus";
    ALTER TABLE "verification_challenges" ALTER COLUMN "status" SET DEFAULT 'PENDING';

    -- Sources
    ALTER TABLE "sources" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "sources" ALTER COLUMN "status" TYPE "SourceStatus" USING "status"::"SourceStatus";
    ALTER TABLE "sources" ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION';

    -- Citations
    ALTER TABLE "citations" ALTER COLUMN "kind" DROP DEFAULT;
    ALTER TABLE "citations" ALTER COLUMN "kind" TYPE "CitationKind" USING "kind"::"CitationKind";
    ALTER TABLE "citations" ALTER COLUMN "kind" SET DEFAULT 'CONTEXT';

    -- Payments
    ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "payments" ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::"PaymentStatus";
    ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'PENDING';
    ALTER TABLE "payments" ALTER COLUMN "network" DROP DEFAULT;
    ALTER TABLE "payments" ALTER COLUMN "network" TYPE "WalletNetwork" USING "network"::"WalletNetwork";
    ALTER TABLE "payments" ALTER COLUMN "network" SET DEFAULT 'ARC_TESTNET';

    -- Source verifications
    ALTER TABLE "source_verifications" ALTER COLUMN "method" TYPE "SourceVerificationMethod" USING "method"::"SourceVerificationMethod";
  `);

  // 3. Expose via TCP on 127.0.0.1:5432 (matches DATABASE_URL)
  const server = new PGLiteSocketServer({
    db,
    port: process.env.PGLITE_TCP_PORT
      ? Number(process.env.PGLITE_TCP_PORT)
      : 5432,
    host: process.env.PGLITE_TCP_HOST ?? "127.0.0.1",
    // Allow the test's pg.Pool to spin up a few clients in parallel;
    // and the Promise.all() in stats controller fires 4 queries
    // concurrently, so we need at least 4 (give it headroom).
    maxConnections: 8,
  });
  await server.start();
  globalThis.__nanoproof_pglite_socket = server;

  // eslint-disable-next-line no-console
  console.log(
    `[e2e-pg] pglite-socket listening at 127.0.0.1:5432 (data: ${dbPath}, migrations: ${migrationDirs.length})`,
  );
})();

// vitest's setupFiles can be top-level await in module-resolution, but tsc
// with module=commonjs complains. Use a shared promise global so the first
// spec can `await` it explicitly before any DB-touching beforeAll.
(globalThis as Record<string, unknown>).__nanoproof_pglite_ready = setupPromise;
