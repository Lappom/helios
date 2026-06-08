import { describe, expect, it } from "vitest";
import { detectCriticalResponses } from "./critical";

describe("detectCriticalResponses", () => {
  it("flags pain field when threshold exceeded", () => {
    const fields = [
      {
        id: "f1",
        label: "Douleur (0-10)",
        type: "number",
        config: { criticalWhen: { op: "gte" as const, value: 7 } },
      },
    ];

    const result = detectCriticalResponses(fields, [
      {
        fieldId: "f1",
        textValue: null,
        numberValue: 8,
        jsonValue: null,
      },
    ]);

    expect(result.hasCriticalAlert).toBe(true);
    expect(result.criticalSummary).toContain("Douleur");
  });

  it("returns no alert below threshold", () => {
    const fields = [
      {
        id: "f1",
        label: "Douleur (0-10)",
        type: "number",
        config: { criticalWhen: { op: "gte" as const, value: 7 } },
      },
    ];

    const result = detectCriticalResponses(fields, [
      {
        fieldId: "f1",
        textValue: null,
        numberValue: 3,
        jsonValue: null,
      },
    ]);

    expect(result.hasCriticalAlert).toBe(false);
    expect(result.criticalSummary).toBeNull();
  });
});
