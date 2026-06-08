import { previewAction } from "./actions";
import { getAutomationTree } from "./service";
import type { AutomationTestResult } from "./types";
import type { TestAutomationInput } from "@/lib/validators/automations";
import { resolveCoachClerkUserId } from "./service";

export async function testAutomation(
  organizationId: string,
  automationId: string,
  coachClerkUserId: string,
  input: TestAutomationInput,
): Promise<AutomationTestResult> {
  const tree = await getAutomationTree(organizationId, automationId);
  const resolvedCoachId = await resolveCoachClerkUserId(
    organizationId,
    coachClerkUserId,
  );

  const previews = await Promise.all(
    tree.actions.map((action) =>
      previewAction(action, {
        organizationId,
        clientId: input.clientId ?? null,
        coachClerkUserId: resolvedCoachId,
        planTier: "BUSINESS",
        automationId,
        executionId: "dry-run",
        dryRun: true,
      }),
    ),
  );

  return {
    automationId,
    clientId: input.clientId ?? null,
    previews,
  };
}
