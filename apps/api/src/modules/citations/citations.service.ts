import { Injectable, Logger } from "@nestjs/common";
import type { Citation } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CitationsDetector } from "./citations.detector.js";

/**
 * Citations service — orchestration over the detector + reads.
 */
@Injectable()
export class CitationsService {
  private readonly logger = new Logger(CitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly detector: CitationsDetector,
  ) {}

  detect(input: { responseId: string; responseText: string }) {
    return this.detector.detect(input);
  }

  async listByCreator(creatorId: string): Promise<Citation[]> {
    return this.prisma.citation.findMany({
      where: { source: { creatorId } },
      orderBy: { recordedAt: "desc" },
      include: { source: { select: { title: true, url: true, domain: true } } },
    });
  }

  async listByResponseId(responseId: string): Promise<Citation[]> {
    return this.prisma.citation.findMany({
      where: { responseId },
      orderBy: { recordedAt: "asc" },
      include: { source: { select: { title: true, url: true, domain: true } } },
    });
  }

  async findSourceUrl(id: string): Promise<string | null> {
    const s = await this.prisma.source.findUnique({ where: { id }, select: { url: true } });
    return s?.url ?? null;
  }
}
