import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { Observable, from, of, switchMap } from "rxjs";
import { tap } from "rxjs/operators";
import type { Request, Response } from "express";
import { PrismaService } from "../../prisma/prisma.service.js";
import { NPError } from "../errors/np.error.js";

const HEADER = "idempotency-key";
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CacheRow {
  key: string;
  requestHash: string;
  responseStatus: number | null;
  responseBody: unknown;
  state: string;
  expiresAt: Date;
}

/**
 * Idempotency interceptor — wraps any POST/DELETE/PUT that carries
 * `Idempotency-Key: <uuid>`. Subsequent requests with the same key
 * replay the cached response for 24h.
 *
 * P2-017. Persists to the `idempotency_keys` table so replays survive
 * a process restart (vs. Redis-only).
 *
 * Concurrency: while a request is IN_FLIGHT, replay requests get 409.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const key = (req.headers[HEADER] ?? req.headers[HEADER.toUpperCase()]) as string | undefined;

    if (!key) return next.handle();

    if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: "Invalid Idempotency-Key (must be 8-128 url-safe chars).",
        params: { field: "Idempotency-Key" },
      });
    }

    const method = req.method.toUpperCase();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return next.handle();
    }

    const requestHash = createHash("sha256")
      .update(`${method}\n${req.originalUrl}\n${JSON.stringify(req.body ?? {})}`)
      .digest("hex");

    const expiresAt = new Date(Date.now() + TTL_MS);

    return from(this.handleExisting(key, requestHash, req, res)).pipe(
      switchMap((cached) => (cached ? of(cached) : this.persistAndRun(key, requestHash, req, res, next))),
    );
  }

  private async handleExisting(
    key: string,
    requestHash: string,
    req: Request,
    res: Response,
  ): Promise<unknown | null> {
    const existing = (await this.prisma.idempotencyKey.findUnique({ where: { key } })) as CacheRow | null;
    if (!existing || existing.expiresAt < new Date()) return null;

    if (existing.requestHash !== requestHash) {
      throw new NPError("NP_VALIDATION_FAILED", {
        message: "Idempotency-Key reused with a different request body.",
        params: { key },
      });
    }

    if (existing.state === "IN_FLIGHT") {
      throw new NPError("NP_RATE_LIMITED", {
        message: "Original request still in flight.",
        params: { key },
      });
    }

    if (existing.responseStatus !== null && existing.responseBody !== null) {
      res.setHeader("Idempotency-Replay", "true");
      res.status(existing.responseStatus).json(existing.responseBody);
      return existing.responseBody;
    }

    return null;
  }

  private persistAndRun(
    key: string,
    requestHash: string,
    req: Request,
    res: Response,
    next: CallHandler,
  ): Observable<unknown> {
    const method = req.method.toUpperCase();
    const path = req.originalUrl;

    return from(
      this.prisma.idempotencyKey.create({
        data: {
          key,
          method,
          path,
          requestHash,
          state: "IN_FLIGHT",
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      }),
    ).pipe(
      switchMap(() => next.handle()),
      tap({
        next: (body) => {
          void this.prisma.idempotencyKey
            .update({
              where: { key },
              data: {
                state: "COMPLETED",
                responseStatus: res.statusCode,
                responseBody: body as object,
                completedAt: new Date(),
              },
            })
            .catch((err) => this.logger.error(`Failed to cache idempotency ${key}: ${err.message}`));
        },
        error: (err) => {
          void this.prisma.idempotencyKey
            .update({
              where: { key },
              data: { state: "FAILED" },
            })
            .catch((e) => this.logger.error(`Failed to mark idempotency ${key} failed: ${e.message}`));
          throw err;
        },
      }),
    );
  }
}
