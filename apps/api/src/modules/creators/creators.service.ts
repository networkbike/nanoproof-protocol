import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCreatorSchema, type CreateCreator } from "@nanoproof/shared/schemas/creator";
import type { Creator } from "@prisma/client";

/**
 * MVP creators service.
 *
 * Phase 2 work (P2-006) fleshes this out with auth, validation,
 * idempotency, cursor pagination, and event emission. This skeleton
 * exposes the public method signatures so the controller can compile
 * and integration tests can exercise the path.
 */
@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCreator): Promise<Creator> {
    const data = CreateCreatorSchema.parse(input);
    const username = data.username;

    const existing = await this.prisma.creator.findUnique({ where: { username } });
    if (existing) {
      // Idempotent: return the existing Creator.
      return existing;
    }

    return this.prisma.creator.create({
      data: {
        username,
        email: data.email,
        name: data.name,
        bio: data.bio ?? null,
        avatarUrl: data.avatarUrl ?? null,
      },
    });
  }

  async findById(id: string): Promise<Creator | null> {
    return this.prisma.creator.findUnique({ where: { id } });
  }

  async list(opts: { limit: number; cursor?: string }): Promise<Creator[]> {
    return this.prisma.creator.findMany({
      take: opts.limit,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });
  }
}