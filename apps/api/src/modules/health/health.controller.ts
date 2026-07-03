import { Controller, Get } from "@nestjs/common";
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
}

