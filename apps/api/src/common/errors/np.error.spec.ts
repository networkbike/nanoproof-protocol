import { describe, it, expect } from "vitest";
import { HttpStatus } from "@nestjs/common";
import { NPError } from "./np.error.js";
import { NPErrorStatus } from "@nanoproof/shared/errors";

describe("NPError", () => {
  it("maps NP_CREATOR_NOT_FOUND to 404", () => {
    const err = new NPError("NP_CREATOR_NOT_FOUND", { params: { id: "cr_x" } });
    expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(err.code).toBe("NP_CREATOR_NOT_FOUND");
  });

  it("uses NPErrorStatus for every NP_* code", () => {
    for (const [code, status] of Object.entries(NPErrorStatus) as [string, number][]) {
      const err = new (NPError as unknown as new (c: string) => NPError)(code);
      expect(err.getStatus()).toBe(status);
    }
  });

  it("includes the params in the body", () => {
    const err = new NPError("NP_USERNAME_TAKEN", { params: { username: "alice" } });
    const body = err.getResponse() as Record<string, unknown>;
    expect(body.code).toBe("NP_USERNAME_TAKEN");
    expect(body.params).toEqual({ username: "alice" });
  });
});
