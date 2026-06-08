import { z } from "zod";
import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getAutomationIdFromPath } from "@/lib/api/automation-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { toggleAutomation } from "@/lib/automations/service";
import { parseJsonBody } from "@/lib/validators/clients";

const toggleSchema = z.object({
  isActive: z.boolean(),
});

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "automations" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const id = getAutomationIdFromPath(request);
    const body = await parseJsonBody(toggleSchema, request);
    const automation = await toggleAutomation(
      org.organizationId,
      id,
      body.isActive,
    );
    return jsonOk(automation);
  },
);
