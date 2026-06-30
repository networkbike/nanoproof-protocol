import { Injectable, Logger } from "@nestjs/common";
import { promises as dns } from "node:dns";
import { createHash } from "node:crypto";
import type { Source, SourceVerification } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import { NPError } from "../../common/errors/np.error.js";

/**
 * Source verification (P2-012).
 *
 * Three methods:
 *   - DNS_TXT   → creator publishes a `_nanoproof-challenge.<domain>` TXT record
 *                  with the verification token, then we `dig` it.
 *   - HTML_META → creator publishes `<meta name="nanoproof-verification" content="<token>">`
 *                  in the page head. We GET the URL and parse the HTML.
 *   - FILE      → creator uploads `/.well-known/nanoproof-<token>.txt`. We GET it.
 *
 * All three are implemented as `verifyOne(source, method)` that returns
 * the new SourceVerification row. The first SUCCESS flips Source.status
 * to ACTIVE and stamps verifiedAt.
 */
@Injectable()
export class SourcesVerifier {
  private readonly logger = new Logger(SourcesVerifier.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Convenience — creates a SourceVerification with the expected token. */
  async start(source: Source, method: "DNS_TXT" | "HTML_META" | "FILE_UPLOAD" | "MANUAL"): Promise<SourceVerification> {
    const token = createHash("sha256")
      .update(`${source.id}:${source.creatorId}:${Date.now()}:${Math.random()}`)
      .digest("hex")
      .slice(0, 48);

    let expected = "";
    switch (method) {
      case "DNS_TXT":     expected = `nanoproof-challenge=${token}`; break;
      case "HTML_META":   expected = token; break;
      case "FILE_UPLOAD": expected = token; break;
      case "MANUAL":      expected = "manual-approval"; break;
    }

    return this.prisma.sourceVerification.create({
      data: {
        sourceId: source.id,
        method,
        status: "PENDING",
        token,
        expected,
      },
    });
  }

  async verifyOne(
    source: Source,
    method: "DNS_TXT" | "HTML_META" | "FILE_UPLOAD" | "MANUAL",
  ): Promise<SourceVerification> {
    const row = await this.prisma.sourceVerification.findFirst({
      where: { sourceId: source.id, method, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (!row) throw new NPError("NP_VALIDATION_FAILED", { message: "No pending challenge for this source." });

    let observed: string | null = null;
    let success = false;
    let failureReason: string | undefined;

    try {
      switch (method) {
        case "DNS_TXT":
          observed = await this.probeDns(source.domain);
          success = observed === row.expected;
          if (!success) failureReason = "DNS TXT record missing or mismatched";
          break;

        case "HTML_META":
          observed = await this.probeHtml(source.url, row.token);
          success = !!observed;
          if (!success) failureReason = "HTML <meta> tag missing";
          break;

        case "FILE_UPLOAD":
          observed = await this.probeFile(source.url, row.token);
          success = observed === row.token;
          if (!success) failureReason = "File not found at /.well-known/";
          break;

        case "MANUAL":
          success = false; // requires human action
          failureReason = "Manual approval pending";
          break;
      }
    } catch (err) {
      failureReason = (err as Error).message;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sourceVerification.update({
        where: { id: row.id },
        data: {
          status: success ? "VERIFIED" : "FAILED",
          observed,
          attempts: { increment: 1 },
          lastTriedAt: new Date(),
          ...(success ? { succeededAt: new Date() } : { failureReason }),
        },
      });

      if (success) {
        await tx.source.update({
          where: { id: source.id },
          data: { status: "ACTIVE", verifiedAt: new Date() },
        });
        this.logger.log(`Source verified: ${source.url} via ${method}`);
      }

      return updated;
    });
  }

  // ----- probers ---------------------------------------------------------

  private async probeDns(domain: string): Promise<string | null> {
    const host = `_nanoproof-challenge.${domain}`;
    try {
      const records = await dns.resolveTxt(host);
      // resolveTxt returns string[][] — flatten
      const flat = records.flat();
      return flat.find((r) => r.startsWith("nanoproof-challenge=")) ?? null;
    } catch {
      return null;
    }
  }

  private async probeHtml(url: string, token: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
      if (!res.ok) return null;
      const html = await res.text();
      // Match `<meta name="nanoproof-verification" content="<token>">`
      const re = new RegExp(
        `<meta[^>]+name=["']nanoproof-verification["'][^>]+content=["']${token}["']`,
        "i",
      );
      return re.test(html) ? token : null;
    } finally {
      clearTimeout(timer);
    }
  }

  private async probeFile(url: string, token: string): Promise<string | null> {
    const target = new URL(`/.well-known/nanoproof-${token}.txt`, url).toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetch(target, { signal: controller.signal });
      if (!res.ok) return null;
      const text = (await res.text()).trim();
      return text === token ? token : null;
    } finally {
      clearTimeout(timer);
    }
  }
}
