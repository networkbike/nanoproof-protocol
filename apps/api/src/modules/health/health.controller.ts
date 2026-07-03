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

  /**
   * TEMPORARY DEBUG ENDPOINT — list all tables in the public schema.
   * Used to verify migrations actually ran. Will be removed once we
   * confirm migrations are working.
   */
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

  /**
   * TEMPORARY DEBUG ENDPOINT — run prisma migrate deploy and report the result.
   * This will fail loudly if migration fails, surfacing the real error.
   */
  @Public()
  @Get("debug/migrate")
  async debugMigrate(): Promise<{ output: string; exitCode: number }> {
    // Use child_process to run prisma migrate deploy from the api's
    // prisma directory. This is the same command the Dockerfile runs.
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    try {
      const { stdout, stderr } = await execAsync(
        "npx prisma migrate deploy 2>&1",
        { cwd: process.cwd(), timeout: 60_000 },
      );
      return { output: stdout + (stderr || ""), exitCode: 0 };
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; code?: number };
      return {
        output: (e.stdout || "") + (e.stderr || ""),
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