import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getAutomationIdFromPath } from "@/lib/api/automation-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { testAutomation } from "@/lib/automations/test";
import { parseJsonBody } from "@/lib/validators/clients";
import { testAutomationSchema } from "@/lib/validators/automations";

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "automations" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const id = getAutomationIdFromPath(request);
    const body = await parseJsonBody(testAutomationSchema, request);
    const result = await testAutomation(
      org.organizationId,
      id,
      org.clerkUserId,
      body,
    );
    return jsonOk(result);
  },
);
