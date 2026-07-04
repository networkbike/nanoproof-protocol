/**
 * User-table migration helper. Creates the `users` table on demand
 * if it doesn't already exist, and ensures new columns exist for
 * walletRevealed + walletKey (idempotent ALTERs).
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

const ALTER_WALLET_KEY      = `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "walletKey" TEXT`;
const ALTER_WALLET_REVEALED = `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "walletRevealed" BOOLEAN NOT NULL DEFAULT false`;

export class AuthMigrate {
  constructor(private readonly prisma: PrismaService) {}

  async ensureUserTable(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.prisma.$executeRawUnsafe(DDL);
      await this.prisma.$executeRawUnsafe(INDEX_EMAIL);
      await this.prisma.$executeRawUnsafe(INDEX_ROLE);
      await this.prisma.$executeRawUnsafe(ALTER_WALLET_KEY);
      await this.prisma.$executeRawUnsafe(ALTER_WALLET_REVEALED);
      return { ok: true, message: "users table ensured" };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }
}
