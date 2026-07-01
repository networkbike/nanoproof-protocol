import { Injectable, Logger } from "@nestjs/common";
import type { Citation, Source } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import { extractLinks, normalizeUrl, type ExtractedLink } from "./url-extractor.js";

export interface DetectResult {
  responseId: string;
  citations: Citation[];
  unresolved: ExtractedLink[];
  totalUsdc: string;
  resolvedCreatorIds: string[];
}

/**
 * Phase 3 thin-slice detector.
 *
 * Goal — accept an agent's response text, find every URL inside it,
 * and for every URL that matches a registered Source(domain) record a
 * real Citation row tied to the Source + Creator.
 *
 * Algorithm (simplified — the full Citation Engine has 10 stages; this
 * thin slice implements stages 1-4 + 9):
 *   1. Discovery:    URL_REGEX sweep
 *   2. Normalization: lowercase host, strip utm_*
 *   3. Matching:     Source.domain equality (and Source.url exact)
 *   4. Scoring:      1.0 on direct URL hit; 0.6 on domain-only hit
 *   5. Quoting:      240-char preceding-text window as snippet
 *   6. Recording:    Citation row with append-only trigger
 *
 * Not implemented in this slice (stubs left for Phase 3 full):
 *   - fingerprint matching for quoted-but-not-linked citations
 *   - fraud signal analysis
 *   - evidence pinning
 */
@Injectable()
export class CitationsDetector {
  private readonly logger = new Logger(CitationsDetector.name);

  constructor(private readonly prisma: PrismaService) {}

  async detect(input: { responseId: string; responseText: string }): Promise<DetectResult> {
    const links = extractLinks(input.responseText);
    if (links.length === 0) {
      return {
        responseId: input.responseId,
        citations: [],
        unresolved: [],
        totalUsdc: "0",
        resolvedCreatorIds: [],
      };
    }

    // Build lookup maps for all candidate Sources (bounded: open to a creator-count cap later).
    const sources = await this.prisma.source.findMany({
      where: { status: { in: ["ACTIVE", "PAUSED"] } },
      include: { creator: { select: { id: true, username: true, name: true } } },
    });

    const byDomain = new Map<string, Source[]>();
    const byUrl = new Map<string, Source>();
    for (const s of sources) {
      const arr = byDomain.get(s.domain) ?? [];
      arr.push(s);
      byDomain.set(s.domain, arr);
      byUrl.set(s.url.replace(/\/$/, ""), s);
    }

    const resolved: Citation[] = [];
    const unresolved: ExtractedLink[] = [];
    const creatorIds = new Set<string>();
    let totalAtomic = 0n;

    for (const link of links) {
      const norm = normalizeUrl(link.url);
      if (!norm.domain) {
        unresolved.push(link);
        continue;
      }

      // Exact URL match first.
      let match = byUrl.get(norm.full);
      let matchKind: "URL" | "DOMAIN" = "URL";
      let matchScore = "1.0000";

      if (!match) {
        // Fall back to domain match — pick the Source whose url has the longest shared prefix.
        const candidates = byDomain.get(norm.domain) ?? [];
        if (candidates.length === 1) {
          match = candidates[0];
          matchKind = "DOMAIN";
          matchScore = "0.6000";
        } else if (candidates.length > 1) {
          // Tie-break: longest shared path prefix wins.
          match = candidates.sort(
            (a, b) => b.url.length - a.url.length,
          )[0];
          matchKind = "DOMAIN";
          matchScore = "0.6000";
        }
      }

      if (!match || match.status === "ARCHIVED" || match.status === "REJECTED") {
        unresolved.push(link);
        continue;
      }

      // Atomic-USDC payout = source.citationPrice (string)
      const price = BigInt(match.citationPrice);
      totalAtomic += price;
      creatorIds.add(match.creatorId);

      const citation = await this.prisma.citation.create({
        data: {
          sourceId: match.id,
          responseId: input.responseId,
          snippet: link.snippet,
          kind: "DIRECT",
          matchKind,
          matchScore,
          confidence: matchScore,
          contributionFraction: "1.0000",
          payoutAmountUsdc: price.toString(),
          status: "PENDING",
        },
      });
      resolved.push(citation);

      this.logger.log(
        `Citation resolved: ${link.url} → source ${match.id} (${matchKind}, score=${matchScore})`,
      );
    }

    return {
      responseId: input.responseId,
      citations: resolved,
      unresolved,
      totalUsdc: totalAtomic.toString(),
      resolvedCreatorIds: Array.from(creatorIds),
    };
  }
}
