import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Public } from "../../common/decorators/index.js";

/**
 * Health endpoints — covers both the API-style `/v1/healthz` and the
 * k8s/Railway-style conventions:
 *
 *   GET /v1/healthz     — full health (db + process) — used by uptime monitors
 *   GET /health         — same as /v1/healthz, mounted at root for Railway
 *   GET /liveness       — process is alive (no DB check, fast) — k8s livenessProbe
 *   GET /readiness      — process can serve traffic (DB ping ok) — k8s readinessProbe
 *
 * All four are `Public()` so they bypass the global API-key guard.
 * They return JSON; Railway maps the HTTP status to the platform health.
 *
 * DEBUG ENDPOINTS at the bottom (debug/tables, debug/permissions, debug/migrate)
 * exist temporarily to diagnose the missing database tables issue. They will
 * be removed once migrations are confirmed working.
 */

interface HealthResponse {
  status: "ok" | "degraded";
  checks: Record<string, string>;
  uptime: number;
  timestamp: string;
}

@ApiTags("health")
@Controller()
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  /** Full health check — `/v1/healthz` (existing). */
  @Public()
  @Get("v1/healthz")
  async detailed(): Promise<HealthResponse> {
    return this.fullHealth();
  }

  /** Same as above, mounted at root — Railway's default `/health` path. */
  @Public()
  @Get("health")
  async health(): Promise<HealthResponse> {
    return this.fullHealth();
  }

  /**
   * Liveness — process is alive. NO database check; k8s livenessProbe
   * should not fail just because the DB is restarting.
   */
  @Public()
  @Get("liveness")
  liveness(): { status: "ok"; uptime: number; timestamp: string } {
    return {
      status: "ok",
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness — process can serve traffic. Verifies the database is
   * reachable. Returns 503 if degraded so Railway / k8s readinessProbe
   * removes the pod from rotation until it recovers.
   */
  @Public()
  @Get("readiness")
  async readiness(): Promise<HealthResponse & { httpStatus?: number }> {
    const health = await this.fullHealth();
    return {
      ...health,
      httpStatus: health.status === "ok" ? 200 : 503,
    };
  }

  // ---------------------------------------------------------------------------
  // DEBUG ENDPOINTS — TEMPORARY for diagnosing missing database tables.
  // ---------------------------------------------------------------------------

  /** List all tables in the public schema. */
  @Public()
  @Get("debug/tables")
  async debugTables(): Promise<{ tables: string[]; count: number; error?: string }> {
    try {
      const rows = await this.prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      return { tables: rows.map((r) => r.table_name), count: rows.length };
    } catch (err) {
      return { tables: [], count: 0, error: (err as Error).message };
    }
  }

  /** Report current database user, db name, and basic permissions. */
  @Public()
  @Get("debug/permissions")
  async debugPermissions(): Promise<{
    currentUser: string | null;
    dbName: string | null;
    tablePrivileges: string[];
    error?: string;
  }> {
    try {
      const users = await this.prisma.$queryRaw<{ current_user: string }[]>`
        SELECT current_user
      `;
      const db = await this.prisma.$queryRaw<{ current_database: string }[]>`
        SELECT current_database()
      `;
      const perms = await this.prisma.$queryRaw<{ privilege_type: string }[]>`
        SELECT DISTINCT privilege_type
        FROM information_schema.role_table_grants
        WHERE grantee = current_user
          AND table_schema = 'public'
      `;
      return {
        currentUser: users[0]?.current_user ?? null,
        dbName: db[0]?.current_database ?? null,
        tablePrivileges: perms.map((p) => p.privilege_type).sort(),
      };
    } catch (err) {
      return {
        currentUser: null,
        dbName: null,
        tablePrivileges: [],
        error: (err as Error).message,
      };
    }
  }

  /**
   * Run prisma migrate deploy from inside the api process. Surfaces
   * the real migration output that the Dockerfile's `|| echo continue`
   * was hiding.
   */
  @Public()
  @Get("debug/migrate")
  async debugMigrate(): Promise<{
    command: string;
    cwd: string;
    exitCode: number;
    stdout: string;
    stderr: string;
    error?: string;
  }> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    try {
      const { stdout, stderr } = await exec(
        "npx",
        ["prisma", "migrate", "deploy", "--schema=prisma/schema.prisma"],
        {
          cwd: process.cwd(),
          timeout: 120_000,
          env: process.env as Record<string, string>,
        },
      );
      return {
        command: "npx prisma migrate deploy --schema=prisma/schema.prisma",
        cwd: process.cwd(),
        exitCode: 0,
        stdout: stdout.slice(-4000),
        stderr: stderr.slice(-4000),
      };
    } catch (err) {
      const e = err as {
        stdout?: string;
        stderr?: string;
        code?: number;
        message?: string;
      };
      return {
        command: "npx prisma migrate deploy --schema=prisma/schema.prisma",
        cwd: process.cwd(),
        exitCode: typeof e.code === "number" ? e.code : 1,
        stdout: (e.stdout ?? "").slice(-4000),
        stderr: (e.stderr ?? "").slice(-4000),
        error: e.message,
      };
    }
  }

  /**
   * Mark all migrations as applied (resets the migration history drift).
   * This is needed when the database has _prisma_migrations entries but
   * the actual tables are missing (e.g. restored from a partial backup).
   */
  @Public()
  @Get("debug/resolve-applied")
  async debugResolveApplied(): Promise<{ output: string; exitCode: number }> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    try {
      const { stdout, stderr } = await exec(
        "npx",
        ["prisma", "migrate", "resolve", "--applied", "20260701000001_phase2_creator_registry", "20260701100000_phase3_citation_engine_thinslice"],
        { cwd: process.cwd(), timeout: 60_000, env: process.env as Record<string, string> },
      );
      return { output: (stdout + (stderr || "")).slice(-4000), exitCode: 0 };
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; code?: number };
      return {
        output: ((e.stdout || "") + (e.stderr || "")).slice(-4000),
        exitCode: typeof e.code === "number" ? e.code : 1,
      };
    }
  }

  /**
   * Force the schema to be in sync by running prisma db push.
   * Unlike migrate deploy, this ignores migration history and
   * directly applies the schema to the database.
   */
  @Public()
  @Get("debug/db-push")
  async debugDbPush(): Promise<{ output: string; exitCode: number }> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    try {
      const { stdout, stderr } = await exec(
        "npx",
        ["prisma", "db", "push", "--skip-generate", "--accept-data-loss", "--schema=prisma/schema.prisma"],
        { cwd: process.cwd(), timeout: 120_000, env: process.env as Record<string, string> },
      );
      return { output: (stdout + (stderr || "")).slice(-4000), exitCode: 0 };
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; code?: number };
      return {
        output: ((e.stdout || "") + (e.stderr || "")).slice(-4000),
        exitCode: typeof e.code === "number" ? e.code : 1,
      };
    }
  }

  // ---------------------------------------------------------------------------

  private async fullHealth(): Promise<HealthResponse> {
    const checks: Record<string, string> = { process: "ok" };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch (err) {
      checks.database = `error: ${(err as Error).message}`;
    }
    const status: "ok" | "degraded" = Object.values(checks).every((v) => v === "ok") ? "ok" : "degraded";
    return {
      status,
      checks,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * TEMPORARY: seed Phase 8 demo data (4 creators + N settlements).
   * Used by the Lepton demo so judges see a populated dashboard.
   */
  @Public()
  @Get("debug/seed-x402")
  async debugSeedX402(@Query("count") count?: string): Promise<unknown> {
    const n = count ? Math.min(parseInt(count, 10) || 25, 200) : 25;
    const { X402Service } = await import("../../x402/x402.service.js");
    const { ArcScanVerifierService } = await import("../../x402/arcscan-verifier.service.js");
    const arcscan = new ArcScanVerifierService();
    const x402 = new X402Service(this.prisma, arcscan);

    const creatorsSpec = [
      { id: "cr_demo_alice", username: "alice", email: "alice@nanoproof.local", name: "Alice Chen", bio: "AI research · ML safety · Web3 protocols", wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
      { id: "cr_demo_bob", username: "bob", email: "bob@nanoproof.local", name: "Bob Martinez", bio: "Cryptographer · zk circuits · protocol design", wallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
      { id: "cr_demo_carol", username: "carol", email: "carol@nanoproof.local", name: "Carol Singh", bio: "DeFi research · stablecoin economics", wallet: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" },
      { id: "cr_demo_dave", username: "dave", email: "dave@nanoproof.local", name: "Dave Okafor", bio: "Web dev tutorials · React · Next.js", wallet: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" },
    ];

    const creators: Array<{ id: string; username: string }> = [];
    for (const c of creatorsSpec) {
      const creator = await this.prisma.creator.upsert({
        where: { id: c.id },
        update: { name: c.name, bio: c.bio, isActive: true },
        create: {
          id: c.id,
          username: c.username,
          email: c.email,
          name: c.name,
          bio: c.bio,
          isActive: true,
          reputationScore: 85 + Math.floor(Math.random() * 15),
        },
      });
      await this.prisma.wallet.upsert({
        where: { address_network: { address: c.wallet, network: "ARC_TESTNET" } },
        update: { creatorId: creator.id, isPrimary: true, verificationStatus: "VERIFIED" },
        create: {
          creatorId: creator.id,
          address: c.wallet,
          network: "ARC_TESTNET",
          isPrimary: true,
          verificationStatus: "VERIFIED",
          verificationMethod: "EIP-191",
        },
      });
      creators.push({ id: creator.id, username: creator.username });
    }

    const resources = ["/v1/research/cite", "/v1/research/answer", "/v1/premium/source", "/v1/agent/tool"];
    const amounts = ["1000", "2500", "5000", "10000"];
    const payers = [
      "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
      "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
      "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    ];

    let created = 0;
    let failed = 0;
    for (let i = 0; i < n; i++) {
      const creator = creators[i % creators.length]!;
      const resource = resources[i % resources.length]!;
      const amount = amounts[i % amounts.length]!;
      const payer = payers[i % payers.length]!;
      try {
        const { request } = await x402.createPaymentRequest({
          creatorId: creator.id,
          resource,
          amountUsdc: amount,
          payerAddress: payer,
        });
        await x402.settlePayment({ requestId: request.id, payerAddress: payer });
        created++;
      } catch {
        failed++;
      }
    }

    const metrics = await x402.getProtocolMetrics();
    return {
      ok: true,
      creators: creators.length,
      settlementsCreated: created,
      settlementsFailed: failed,
      metrics,
    };
  }
}

