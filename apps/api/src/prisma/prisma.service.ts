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
    await this.$connect();
    this.logger.log("Prisma connected (pg adapter)");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log("Prisma disconnected");
  }
}
