import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { Citation } from "@prisma/client";

/**
 * MVP citations service.
 *
 * Phase 3 (P3-001) replaces this with the full 10-stage pipeline
 * (Discovery → Normalization → Matching → Extraction → Classification →
 * Scoring → Resolution → Quoting → Recording → Receipt).
 *
 * This skeleton simulates a citation by attaching it to a Source
 * with a 1.0 match score so the rest of the MVP can be demoed.
 */
@Injectable()
export class CitationsService {
  private readonly logger = new Logger(CitationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async simulate(input: { sourceId: string; snippet: string; responseId: string }): Promise<Citation> {
    const source = await this.prisma.source.findUniqueOrThrow({ where: { id: input.sourceId } });

    return this.prisma.citation.create({
      data: {
        sourceId: source.id,
        responseId: input.responseId,
        snippet: input.snippet,
        kind: "DIRECT",
        matchScore: "1.0000",
        confidence: "1.00",
        contributionFraction: "1.0000",
        payoutAmountUsdc: "1000", // $0.001
      },
    });
  }

  async listByCreator(creatorId: string): Promise<Citation[]> {
    return this.prisma.citation.findMany({
      where: { source: { creatorId } },
      orderBy: { recordedAt: "desc" },
    });
  }
}