import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getAutomationIdFromPath } from "@/lib/api/automation-route";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import {
  deleteAutomation,
  getAutomationTree,
  patchAutomation,
} from "@/lib/automations/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchAutomationSchema } from "@/lib/validators/automations";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "automations" },
  async ({ request }) => {
    const org = await requireCoachRead();
    const id = getAutomationIdFromPath(request);
    const automation = await getAutomationTree(org.organizationId, id);
    return jsonOk(automation);
  },
);

export const PATCH = withApiHandler(
  { requireOrg: true, requireFeature: "automations" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const id = getAutomationIdFromPath(request);
    const body = await parseJsonBody(patchAutomationSchema, request);
    const automation = await patchAutomation(org.organizationId, id, body);
    return jsonOk(automation);
  },
);

export const DELETE = withApiHandler(
  { requireOrg: true, requireFeature: "automations" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const id = getAutomationIdFromPath(request);
    await deleteAutomation(org.organizationId, id);
    return jsonOk({ deleted: true });
  },
);
