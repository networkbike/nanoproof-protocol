import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { Source } from "@prisma/client";

/**
 * MVP sources service.
 *
 * Phase 2 P2-011 implements URL/domain derivation, list filters,
 * status lifecycle, and (P2-012) DNS/HTML/file verification.
 */
@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: { creatorId: string; url: string; title: string; description?: string }): Promise<Source> {
    const domain = new URL(input.url).hostname.replace(/^www\./, "");
    return this.prisma.source.create({
      data: {
        creatorId: input.creatorId,
        url: input.url,
        domain,
        title: input.title,
        ...(input.description ? { description: input.description } : {}),
        status: "ACTIVE",
      },
    });
  }

  async listByCreator(creatorId: string): Promise<Source[]> {
    return this.prisma.source.findMany({ where: { creatorId }, orderBy: { createdAt: "desc" } });
  }

  async findById(id: string): Promise<Source | null> {
    return this.prisma.source.findUnique({ where: { id } });
  }
}