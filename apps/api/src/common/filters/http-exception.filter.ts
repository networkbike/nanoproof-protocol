import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException ? exception.getResponse() : { message: "Internal server error" };

    const code =
      typeof payload === "object" && payload !== null && "code" in payload
        ? String((payload as Record<string, unknown>).code)
        : this.statusToCode(status);

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} → ${status}`, exception as Error);
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status}: ${code}`);
    }

    response.status(status).json({
      code,
      message:
        typeof payload === "object" && payload !== null && "message" in payload
          ? (payload as Record<string, unknown>).message
          : payload,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private statusToCode(status: number): string {
    if (status === 404) return "NP_NOT_FOUND";
    if (status === 401) return "NP_AUTH_FAILED";
    if (status === 403) return "NP_FORBIDDEN";
    if (status === 429) return "NP_RATE_LIMITED";
    if (status >= 500) return "NP_INTERNAL_ERROR";
    return "NP_VALIDATION_FAILED";
  }
}