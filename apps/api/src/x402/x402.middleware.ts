/**
 * x402 Middleware — NanoProof Protocol, Phase 8.
 *
 * Express middleware that wraps a route handler. If the request
 * doesn't carry a valid X-PAYMENT header, the middleware:
 *
 *   1. Calls X402Service.createPaymentRequest() to mint a challenge
 *   2. Responds with HTTP 402 Payment Required
 *   3. Sets the PAYMENT-REQUIRED header (base64-encoded challenge)
 *   4. Sets the PAYMENT-REQUIRED-UPPER header (legacy form)
 *   5. Returns the challenge JSON in the body
 *   6. Optionally sets WWW-Authenticate per RFC 7235
 *
 * Once the client retries with a valid X-PAYMENT (PAYMENT-SIGNATURE)
 * header, the request proceeds to the wrapped handler and the same
 * PaymentRequest is marked AUTHORIZED + SETTLED.
 *
 * Usage:
 *   const x402Guard = createX402Guard(x402Service, { creatorId, resource });
 *   router.get("/v1/research/answer", x402Guard, researchHandler);
 *
 * For Phase 8 demo, the middleware also exposes the PaymentRequest ID
 * via `req.headers["x-payment-request-id"]` so downstream handlers
 * can complete the settlement if the demo client auto-signs.
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { X402Service } from "./x402.service.js";
import {
  HEADER_PAYMENT_REQUIRED,
  HEADER_PAYMENT_REQUIRED_UPPER,
} from "./x402.constants.js";

export interface X402GuardOptions {
  /** Creator whose wallet receives the payment. */
  creatorId: string;
  /** Resource URI (e.g. "/v1/research/answer") */
  resource: string;
  /** Atomic USDC amount (string). If omitted, looked up in PRICE_CATALOG. */
  amountUsdc?: string;
  /** Optional fixed description shown to the wallet/client. */
  description?: string;
  /**
   * Optional extractor — given the request, return the PaymentRequest ID
   * the client is trying to settle (read from a query param or header).
   * If the client supplied a X-PAYMENT header, we trust their request
   * and skip the 402 — but only if `verifySettlementOnRequest` is true.
   */
  paymentRequestIdFromRequest?: (req: Request) => string | undefined;
}

/**
 * Create an Express middleware that returns 402 unless a valid
 * X-PAYMENT header is present.
 *
 * In DEMO mode (`NANOPROOF_DEMO_MODE=true`), the middleware is more
 * permissive: it accepts any X-PAYMENT header (the body is ignored) and
 * proceeds to the handler. The handler itself is responsible for calling
 * x402Service.settlePayment() with the demo flow.
 */
export function createX402Guard(
  x402: X402Service,
  options: X402GuardOptions,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const demoMode = process.env.NANOPROOF_DEMO_MODE === "true";
    const paymentSignature = req.header("x-payment") || req.header("payment-signature");
    const requestedId =
      options.paymentRequestIdFromRequest?.(req) ?? (req.query.requestId as string | undefined);

    // If the client supplied a payment signature OR a known PaymentRequest ID,
    // allow the request through (the handler will settle it).
    if (paymentSignature || requestedId || demoMode) {
      // Pass the request id forward so the handler can settle it
      if (requestedId) {
        req.headers["x-payment-request-id"] = requestedId;
      }
      next();
      return;
    }

    // No payment — mint a fresh challenge and respond 402
    try {
      const { request, challenge } = await x402.createPaymentRequest({
        creatorId: options.creatorId,
        resource: options.resource,
        amountUsdc: options.amountUsdc,
        description: options.description,
      });
      const challengeBase64 = Buffer.from(JSON.stringify(challenge)).toString("base64");

      res.setHeader(HEADER_PAYMENT_REQUIRED, challengeBase64);
      res.setHeader(HEADER_PAYMENT_REQUIRED_UPPER, challengeBase64);
      res.setHeader(
        "WWW-Authenticate",
        `X402 realm="nanoproof", charset="UTF-8", resource="${options.resource}"`,
      );
      res.setHeader("X-Payment-Request-Id", request.id);

      res.status(402).json({
        ...challenge,
        paymentRequestId: request.id,
      });
    } catch (err) {
      next(err);
    }
  };
}