import { describe, expect, it } from "vitest";
import { createId } from "./id";

describe("createId", () => {
  it("generates unique ids", () => {
    const a = createId();
    const b = createId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });
});
