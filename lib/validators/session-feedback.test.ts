import { describe, expect, it } from "vitest";
import { submitSessionFeedbackSchema } from "./session-feedback";

describe("submitSessionFeedbackSchema", () => {
  it("accepts valid feedback payload", () => {
    const result = submitSessionFeedbackSchema.safeParse({
      feeling: 8,
      difficulty: 7,
      fatigue: 6,
      motivation: 9,
      painReported: false,
      comment: "Great session",
      customResponses: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects scale out of range", () => {
    const result = submitSessionFeedbackSchema.safeParse({
      feeling: 11,
      difficulty: 7,
      fatigue: 6,
      motivation: 9,
      painReported: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts pain details when pain reported", () => {
    const result = submitSessionFeedbackSchema.safeParse({
      feeling: 4,
      difficulty: 8,
      fatigue: 9,
      motivation: 5,
      painReported: true,
      painDetails: "Douleur genou droit",
    });
    expect(result.success).toBe(true);
  });
});
