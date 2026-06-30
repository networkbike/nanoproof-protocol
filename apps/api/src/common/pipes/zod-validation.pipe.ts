import { PipeTransform, Injectable } from "@nestjs/common";
import { ZodError, ZodTypeAny, type z } from "zod";
import { NPError } from "../errors/np.error.js";

/**
 * Validates a request body / query / params against a Zod schema.
 *
 * Usage:
 *   @Body(new ZodValidationPipe(CreateCreatorSchema))
 *   create(@Body() dto: CreateCreator) { ... }
 *
 * Throws NP_VALIDATION_FAILED with structured `details.params.zodIssues`.
 */
@Injectable()
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform<unknown, z.infer<T>> {
  constructor(
    private readonly schema: T,
    private readonly target: "body" | "query" | "params" = "body",
  ) {}

  transform(value: unknown): z.infer<T> {
    if (value === undefined || value === null) {
      if (this.target === "query") return value as z.infer<T>;
      throw new NPError("NP_VALIDATION_FAILED", {
        message: `Missing ${this.target}.`,
      });
    }
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new NPError("NP_VALIDATION_FAILED", {
          message: `Invalid ${this.target}.`,
          params: { target: this.target, issues: err.issues },
        });
      }
      throw err;
    }
  }
}
