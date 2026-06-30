import { Injectable, Logger } from "@nestjs/common";
import type { Creator } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CreateCreatorSchema, UpdateCreatorSchema, type CreateCreator, type UpdateCreator } from "@nanoproof/shared/schemas/creator";
import { UsernameSchema } from "@nanoproof/shared/schemas/username.js";
import { NPError } from "../../common/errors/np.error.js";

export interface CreatorListOptions {
  limit: number;
  cursor?: string;
  q?: string;
  isActive?: boolean;
}

/**
 * Creator service — full CRUD (P2-006).
 *
 * Validation, uniqueness checks, and reserved-name enforcement happen at
 * the service boundary. Errors use the NP_* catalog.
 */
@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCreator): Promise<Creator> {
    const data = CreateCreatorSchema.parse(input);

    const usernameCheck = UsernameSchema.safeParse(data.username);
    if (!usernameCheck.success) {
      const first = usernameCheck.error.issues[0]?.message ?? "Invalid username.";
      throw new NPError(usernameCheck.error.issues[0]?.code === "custom" ? "NP_USERNAME_RESERVED" : "NP_VALIDATION_FAILED", {
        message: first,
        params: { username: data.username },
      });
    }

    const [byUsername, byEmail] = await Promise.all([
      this.prisma.creator.findUnique({ where: { username: data.username } }),
      this.prisma.creator.findUnique({ where: { email: data.email.toLowerCase() } }),
    ]);
    if (byUsername) throw new NPError("NP_USERNAME_TAKEN", { params: { username: data.username } });
    if (byEmail) throw new NPError("NP_EMAIL_TAKEN");

    const creator = await this.prisma.creator.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email.toLowerCase(),
        bio: data.bio ?? null,
        avatarUrl: data.avatarUrl ?? null,
        twitterHandle: data.twitterHandle ?? null,
        githubHandle: data.githubHandle ?? null,
        websiteUrl: data.websiteUrl ?? null,
      },
    });

    this.logger.log(`Creator created: ${creator.username} (${creator.id})`);
    return creator;
  }

  async findById(id: string, includeDeleted = false): Promise<Creator> {
    const creator = await this.prisma.creator.findUnique({ where: { id } });
    if (!creator || (!includeDeleted && creator.deletedAt)) {
      throw new NPError("NP_CREATOR_NOT_FOUND", { params: { id } });
    }
    return creator;
  }

  async findByUsername(username: string): Promise<Creator | null> {
    return this.prisma.creator.findUnique({ where: { username } });
  }

  async update(id: string, input: UpdateCreator): Promise<Creator> {
    const data = UpdateCreatorSchema.parse(input);
    await this.findById(id); // throws if missing
    return this.prisma.creator.update({ where: { id }, data });
  }

  /** Soft-delete; GDPR purge worker (P2-020) hard-deletes after 30 days. */
  async softDelete(id: string): Promise<Creator> {
    await this.findById(id);
    return this.prisma.creator.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async list(opts: CreatorListOptions): Promise<{ data: Creator[]; nextCursor: string | null }> {
    const take = Math.min(Math.max(opts.limit, 1), 100);

    const where: Record<string, unknown> = {};
    if (opts.isActive !== undefined) where.isActive = opts.isActive;
    if (opts.q) {
      where.OR = [
        { username: { contains: opts.q, mode: "insensitive" } },
        { name: { contains: opts.q, mode: "insensitive" } },
      ];
    }

    const rows = await this.prisma.creator.findMany({
      where,
      take: take + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const hasMore = rows.length > take;
    return {
      data: hasMore ? rows.slice(0, take) : rows,
      nextCursor: hasMore ? rows[take - 1].id : null,
    };
  }

  async stats(id: string): Promise<{
    creator: Creator;
    walletCount: number;
    sourceCount: number;
    citationCount: number;
    earnedAtomic: string;
  }> {
    const creator = await this.findById(id);
    const [wallets, sources, citationCount, earnedRows] = await Promise.all([
      this.prisma.wallet.count({ where: { creatorId: id } }),
      this.prisma.source.count({ where: { creatorId: id } }),
      this.prisma.citation.count({ where: { source: { creatorId: id } } }),
      // Payment.amountUsdc is `String` (atomic USDC), so we can't aggregate with _sum.
      // Pull the SETTLED rows and sum in-app — bounded by per-creator payouts/day so cheap.
      this.prisma.payment.findMany({
        where: { creatorId: id, status: "SETTLED" },
        select: { amountUsdc: true },
      }),
    ]);
    let earnedAtomic = 0n;
    for (const r of earnedRows) earnedAtomic += BigInt(r.amountUsdc);
    return {
      creator,
      walletCount: wallets,
      sourceCount: sources,
      citationCount,
      earnedAtomic: earnedAtomic.toString(),
    };
  }
}
