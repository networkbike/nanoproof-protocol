import { Injectable, Logger } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { ApiKey, ApiKeyScope } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import {
  CreateApiKeySchema,
  RevokeApiKeySchema,
  type CreateApiKey,
} from "@nanoproof/shared/schemas/apikey.js";
import { NPError } from "../../common/errors/np.error.js";

export interface MintResult {
  apiKey: ApiKey;
  /** Plaintext key — only emitted at mint time. Format: `np_live_<prefix>.<secret>`. */
  plaintext: string;
}

const BCRYPT_ROUNDS = 10;

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Mint a key — `plaintext` is returned ONCE, then discarded. */
  async mint(input: CreateApiKey): Promise<MintResult> {
    const data = CreateApiKeySchema.parse(input);
    if (!data.creatorId && !data.organizationId) {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: "Provide creatorId or organizationId.",
      });
    }

    const environment = process.env.NODE_ENV === "production" ? "live" : "test";
    const prefix = `np_${environment}_${randomBytes(8).toString("hex")}`;
    const secret = randomBytes(32).toString("base64url");
    const plaintext = `${prefix}.${secret}`;
    const last4 = secret.slice(-4);
    const hash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId: data.organizationId ?? null,
        creatorId: data.creatorId ?? null,
        name: data.name,
        prefix,
        hash,
        last4,
        scopes: (data.scopes ?? ["READ_CITATIONS"]) as ApiKeyScope[],
        rateLimitPerMinute: data.rateLimitPerMinute ?? 600,
        rateLimitBurst: data.rateLimitBurst ?? 100,
        expiresAt: data.expiresAt ?? null,
      },
    });

    this.logger.log(`ApiKey minted: ${prefix}…${last4} for ${data.creatorId ?? data.organizationId}`);
    return { apiKey, plaintext };
  }

  async list(filter: { creatorId?: string; organizationId?: string }): Promise<ApiKey[]> {
    const where: Record<string, unknown> = {};
    if (filter.creatorId) where.creatorId = filter.creatorId;
    if (filter.organizationId) where.organizationId = filter.organizationId;
    return this.prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      // Never return the secret hash.
      select: {
        id: true,
        creatorId: true,
        organizationId: true,
        name: true,
        prefix: true,
        last4: true,
        scopes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        lastUsedAt: true,
        lastUsedIp: true,
        callCount: true,
        rateLimitPerMinute: true,
        rateLimitBurst: true,
        revokedAt: true,
        revokedReason: true,
      },
    }) as unknown as ApiKey[];
  }

  async revoke(input: {
    id: string;
    ownerId: string;
    ownerKind: "creator" | "organization";
    reason?: string;
  }): Promise<ApiKey> {
    RevokeApiKeySchema.parse({ id: input.id, reason: input.reason });
    const key = await this.prisma.apiKey.findUnique({ where: { id: input.id } });
    if (!key) throw new NPError("NP_NOT_FOUND", { message: "API key not found." });

    if (input.ownerKind === "creator" && key.creatorId !== input.ownerId) {
      throw new NPError("NP_FORBIDDEN");
    }
    if (input.ownerKind === "organization" && key.organizationId !== input.ownerId) {
      throw new NPError("NP_FORBIDDEN");
    }

    return this.prisma.apiKey.update({
      where: { id: input.id },
      data: {
        revokedAt: new Date(),
        revokedReason: input.reason ?? null,
        isActive: false,
      },
    });
  }
}
