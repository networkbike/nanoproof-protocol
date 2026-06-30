import { HttpException, HttpStatus } from "@nestjs/common";
import { type NPErrorCode, NPErrorStatus } from "@nanoproof/shared/errors";

/**
 * Base for every protocol-level error.
 *
 * The HttpException filter reads `code` and `status` and emits the
 * canonical NP_* error envelope.
 *
 * Throwing from a service:
 *   throw new NPError("NP_CREATOR_NOT_FOUND", { params: { id } });
 *
 * Nest will surface the response as:
 *   { code: "NP_CREATOR_NOT_FOUND", message, path, timestamp, details }
 */
export class NPError extends HttpException {
  public readonly code: NPErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: NPErrorCode,
    init?: { message?: string; params?: Record<string, unknown>; cause?: unknown },
  ) {
    const status = NPErrorStatus[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      init?.message ?? humanize(code, init?.params ?? {});
    super({ code, message, params: init?.params }, status);
    this.code = code;
    this.name = "NPError";
    if (init?.cause !== undefined) {
      (this as unknown as { cause: unknown }).cause = init.cause;
    }
    if (init?.params) this.details = { params: init.params };
  }
}

/** Human-friendly defaults — the SDK / docs section will list all of these. */
function humanize(code: NPErrorCode, params: Record<string, unknown>): string {
  switch (code) {
    case "NP_VALIDATION_FAILED":     return "Request failed schema validation.";
    case "NP_AUTH_FAILED":           return "Authentication required.";
    case "NP_FORBIDDEN":             return "Insufficient privileges.";
    case "NP_NOT_FOUND":             return "Resource not found.";
    case "NP_RATE_LIMITED":          return "Too many requests. Slow down.";
    case "NP_INTERNAL_ERROR":        return "Internal server error.";
    case "NP_CREATOR_NOT_FOUND":     return `Creator '${params.id ?? "?"}' not found.`;
    case "NP_USERNAME_TAKEN":        return `Username '${params.username ?? "?"}' is taken.`;
    case "NP_USERNAME_RESERVED":     return `Username '${params.username ?? "?"}' is reserved.`;
    case "NP_EMAIL_TAKEN":           return "Email already registered.";
    case "NP_INVALID_AVATAR_URL":    return "Avatar URL must be HTTPS.";
    case "NP_WALLET_NOT_FOUND":      return `Wallet not found.`;
    case "NP_INVALID_ADDRESS":       return "Invalid EVM address.";
    case "NP_SOURCE_NOT_FOUND":      return `Source not found.`;
    case "NP_DENIED_HOST":           return "Source host is not allowed.";
    case "NP_CITATION_NOT_FOUND":    return "Citation not found.";
    case "NP_PAYMENT_NOT_FOUND":     return "Payment not found.";
    default:                         return code;
  }
}
