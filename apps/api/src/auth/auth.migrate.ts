import { Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * One-shot migration runner. Applies the latest pending migration
 * directly via SQL. Safe to call multiple times (idempotent).
 *
 * NOT a NestJS Injectable — instantiated directly with the PrismaService
 * passed in. This avoids DI issues when the caller already has a prisma
 * instance available (like AuthController does).
 */
export class AuthMigrate {
  private readonly logger = new Logger(AuthMigrate.name);
  
  constructor(private readonly prisma: PrismaService) {}

  async runUserTableMigration(): Promise<{ ok: boolean; message: string }> {
    try {
      const tables = await this.prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      `;
      if (tables.length > 0) {
        return { ok: true, message: "users table already exists" };
      }

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE "users" (
          "id" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "displayName" TEXT,
          "walletAddress" TEXT,
          "creatorId" TEXT,
          "supporterId" TEXT,
          "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "users_pkey" PRIMARY KEY ("id")
        )
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX "users_email_key" ON "users"("email")
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX "users_role_idx" ON "users"("role")
      `);

      return { ok: true, message: "users table created successfully" };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }
}
