import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/lib/api/response";
import { assertEraseEmailConfirmation } from "./service";

describe("assertEraseEmailConfirmation", () => {
  it("accepts matching emails case-insensitively", () => {
    expect(() =>
      assertEraseEmailConfirmation("Client@Example.com", "client@example.com"),
    ).not.toThrow();
  });

  it("rejects mismatched emails", () => {
    expect(() =>
      assertEraseEmailConfirmation("a@example.com", "b@example.com"),
    ).toThrow(ApiProblemError);
  });
});
