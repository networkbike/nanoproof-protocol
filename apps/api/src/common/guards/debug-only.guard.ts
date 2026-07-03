/**
 * DebugOnlyGuard — block all /debug/* endpoints unless
 * NANOPROOF_DEBUG_ENDPOINTS=true is set in the environment.
 *
 * Applied per-route via @UseGuards(DebugOnlyGuard) on the controller or
 * specific method. If the env var is unset (production default), this guard
 * returns 404 — attackers can't even probe the endpoints.
 *
 * For the Lepton demo, set NANOPROOF_DEBUG_ENDPOINTS=true on the Railway
 * service. After the demo, leave it unset (or remove the env var entirely).
 */

import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Request, Response } from "express";

@Injectable()
export class DebugOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const enabled = process.env.NANOPROOF_DEBUG_ENDPOINTS === "true";
    if (enabled) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    res.status(404).json({
      code: "NP_NOT_FOUND",
      message: "Not Found",
      path: req.url,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}
/* 20260703T143522Z */
