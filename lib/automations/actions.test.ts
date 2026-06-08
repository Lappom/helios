import { describe, expect, it } from "vitest";
import { previewAction } from "./actions";
import type { AutomationActionDetail } from "./types";

describe("previewAction", () => {
  it("requires client for assign_program", async () => {
    const action: AutomationActionDetail = {
      id: "a1",
      sortOrder: 0,
      actionType: "assign_program",
      actionConfig: { programId: "missing" },
    };

    const preview = await previewAction(action, {
      organizationId: "org_test",
      clientId: null,
      coachClerkUserId: "coach_1",
      planTier: "BUSINESS",
      automationId: "auto_1",
      executionId: "exec_1",
      dryRun: true,
    });

    expect(preview.valid).toBe(false);
    expect(preview.message).toContain("client");
  });
});
