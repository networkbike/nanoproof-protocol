import { Injectable, Logger } from "@nestjs/common";
import type { Source, SourceVerification, SourceVerificationMethod } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CreateSourceSchema, ListSourcesQuerySchema, type CreateSource } from "@nanoproof/shared/schemas/source.js";
import { NPError } from "../../common/errors/np.error.js";
import { SourcesVerifier } from "./sources.verifier.js";

const DENIED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254", // AWS metadata
  "metadata.google.internal",
]);

export interface SourceListOptions {
  creatorId: string;
  limit: number;
  cursor?: string;
  status?: string;
  q?: string;
}

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verifier: SourcesVerifier,
  ) {}

  async create(input: CreateSource): Promise<Source> {
    const data = CreateSourceSchema.parse(input);

    const url = new URL(data.url);
    if (url.protocol !== "https:") {
      throw new NPError("NP_DENIED_HOST", { message: "Source URL must be HTTPS." });
    }
    const domain = url.hostname.replace(/^www\./, "");
    if (DENIED_HOSTS.has(domain) || /^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(domain)) {
      throw new NPError("NP_DENIED_HOST", { params: { host: domain } });
    }

    const exists = await this.prisma.source.findUnique({
      where: { creatorId_url: { creatorId: data.creatorId, url: data.url } },
    });
    if (exists) {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: "Source already registered.",
        params: { url: data.url },
      });
    }

    const source = await this.prisma.source.create({
      data: {
        creatorId: data.creatorId,
        url: data.url,
        domain,
        title: data.title,
        description: data.description ?? null,
        citationPrice: data.citationPrice,
        minPayout: data.minPayout,
        ...(data.periodCap ? { periodCap: data.periodCap } : {}),
        license: data.license,
        status: "PENDING_VERIFICATION",
      },
    });

    this.logger.log(`Source registered: ${source.url} (${source.id})`);
    return source;
  }

  async list(opts: SourceListOptions): Promise<{ data: Source[]; nextCursor: string | null }> {
    ListSourcesQuerySchema.parse(opts);
    const take = Math.min(Math.max(opts.limit, 1), 100);
    const where: Record<string, unknown> = { creatorId: opts.creatorId };
    if (opts.status) where.status = opts.status;
    if (opts.q) {
      where.OR = [
        { url: { contains: opts.q, mode: "insensitive" } },
        { title: { contains: opts.q, mode: "insensitive" } },
        { domain: { contains: opts.q, mode: "insensitive" } },
      ];
    }
    const rows = await this.prisma.source.findMany({
      where,
      take: take + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    const hasMore = rows.length > take;
    return { data: hasMore ? rows.slice(0, take) : rows, nextCursor: hasMore ? rows[take - 1].id : null };
  }

  async findById(id: string): Promise<Source> {
    const source = await this.prisma.source.findUnique({ where: { id } });
    if (!source) throw new NPError("NP_SOURCE_NOT_FOUND");
    return source;
  }

  async startVerification(
    sourceId: string,
    method: SourceVerificationMethod,
  ): Promise<SourceVerification> {
    const source = await this.findById(sourceId);
    return this.verifier.start(source, method);
  }

  async runVerification(
    sourceId: string,
    method: SourceVerificationMethod,
  ): Promise<SourceVerification> {
    const source = await this.findById(sourceId);
    return this.verifier.verifyOne(source, method);
  }

  async listVerifications(sourceId: string): Promise<SourceVerification[]> {
    await this.findById(sourceId);
    return this.prisma.sourceVerification.findMany({
      where: { sourceId },
      orderBy: { createdAt: "desc" },
    });
  }

  async archive(sourceId: string, principalCreatorId: string): Promise<Source> {
    const source = await this.findById(sourceId);
    if (source.creatorId !== principalCreatorId) {
      throw new NPError("NP_FORBIDDEN");
    }
    return this.prisma.source.update({
      where: { id: sourceId },
      data: { archivedAt: new Date(), status: "ARCHIVED" },
    });
  }
}
