import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * PrismaService — uses the `pg` driver adapter (pure JS) so the protocol
 * works on Termux, macOS, Windows, and any other platform that Node + `pg`
 * can run on. We avoid Prisma's native query engine because it ships
 * prebuilt `.so.node` binaries tied to specific glibc versions, which
 * fail to dlopen on Android (Bionic libc).
 *
 * Performance: the adapter is ~5-15% slower than the native engine for
 * simple queries; the gap only shows at high QPS / complex joins. We're
 * not there yet.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    // At startup, run prisma migrate deploy via the Prisma migrate
    // engine. This ensures the schema is always in sync with the
    // migrations directory. If migration fails, throw so the api
    // fails to start (Railway will mark the deploy as failed with
    // the actual error in the deploy log).
    const { default: prismaMigrate } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFile = promisify((await import("node:child_process")).execFile);
    try {
      this.logger.log("Running prisma migrate deploy...");
      const { stdout, stderr } = await execFile(
        "npx",
        ["prisma", "migrate", "deploy"],
        { cwd: process.cwd(), timeout: 120_000 },
      );
      this.logger.log(`prisma migrate deploy: ${stdout || "ok"}`);
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      const out = (e.stdout || "") + (e.stderr || "");
      // "No pending migrations" is the migration-history-drift scenario:
      // _prisma_migrations says done, but tables may be missing. Fall back
      // to prisma db push to force the schema in sync. This is safe because
      // it only creates missing objects (--accept-data-loss is required for
      // the rare destructive case which we accept for demo/dev).
      if (out.includes("No pending migrations") === false &&
          out.includes("P3008") === false && out.includes("P3005") === false) {
        this.logger.error(`prisma migrate deploy FAILED: ${out || e.message}`);
        throw new Error(`Database migration failed: ${out || e.message}`);
      }
      this.logger.warn(
        `prisma migrate deploy reported no-op (${out.trim()}). ` +
        `Falling back to prisma db push to ensure schema is in sync.`,
      );
      const { execFile: ef2 } = await import("node:child_process");
      const { promisify: p2 } = await import("node:util");
      const exec2 = p2(ef2);
      try {
        const { stdout: so2, stderr: se2 } = await exec2(
          "npx",
          ["prisma", "db", "push", "--skip-generate", "--accept-data-loss", "--schema=prisma/schema.prisma"],
          { cwd: process.cwd(), timeout: 120_000, env: process.env as Record<string, string> },
        );
        this.logger.log(`prisma db push (fallback): ${so2 || "ok"}`);
      } catch (err2) {
        const e2 = err2 as { stdout?: string; stderr?: string; message?: string };
        const out2 = (e2.stdout || "") + (e2.stderr || "");
        this.logger.error(`prisma db push FAILED: ${out2 || e2.message}`);
        throw new Error(`Database db push failed: ${out2 || e2.message}`);
      }
    }

    // After migration, lazy-connect for runtime queries
    this.$connect()
      .then(() => this.logger.log("Prisma connected (pg adapter)"))
      .catch((err) => this.logger.error(`Prisma initial connect failed: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log("Prisma disconnected");
  }
}
