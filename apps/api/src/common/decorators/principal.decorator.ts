import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Principal } from "./auth.decorators.js";

/**
 * `@CurrentPrincipal()` — extracts the Principal that the ApiKeyGuard
 * attached to the request.
 *
 * Throws NP_AUTH_FAILED if no guard ran (i.e. controllers that bypass
 * the guard but still try to read the principal).
 */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const req = ctx.switchToHttp().getRequest<{ principal?: Principal }>();
    if (!req.principal) throw new Error("CurrentPrincipal used without ApiKeyGuard");
    return req.principal;
  },
);
