/**
 * User-table migration helper. Creates the `users` table on demand
 * if it doesn't already exist. Safe to call multiple times (idempotent).
 *
 * Used by:
 *  - AuthController.migrate() (POST /auth/migrate)
 *  - NestJS onModuleInit (auto-applied on boot)
 */
import type { PrismaService } from "../prisma/prisma.service.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS "users" (
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
`;

const INDEX_EMAIL = `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")`;
const INDEX_ROLE  = `CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role")`;

export class AuthMigrate {
  constructor(private readonly prisma: PrismaService) {}

  async ensureUserTable(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.prisma.$executeRawUnsafe(DDL);
      await this.prisma.$executeRawUnsafe(INDEX_EMAIL);
      await this.prisma.$executeRawUnsafe(INDEX_ROLE);
      return { ok: true, message: "users table ensured" };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }
}
