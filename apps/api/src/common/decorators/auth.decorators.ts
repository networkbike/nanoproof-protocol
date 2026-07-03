import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiKeyScope } from "@prisma/client";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service.js";
import { NPError } from "../errors/np.error.js";

const IS_PUBLIC_KEY = "auth:isPublic";
const REQUIRED_SCOPES_KEY = "auth:scopes";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequireScopes = (...scopes: ApiKeyScope[]) => SetMetadata(REQUIRED_SCOPES_KEY, scopes);

export interface Principal {
  kind: "creator" | "organization" | "anonymous";
  id: string;
  apiKeyId: string;
  scopes: ApiKeyScope[];
  rateLimitPerMinute: number;
}

/**
 * Auth guard — attaches a Principal to the request if a valid
 * `Authorization: Bearer np_live_<prefix>.<secret>` is present.
 *
 * Endpoints are public by default; mark with `@Public()` to skip,
 * or `@RequireScopes(...)` to enforce a scope.
 *
 * Phase 2 ships the ApiKey strategy only. Clerk JWT validation lands
 * via a separate guard wired under P2-003 (deferred to keep fresh
 * clones runnable without external setup).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const requiredScopes = this.reflector.getAllAndOverride<ApiKeyScope[]>(REQUIRED_SCOPES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const req = ctx.switchToHttp().getRequest<Request & { principal?: Principal }>();
    req.principal = await this.authenticate(req);

    // Demo mode bypass: when NANOPROOF_DEMO_MODE=true, treat all requests
    // as authenticated with full scopes. This is the simplest way to
    // make the dashboard work end-to-end for the Lepton demo without
    // requiring every visitor to mint an API key.
    if (process.env.NANOPROOF_DEMO_MODE === "true") {
      req.principal = {
        kind: "organization",
        id: "demo-mode",
        apiKeyId: "demo-mode",
        scopes: [
          "READ_CITATIONS", "WRITE_CITATIONS",
          "READ_PAYMENTS", "WRITE_PAYMENTS",
          "ADMIN",
        ],
        rateLimitPerMinute: 10000,
      };
      return true;
    }

    if (isPublic) return true;

    const principal = req.principal!;
    if (principal.kind === "anonymous") {
      throw new NPError("NP_AUTH_FAILED", { message: "Missing or invalid API key." });
    }

    if (requiredScopes?.length) {
      const ok = requiredScopes.every((s) => principal.scopes.includes(s));
      if (!ok) {
        throw new NPError("NP_FORBIDDEN", {
          message: "Missing required scope.",
          params: { required: requiredScopes },
        });
      }
    }

    return true;
  }

  private async authenticate(req: Request): Promise<Principal> {
    const header = req.headers["authorization"];
    if (!header || !header.startsWith("Bearer ")) return anonymous();

    const token = header.slice("Bearer ".length).trim();
    const parts = token.split(".");
    if (parts.length !== 2) return anonymous();
    const [prefix, secret] = parts;
    if (!prefix.startsWith("np_")) return anonymous();

    const row = await this.prisma.apiKey.findUnique({ where: { prefix } });
    if (!row || !row.isActive) return anonymous();
    if (row.expiresAt && row.expiresAt < new Date()) return anonymous();

    const bcrypt = await import("bcryptjs");
    const ok = await bcrypt.compare(token, row.hash);
    if (!ok) return anonymous();

    // Fire-and-forget usage counters.
    void this.prisma.apiKey
      .update({
        where: { id: row.id },
        data: {
          lastUsedAt: new Date(),
          lastUsedIp: req.ip ?? null,
          callCount: { increment: 1n },
        },
      })
      .catch(() => undefined);

    const scopes = (row.scopes ?? []) as ApiKeyScope[];

    if (row.creatorId) {
      return {
        kind: "creator",
        id: row.creatorId,
        apiKeyId: row.id,
        scopes,
        rateLimitPerMinute: row.rateLimitPerMinute,
      };
    }
    if (row.organizationId) {
      return {
        kind: "organization",
        id: row.organizationId,
        apiKeyId: row.id,
        scopes,
        rateLimitPerMinute: row.rateLimitPerMinute,
      };
    }
    return anonymous();
  }
}

function anonymous(): Principal {
  return { kind: "anonymous", id: "", apiKeyId: "", scopes: [], rateLimitPerMinute: 60 };
}


/**
 * DebugOnly — only enables the route when NANOPROOF_DEBUG_ENDPOINTS=true.
 * Use on /debug/* endpoints to ensure they're never exposed in production.
 *
 *   @DebugOnly()
 *   @Get("debug/tables")
 *   async debugTables() { ... }
 */
export const DEBUG_ENDPOINTS_KEY = "debug:endpoints";
export const DebugOnly = () => SetMetadata(DEBUG_ENDPOINTS_KEY, true);
