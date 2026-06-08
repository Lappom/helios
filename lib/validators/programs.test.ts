import { describe, expect, it } from "vitest";
import {
  createBlockSchema,
  createProgramSchema,
  patchBlockExerciseSchema,
  reorderSchema,
} from "./programs";

describe("programs validators", () => {
  it("accepts valid program creation", () => {
    const result = createProgramSchema.safeParse({ name: "PPL 3 jours" });
    expect(result.success).toBe(true);
  });

  it("requires exerciseId for single blocks", () => {
    const result = createBlockSchema.safeParse({ type: "single" });
    expect(result.success).toBe(false);
  });

  it("accepts circuit block config", () => {
    const result = createBlockSchema.safeParse({
      type: "circuit",
      exerciseId: "ex_123",
      rounds: 4,
    });
    expect(result.success).toBe(true);
  });

  it("validates prescription patch payload", () => {
    const result = patchBlockExerciseSchema.safeParse({
      prescriptions: [
        {
          setNumber: 1,
          reps: "10",
          restSeconds: 90,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("validates reorder ids", () => {
    const result = reorderSchema.safeParse({ ids: ["a", "b"] });
    expect(result.success).toBe(true);
  });
});
