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
    // Connect the Prisma client immediately. Railway healthcheck only hits
    // /liveness (process-only), so we do NOT block startup on migrations
    // or the initial DB connection — the connection will be established
    // lazily on the first request and the migrate runs in the background.
    this.logger.log("Prisma: starting connection (non-blocking)...");

    // Fire-and-forget: run migrations in the background so a slow DB can't
    // make the new build fail to come up. The migration is still important —
    // we just don't want it to gate the healthcheck.
    void this.runMigrationsInBackground();

    // Connect in background too — runtime queries will trigger this lazily
    // on first use anyway, but we trigger it eagerly so the first request
    // doesn't pay the connect cost.
    this.$connect()
      .then(() => this.logger.log("Prisma connected (pg adapter)"))
      .catch((err) => this.logger.error(`Prisma initial connect failed: ${err.message}`));
  }

  private async runMigrationsInBackground(): Promise<void> {
    try {
      const { promisify } = await import("node:util");
      const { execFile } = await import("node:child_process");
      const exec = promisify(execFile);
      this.logger.log("Prisma: running migrate deploy in background...");
      const { stdout, stderr } = await exec(
        "npx",
        ["prisma", "migrate", "deploy"],
        { cwd: process.cwd(), timeout: 120_000 },
      );
      this.logger.log(`Prisma migrate deploy: ${stdout || "ok"}`);
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      const out = (e.stdout || "") + (e.stderr || "");
      if (out.includes("No pending migrations") ||
          out.includes("P3008") || out.includes("P3005")) {
        this.logger.warn(
          `prisma migrate deploy reported no-op. ` +
          `Falling back to prisma db push to ensure schema is in sync.`,
        );
        try {
          const { promisify } = await import("node:util");
          const { execFile } = await import("node:child_process");
          const exec = promisify(execFile);
          const { stdout: so2 } = await exec(
            "npx",
            ["prisma", "db", "push", "--skip-generate", "--accept-data-loss", "--schema=prisma/schema.prisma"],
            { cwd: process.cwd(), timeout: 120_000, env: process.env as Record<string, string> },
          );
          this.logger.log(`Prisma db push (fallback): ${so2 || "ok"}`);
        } catch (err2) {
          const e2 = err2 as { stdout?: string; stderr?: string; message?: string };
          this.logger.error(`Prisma db push FAILED: ${(e2.stdout || "") + (e2.stderr || "") || e2.message}`);
        }
      } else {
        this.logger.error(`Prisma migrate deploy FAILED: ${out || (e as Error).message}`);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log("Prisma disconnected");
  }
}
