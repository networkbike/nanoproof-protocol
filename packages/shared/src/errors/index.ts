import { z } from "zod";

/**
 * NP_* error catalog — every error the protocol can emit carries one of these
 * stable codes. The HTTP status mapping is conventional; consumers should
 * switch on `code`, not `message` or `status`.
 */

export const NPErrorCode = z.enum([
  // Generic
  "NP_VALIDATION_FAILED",
  "NP_AUTH_FAILED",
  "NP_FORBIDDEN",
  "NP_NOT_FOUND",
  "NP_RATE_LIMITED",
  "NP_INTERNAL_ERROR",

  // Creator
  "NP_CREATOR_NOT_FOUND",
  "NP_USERNAME_TAKEN",
  "NP_USERNAME_RESERVED",
  "NP_EMAIL_TAKEN",
  "NP_INVALID_AVATAR_URL",

  // Wallet
  "NP_WALLET_NOT_FOUND",
  "NP_INVALID_ADDRESS",

  // Source
  "NP_SOURCE_NOT_FOUND",
  "NP_DENIED_HOST",

  // Citation
  "NP_CITATION_NOT_FOUND",

  // Payment
  "NP_PAYMENT_NOT_FOUND",
]);
export type NPErrorCode = z.infer<typeof NPErrorCode>;

export const NPErrorBodySchema = z.object({
  code: NPErrorCode,
  message: z.string(),
  path: z.string().optional(),
  timestamp: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
export type NPErrorBody = z.infer<typeof NPErrorBodySchema>;

export const NPErrorStatus: Record<NPErrorCode, number> = {
  NP_VALIDATION_FAILED: 422,
  NP_AUTH_FAILED: 401,
  NP_FORBIDDEN: 403,
  NP_NOT_FOUND: 404,
  NP_RATE_LIMITED: 429,
  NP_INTERNAL_ERROR: 500,
  NP_CREATOR_NOT_FOUND: 404,
  NP_USERNAME_TAKEN: 409,
  NP_USERNAME_RESERVED: 422,
  NP_EMAIL_TAKEN: 409,
  NP_INVALID_AVATAR_URL: 422,
  NP_WALLET_NOT_FOUND: 404,
  NP_INVALID_ADDRESS: 422,
  NP_SOURCE_NOT_FOUND: 404,
  NP_DENIED_HOST: 422,
  NP_CITATION_NOT_FOUND: 404,
  NP_PAYMENT_NOT_FOUND: 404,
};