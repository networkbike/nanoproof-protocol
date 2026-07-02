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
    // Lazy-connect: don't await. The first DB query will trigger the actual
    // connection. This way, even if the Postgres host is briefly unreachable
    // at startup, the HTTP server still binds to its port and /health responds.
    // We log the connection result for observability but don't block startup.
    this.$connect()
      .then(() => this.logger.log("Prisma connected (pg adapter)"))
      .catch((err) => this.logger.error(`Prisma initial connect failed (will retry on first query): ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log("Prisma disconnected");
  }
}
