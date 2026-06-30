import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { type Request, type Response } from "express";
import { type NPErrorCode, NPErrorStatus } from "@nanoproof/shared/errors";

/**
 * Global filter — every error response is shaped like an NP_* envelope:
 *   { code, message, path, timestamp, details? }
 *
 * Switch by `code` (stable), never by `message` (i18n-unsafe).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details, rawBody } = this.parseException(exception);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status} ${code}: ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status} ${code}: ${message}`);
    }

    response.status(status).json({
      code,
      message,
      ...(details ? { details } : {}),
      ...(rawBody ? { rawBody } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private parseException(
    exception: unknown,
  ): { status: number; code: NPErrorCode | string; message: string; details?: unknown; rawBody?: unknown } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // NPError payloads carry { code, message, params }.
      if (
        typeof body === "object" &&
        body !== null &&
        "code" in body &&
        typeof (body as { code?: unknown }).code === "string"
      ) {
        const code = (body as { code: string }).code as NPErrorCode;
        const message =
          (body as { message?: string }).message ?? exception.message;
        const params = (body as { params?: unknown }).params;
        const details = params ? { params } : undefined;
        const verifiedStatus = NPErrorStatus[code] ?? status;
        return { status: verifiedStatus, code, message, details };
      }

      // Fallback for HttpException that we didn't construct — synthesize a code.
      const fallback: NPErrorCode = this.fallbackCodeForStatus(status);
      return {
        status,
        code: fallback,
        message:
          typeof body === "object" && body !== null && "message" in body
            ? String((body as { message?: unknown }).message)
            : exception.message,
        rawBody: typeof body === "object" ? body : String(body),
      };
    }

    // Unknown — treated as 500.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "NP_INTERNAL_ERROR",
      message: exception instanceof Error ? exception.message : "Internal server error",
    };
  }

  private fallbackCodeForStatus(status: number): NPErrorCode {
    if (status === HttpStatus.NOT_FOUND) return "NP_NOT_FOUND";
    if (status === HttpStatus.UNAUTHORIZED) return "NP_AUTH_FAILED";
    if (status === HttpStatus.FORBIDDEN) return "NP_FORBIDDEN";
    if (status === HttpStatus.TOO_MANY_REQUESTS) return "NP_RATE_LIMITED";
    if (status === HttpStatus.UNPROCESSABLE_ENTITY) return "NP_VALIDATION_FAILED";
    return "NP_INTERNAL_ERROR";
  }
}
